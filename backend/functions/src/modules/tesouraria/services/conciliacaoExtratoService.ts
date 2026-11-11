/**
 * Serviço de conciliação automática de extratos bancários (InfinitePay) com bilhetes de rifas.
 *
 * @module conciliacaoExtratoService
 */
import * as admin from "firebase-admin";

import { Bilhete, PagamentoPix } from "../../types/models";
import { enviarEmailRecibo } from "../../rifas/emailService";
import {
  parsearExtratoBancario,
  LinhaExtratoBancario,
} from "../utils/extratoBancarioParser";
import { calcularSimilaridadeDice } from "../utils/stringSimilarityUtils";
import {
  ItemMatchConciliacao,
  ItemAprovacaoLoteInput,
  ResultadoAnaliseExtratoDTO,
  ResultadoAprovacaoLoteDTO,
} from "../types/conciliacaoExtratoTypes";

interface CandidatoPendencia {
  pagamentoId: string;
  referenceId?: string;
  pixOrderId?: string;
  endToEndId?: string;
  valorEsperado: number;
  compradorNome: string;
  compradorCpf?: string;
  compradorEmail?: string;
  vendedorId?: string;
  vendedorNome?: string;
  numerosRifas: string[];
  dataReserva: string;
  comprovanteUrl?: string | null;
}

export class ConciliacaoExtratoService {
  /**
   * Busca todas as compras e pagamentos pendentes no sistema para cruzamento com o extrato.
   *
   * @param {admin.firestore.Firestore} db - Instância do Firestore.
   * @returns {Promise<CandidatoPendencia[]>} Lista de pendências candidatas à conciliação.
   */
  private static async buscarPendenciasCandidatas(
    db: admin.firestore.Firestore,
  ): Promise<CandidatoPendencia[]> {
    const pendencias: CandidatoPendencia[] = [];
    const pagamentosProcessados = new Set<string>();

    // 1. Busca documentos em pagamentos_pix com status ativos de pagamento
    const snapsPix = await db
      .collection("pagamentos_pix")
      .where("status_pagamento_banco", "in", [
        "WAITING",
        "IN_ANALYSIS",
        "PENDING",
        "CRIANDO",
      ])
      .limit(1000)
      .get();

    snapsPix.forEach((doc) => {
      const data = doc.data() as PagamentoPix & Record<string, any>;
      if (data.status_validacao === "aceita") return;

      pagamentosProcessados.add(doc.id);
      const numeros = data.numeros_rifas || [];
      const valor = data.valor_bruto || numeros.length * 10;

      pendencias.push({
        pagamentoId: doc.id,
        referenceId: (data.reference_id || data.pix_order_id) ?? undefined,
        pixOrderId: (data.pix_order_id || data.reference_id) ?? undefined,
        endToEndId: data.end_to_end_id ?? undefined,
        valorEsperado: Number(valor.toFixed(2)),
        compradorNome: data.comprador_nome || "Comprador Desconhecido",
        compradorCpf: (data.comprador_documento || data.comprador_cpf) ?? undefined,
        compradorEmail: data.comprador_email ?? undefined,
        vendedorId: data.vendedor_id ?? undefined,
        vendedorNome: (data.vendedor_nome || "") ?? undefined,
        numerosRifas: numeros,
        dataReserva: data.criado_em || data.data_criacao || new Date().toISOString(),
        comprovanteUrl: data.comprovante_url ?? null,
      });
    });

    // 2. Busca bilhetes individuais com status 'pendente' ou 'reservado'
    const snapsBilhetes = await db
      .collection("bilhetes")
      .where("status", "in", ["pendente", "reservado"])
      .limit(2000)
      .get();

    const bilhetesAvulsos: Record<string, Bilhete & { numero: string }> = {};

    snapsBilhetes.forEach((doc) => {
      const data = doc.data() as Bilhete & Record<string, any>;
      const pagId = data.pagamento_id || (data.pix_order_id ? `pix-${data.pix_order_id}` : null);

      if (pagId && pagamentosProcessados.has(pagId)) {
        return; // Já capturado pelo pagamentos_pix
      }

      bilhetesAvulsos[doc.id] = { ...data, numero: doc.id };
    });

    // Agrupa bilhetes avulsos por comprovante_url ou comprador
    const gruposAvulsos: Record<string, Array<Bilhete & { numero: string }>> = {};
    Object.values(bilhetesAvulsos).forEach((bilhete) => {
      const chave =
        bilhete.comprovante_url
          ? `comp-${bilhete.comprovante_url}`
          : bilhete.comprador_id
            ? `comp-${bilhete.comprador_id}`
            : `avulso-${bilhete.numero}`;

      if (!gruposAvulsos[chave]) gruposAvulsos[chave] = [];
      gruposAvulsos[chave].push(bilhete);
    });

    Object.entries(gruposAvulsos).forEach(([chave, grupo]) => {
      const base = grupo[0] as Bilhete & { numero: string } & Record<string, any>;
      const numeros = grupo.map((b) => b.numero);
      const valor = grupo.reduce(
        (acc, b) => acc + (b.valor_pago || b.valor_bruto || 10),
        0,
      );

      pendencias.push({
        pagamentoId: chave,
        referenceId: (base.pix_order_id || base.pix_reference_id) ?? undefined,
        pixOrderId: base.pix_order_id ?? undefined,
        valorEsperado: Number(valor.toFixed(2)),
        compradorNome: base.comprador_nome || "Comprador Avulso",
        compradorEmail: base.comprador_email ?? undefined,
        vendedorId: base.vendedor_id ?? undefined,
        vendedorNome: base.vendedor_nome ?? "",
        numerosRifas: numeros,
        dataReserva: base.data_reserva || new Date().toISOString(),
        comprovanteUrl: base.comprovante_url ?? null,
      });
    });

    return pendencias;
  }

  /**
   * Analisa o extrato bancário submetido e cruza contra as pendências do sistema.
   *
   * @param {string} conteudoArquivo - Conteúdo textual do extrato CSV ou OFX.
   * @param {string} [nomeArquivo] - Nome do arquivo enviado.
   * @returns {Promise<ResultadoAnaliseExtratoDTO>} Relatório de matches e divergências.
   */
  static async analisarExtrato(
    conteudoArquivo: string,
    nomeArquivo?: string,
  ): Promise<ResultadoAnaliseExtratoDTO> {
    const db = admin.firestore();
    const linhasExtrato = parsearExtratoBancario(conteudoArquivo, nomeArquivo);
    const pendencias = await this.buscarPendenciasCandidatas(db);

    const matches: ItemMatchConciliacao[] = [];
    const extratoConsumidoIndices = new Set<number>();
    const pendenciasConsumidasIds = new Set<string>();

    // Pass 1: Match Exato por txid gravado no Pix EMV (100% Confiança)
    linhasExtrato.forEach((linha, index) => {
      if (!linha.txid) return;

      const txidLinha = linha.txid.toUpperCase();
      const pendencia = pendencias.find(
        (p) =>
          !pendenciasConsumidasIds.has(p.pagamentoId) &&
          ((p.referenceId && p.referenceId.toUpperCase() === txidLinha) ||
            (p.pixOrderId && p.pixOrderId.toUpperCase() === txidLinha)) &&
          Math.abs(p.valorEsperado - linha.valor) < 0.05,
      );

      if (pendencia) {
        matches.push({
          pagamentoId: pendencia.pagamentoId,
          tipoMatch: "TXID_EXATO",
          alvoMatch: "TXID",
          confianca: 1.0,
          compradorNome: pendencia.compradorNome,
          compradorCpf: pendencia.compradorCpf,
          compradorEmail: pendencia.compradorEmail,
          vendedorNome: pendencia.vendedorNome,
          vendedorId: pendencia.vendedorId,
          nomePagadorBanco: linha.nomePagador || "Identificado via txid",
          documentoPagadorBanco: linha.documentoPagador,
          valorEsperado: pendencia.valorEsperado,
          valorBanco: linha.valor,
          numerosRifas: pendencia.numerosRifas,
          txidEsperado: pendencia.referenceId || pendencia.pixOrderId,
          txidBanco: linha.txid,
          endToEndIdBanco: linha.endToEndId,
          dataBanco: linha.data,
          dataReserva: pendencia.dataReserva,
          comprovanteUrl: pendencia.comprovanteUrl,
        });

        extratoConsumidoIndices.add(index);
        pendenciasConsumidasIds.add(pendencia.pagamentoId);
      }
    });

    // Pass 2: Match Exato por EndToEndId (E2E)
    linhasExtrato.forEach((linha, index) => {
      if (extratoConsumidoIndices.has(index) || !linha.endToEndId) return;

      const e2eLinha = linha.endToEndId.toUpperCase();
      const pendencia = pendencias.find(
        (p) =>
          !pendenciasConsumidasIds.has(p.pagamentoId) &&
          p.endToEndId &&
          p.endToEndId.toUpperCase() === e2eLinha &&
          Math.abs(p.valorEsperado - linha.valor) < 0.05,
      );

      if (pendencia) {
        matches.push({
          pagamentoId: pendencia.pagamentoId,
          tipoMatch: "E2E_EXATO",
          alvoMatch: "E2E",
          confianca: 1.0,
          compradorNome: pendencia.compradorNome,
          compradorCpf: pendencia.compradorCpf,
          compradorEmail: pendencia.compradorEmail,
          vendedorNome: pendencia.vendedorNome,
          vendedorId: pendencia.vendedorId,
          nomePagadorBanco: linha.nomePagador || "Identificado via E2E",
          documentoPagadorBanco: linha.documentoPagador,
          valorEsperado: pendencia.valorEsperado,
          valorBanco: linha.valor,
          numerosRifas: pendencia.numerosRifas,
          txidEsperado: pendencia.referenceId || pendencia.pixOrderId,
          txidBanco: linha.txid,
          endToEndIdBanco: linha.endToEndId,
          dataBanco: linha.data,
          dataReserva: pendencia.dataReserva,
          comprovanteUrl: pendencia.comprovanteUrl,
        });

        extratoConsumidoIndices.add(index);
        pendenciasConsumidasIds.add(pendencia.pagamentoId);
      }
    });

    // Pass 3: Match Sugerido por Nome Similar + Valor Idêntico
    // Suporta tanto o pagador sendo o Comprador quanto sendo o Aderido (Vendedor)
    linhasExtrato.forEach((linha, index) => {
      if (extratoConsumidoIndices.has(index) || !linha.nomePagador) return;

      const nomeBanco = linha.nomePagador;

      // Filtra pendências não consumidas com valor idêntico
      const candidatasValor = pendencias.filter(
        (p) =>
          !pendenciasConsumidasIds.has(p.pagamentoId) &&
          Math.abs(p.valorEsperado - linha.valor) < 0.05,
      );

      let melhorPendencia: CandidatoPendencia | null = null;
      let melhorScore = 0;
      let melhorAlvo: "COMPRADOR" | "ADERIDO" = "COMPRADOR";

      for (const pendencia of candidatasValor) {
        // Similaridade com Comprador
        const scoreComprador = calcularSimilaridadeDice(
          nomeBanco,
          pendencia.compradorNome,
        );

        // Similaridade com Aderido (Vendedor)
        const scoreVendedor = pendencia.vendedorNome
          ? calcularSimilaridadeDice(nomeBanco, pendencia.vendedorNome)
          : 0;

        const maxScore = Math.max(scoreComprador, scoreVendedor);
        if (maxScore > melhorScore && maxScore >= 0.7) {
          melhorScore = maxScore;
          melhorPendencia = pendencia;
          melhorAlvo = scoreComprador >= scoreVendedor ? "COMPRADOR" : "ADERIDO";
        }
      }

      if (melhorPendencia) {
        matches.push({
          pagamentoId: melhorPendencia.pagamentoId,
          tipoMatch: "NOME_VALOR_APROXIMADO",
          alvoMatch: melhorAlvo,
          confianca: Number(melhorScore.toFixed(2)),
          compradorNome: melhorPendencia.compradorNome,
          compradorCpf: melhorPendencia.compradorCpf,
          compradorEmail: melhorPendencia.compradorEmail,
          vendedorNome: melhorPendencia.vendedorNome,
          vendedorId: melhorPendencia.vendedorId,
          nomePagadorBanco: linha.nomePagador,
          documentoPagadorBanco: linha.documentoPagador,
          valorEsperado: melhorPendencia.valorEsperado,
          valorBanco: linha.valor,
          numerosRifas: melhorPendencia.numerosRifas,
          txidEsperado: melhorPendencia.referenceId || melhorPendencia.pixOrderId,
          txidBanco: linha.txid,
          endToEndIdBanco: linha.endToEndId,
          dataBanco: linha.data,
          dataReserva: melhorPendencia.dataReserva,
          comprovanteUrl: melhorPendencia.comprovanteUrl,
        });

        extratoConsumidoIndices.add(index);
        pendenciasConsumidasIds.add(melhorPendencia.pagamentoId);
      }
    });

    const naoIdentificadosExtrato: LinhaExtratoBancario[] = linhasExtrato.filter(
      (_, index) => !extratoConsumidoIndices.has(index),
    );

    const totalMatchesExatos = matches.filter(
      (m) => m.tipoMatch === "TXID_EXATO" || m.tipoMatch === "E2E_EXATO",
    ).length;

    const totalMatchesAproximados = matches.filter(
      (m) => m.tipoMatch === "NOME_VALOR_APROXIMADO",
    ).length;

    const valorTotalMatches = Number(
      matches.reduce((acc, m) => acc + m.valorBanco, 0).toFixed(2),
    );

    return {
      resumo: {
        totalLinhasExtrato: linhasExtrato.length,
        totalPendenciasSistema: pendencias.length,
        totalMatchesExatos,
        totalMatchesAproximados,
        totalSemMatchExtrato: naoIdentificadosExtrato.length,
        totalSemMatchSistema: pendencias.length - pendenciasConsumidasIds.size,
        valorTotalMatches,
      },
      matches,
      naoIdentificadosExtrato,
    };
  }

  /**
   * Executa a aprovação atômica em lote de todas as transações conciliadas e selecionadas.
   *
   * @param {ItemAprovacaoLoteInput[]} itens - Itens aprovados pela tesouraria.
   * @param {string} uidTesouraria - UID do usuário que executou a aprovação.
   * @param {string} [emailTesouraria] - E-mail do usuário tesoureiro.
   * @returns {Promise<ResultadoAprovacaoLoteDTO>} Resultado do processamento do lote.
   * @transactional Todas as mutações nos bilhetes e pagamentos ocorrem em runTransaction.
   */
  static async aprovarLoteConciliacao(
    itens: ItemAprovacaoLoteInput[],
    uidTesouraria: string,
    emailTesouraria?: string,
  ): Promise<ResultadoAprovacaoLoteDTO> {
    if (!itens || itens.length === 0) {
      return {
        sucesso: true,
        aprovadosCount: 0,
        totalRifasAprovadas: 0,
        valorTotalAprovado: 0,
        falhasCount: 0,
        mensagem: "Nenhum item selecionado para aprovação.",
      };
    }

    const db = admin.firestore();
    const agora = new Date().toISOString();
    const validadorIdentificacao = emailTesouraria || uidTesouraria;

    let totalRifasAprovadas = 0;
    let valorTotalAprovado = 0;
    let aprovadosCount = 0;
    let falhasCount = 0;

    const emailsParaEnviar: Array<{
      email: string;
      nome: string;
      rifas: string[];
    }> = [];

    // Processa os itens em lotes para respeitar o limite operacional do Firestore
    const CHUNK_SIZE = 40;
    for (let i = 0; i < itens.length; i += CHUNK_SIZE) {
      const chunk = itens.slice(i, i + CHUNK_SIZE);

      await db.runTransaction(async (transaction) => {
        for (const item of chunk) {
          try {
            let numerosRifas: string[] = [];
            let compradorEmail: string | undefined;
            let compradorNome: string = "Comprador";

            // 1. Tenta carregar do pagamentos_pix
            const pagRef = db.collection("pagamentos_pix").doc(item.pagamentoId);
            const pagSnap = await transaction.get(pagRef);

            if (pagSnap.exists) {
              const pagData = pagSnap.data() as PagamentoPix & Record<string, any>;
              if (pagData.status_validacao === "aceita") {
                // Já estava validado previamente
                continue;
              }

              numerosRifas = pagData.numeros_rifas || [];
              compradorEmail = pagData.comprador_email ?? undefined;
              compradorNome = pagData.comprador_nome || compradorNome;

              transaction.set(
                pagRef,
                {
                  status_validacao: "aceita",
                  status_pagamento_banco: "PAID",
                  validado_em: agora,
                  validado_por: validadorIdentificacao,
                  dados_conciliacao: {
                    ...item,
                    dataAprovacao: agora,
                  },
                },
                { merge: true },
              );
            } else {
              // 2. Se for avulso/por comprovante ou bilhetes manuais
              // Busca os bilhetes correspondentes
              const bilhetesQuery = await transaction.get(
                db
                  .collection("bilhetes")
                  .where("status", "in", ["pendente", "reservado"])
                  .limit(100),
              );

              const bilhetesDoItem = bilhetesQuery.docs.filter((d) => {
                const b = d.data() as Bilhete;
                if (item.pagamentoId.startsWith("comp-") && b.comprovante_url) {
                  return item.pagamentoId === `comp-${b.comprovante_url}`;
                }
                if (item.pagamentoId.startsWith("avulso-")) {
                  return item.pagamentoId === `avulso-${d.id}`;
                }
                return false;
              });

              numerosRifas = bilhetesDoItem.map((d) => d.id);
              if (bilhetesDoItem.length > 0) {
                const bBase = bilhetesDoItem[0].data() as Bilhete;
                compradorEmail = bBase.comprador_email ?? undefined;
                compradorNome = bBase.comprador_nome || compradorNome;
              }
            }

            if (numerosRifas.length === 0) {
              falhasCount++;
              continue;
            }

            // Atualiza cada bilhete dentro da transação
            const rifasRefs = numerosRifas.map((num) =>
              db.collection("bilhetes").doc(num),
            );
            const rifasSnaps = await Promise.all(
              rifasRefs.map((r) => transaction.get(r)),
            );

            for (const rSnap of rifasSnaps) {
              if (rSnap.exists) {
                transaction.set(
                  rSnap.ref,
                  {
                    status: "pago",
                    status_validacao: "aceita",
                    validado_em: agora,
                    validado_por: validadorIdentificacao,
                    data_pagamento: item.dataBanco || agora,
                    dados_conciliacao: {
                      ...item,
                      dataAprovacao: agora,
                    },
                  },
                  { merge: true },
                );
              }
            }

            aprovadosCount++;
            totalRifasAprovadas += numerosRifas.length;
            valorTotalAprovado += item.valorBanco;

            if (compradorEmail) {
              emailsParaEnviar.push({
                email: compradorEmail,
                nome: compradorNome,
                rifas: numerosRifas,
              });
            }
          } catch (err) {
            console.error(
              `[ConciliacaoExtrato] Erro ao aprovar item ${item.pagamentoId}:`,
              err,
            );
            falhasCount++;
          }
        }
      });
    }

    // Disparo assíncrono de e-mails em background fora da transação
    emailsParaEnviar.forEach(({ email, nome, rifas }) => {
      enviarEmailRecibo(email, nome, rifas, "aprovado").catch((err) => {
        console.warn(
          `[ConciliacaoExtrato] Falha ao enviar e-mail para ${email}:`,
          err,
        );
      });
    });

    return {
      sucesso: true,
      aprovadosCount,
      totalRifasAprovadas,
      valorTotalAprovado: Number(valorTotalAprovado.toFixed(2)),
      falhasCount,
      mensagem: `${aprovadosCount} venda(s) aprovada(s) com sucesso via conciliação (${totalRifasAprovadas} rifas)!`,
    };
  }
}
