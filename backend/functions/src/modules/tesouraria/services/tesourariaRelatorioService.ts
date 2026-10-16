import * as admin from "firebase-admin";

import {
  obterSuperAdmins,
  CARGOS_TESOURARIA_OU_ADMIN,
  CARGOS_SECRETARIA_OU_ADMIN,
} from "../../../shared/middlewares/authMiddleware";
import { Bilhete, Usuario } from "../../types/models";
import {
  AderidoRelatorioTesouraria,
  BilheteComNumero,
  DadosAtualizacaoCompradorCompra,
  OrigemTransacaoTesouraria,
  RelatorioTesourariaResponse,
  TransacaoTesouraria,
} from "../types/tesourariaTypes";
import { chaveCompra, valorDataSeguro } from "../helpers/pixTransacoesHelper";
import {
  cpfEhValido,
  criarMapaVendedores,
  ehUsuarioAderidoRelatorio,
  extrairDocsSnapshot,
  formatarCpfVendedor,
  MapaVendedores,
  resolverVendedorDoBilhete,
} from "../helpers/vendedorLookupHelper";

const VALOR_RIFA = 10;

interface AcumuladorVendasAderido {
  rifasPagasPix: number;
  rifasPagasComprovante: number;
  valorBrutoPix: number;
  valorBrutoComprovante: number;
  rifasPendentes: number;
}

export class TesourariaRelatorioService {
  /**
   * Gera o relatório financeiro consolidado da Tesouraria e de Desempenho.
   * Vincula bilhetes aos aderidos de forma resiliente (via `vendedor_id` e fallback de `vendedor_cpf` normalizado)
   * e inclui todos os formandos aderidos (inclusive aqueles com cargo na comissão), separando métricas
   * de Pix automatizado e comprovantes manuais.
   *
   * @returns {Promise<RelatorioTesourariaResponse>} Resumo geral e lista de desempenho por aderido.
   */
  static async obterRelatorioTesouraria(): Promise<RelatorioTesourariaResponse> {
    const db = admin.firestore();
    const superAdmins = obterSuperAdmins();
    const cargosAdmin = new Set([
      ...CARGOS_TESOURARIA_OU_ADMIN,
      ...CARGOS_SECRETARIA_OU_ADMIN,
    ]);

    const [usuariosSnap, bilhetesSnap] = await Promise.all([
      db.collection("usuarios").get(),
      db
        .collection("bilhetes")
        .where("status", "in", ["pago", "pendente", "reservado"])
        .get(),
    ]);

    const usuariosDocs = extrairDocsSnapshot<Partial<Usuario>>(usuariosSnap);
    const bilhetesDocs = extrairDocsSnapshot<Bilhete>(bilhetesSnap);
    const mapaVendedores = criarMapaVendedores(usuariosDocs);

    const vendasPorDocId = new Map<string, AcumuladorVendasAderido>();
    const obterAcumulador = (docId: string): AcumuladorVendasAderido => {
      const atual = vendasPorDocId.get(docId);
      if (atual) return atual;
      const novo: AcumuladorVendasAderido = {
        rifasPagasPix: 0,
        rifasPagasComprovante: 0,
        valorBrutoPix: 0,
        valorBrutoComprovante: 0,
        rifasPendentes: 0,
      };
      vendasPorDocId.set(docId, novo);
      return novo;
    };

    let rifasPagasPixGlobal = 0;
    let rifasPagasComprovanteGlobal = 0;
    let valorPixBrutoGlobal = 0;
    let valorComprovanteGlobal = 0;
    let rifasPendentesPixGlobal = 0;
    let rifasPendentesComprovanteGlobal = 0;

    bilhetesDocs.forEach((doc) => {
      const data = doc.data() as Bilhete;
      const status = data.status || "pago";
      const ehPix = Boolean(data.pix_order_id);
      const valorBilhete = data.valor_pago || data.valor_bruto || VALOR_RIFA;
      const vendedor = resolverVendedorDoBilhete(data, mapaVendedores);

      if (status === "pago") {
        if (ehPix) {
          rifasPagasPixGlobal += 1;
          valorPixBrutoGlobal += valorBilhete;
        } else {
          rifasPagasComprovanteGlobal += 1;
          valorComprovanteGlobal += valorBilhete;
        }

        if (vendedor) {
          const acc = obterAcumulador(vendedor.docId);
          if (ehPix) {
            acc.rifasPagasPix += 1;
            acc.valorBrutoPix += valorBilhete;
          } else {
            acc.rifasPagasComprovante += 1;
            acc.valorBrutoComprovante += valorBilhete;
          }
        }
      } else if (status === "pendente" || status === "reservado") {
        if (ehPix) {
          rifasPendentesPixGlobal += 1;
        } else {
          rifasPendentesComprovanteGlobal += 1;
        }

        if (vendedor) {
          const acc = obterAcumulador(vendedor.docId);
          acc.rifasPendentes += 1;
        }
      }
    });

    const aderidos: AderidoRelatorioTesouraria[] = usuariosDocs
      .filter((doc) => {
        const usuario = (doc.data() || {}) as Partial<Usuario>;
        const acc = vendasPorDocId.get(doc.id);
        const possuiVendasVinculadas = Boolean(
          acc &&
            (acc.rifasPagasPix > 0 ||
              acc.rifasPagasComprovante > 0 ||
              acc.rifasPendentes > 0),
        );

        return ehUsuarioAderidoRelatorio({
          docId: doc.id,
          usuario,
          superAdmins,
          cargosAdmin,
          possuiVendasVinculadas,
        });
      })
      .map((doc) => {
        const vendedor = mapaVendedores.porId.get(doc.id);
        const acc = vendasPorDocId.get(doc.id) || {
          rifasPagasPix: 0,
          rifasPagasComprovante: 0,
          valorBrutoPix: 0,
          valorBrutoComprovante: 0,
          rifasPendentes: 0,
        };

        const rifasVendidas = acc.rifasPagasPix + acc.rifasPagasComprovante;
        const arrecadado = acc.valorBrutoPix + acc.valorBrutoComprovante;
        const arrecadadoLiquido = Number(
          (acc.valorBrutoPix * 0.99 + acc.valorBrutoComprovante).toFixed(2),
        );

        return {
          id: doc.id,
          nome: vendedor?.nome || "Aderido Sem Nome",
          cpf: vendedor?.cpf || "-",
          ...(vendedor?.curso ? { curso: vendedor.curso } : {}),
          ...(vendedor?.modalidadeAdesao
            ? { modalidadeAdesao: vendedor.modalidadeAdesao }
            : {}),
          ...(vendedor?.cargo ? { cargo: vendedor.cargo } : {}),
          arrecadado,
          arrecadadoLiquido,
          meta: vendedor?.metaVendas || 1200,
          rifasVendidas,
          rifasVendidasPix: acc.rifasPagasPix,
          rifasVendidasComprovante: acc.rifasPagasComprovante,
          rifasPendentes: acc.rifasPendentes,
        };
      });

    const totalArrecadadoGlobal = valorPixBrutoGlobal + valorComprovanteGlobal;
    const valorArrecadadoPixLiquido = Number((valorPixBrutoGlobal * 0.99).toFixed(2));
    const totalArrecadadoLiquido = Number(
      (valorArrecadadoPixLiquido + valorComprovanteGlobal).toFixed(2),
    );
    const rifasPagasGlobal = rifasPagasPixGlobal + rifasPagasComprovanteGlobal;
    const rifasPendentesGlobal =
      rifasPendentesPixGlobal + rifasPendentesComprovanteGlobal;

    return {
      resumoGeral: {
        totalArrecadado: totalArrecadadoGlobal,
        totalArrecadadoLiquido,
        rifasPagas: rifasPagasGlobal,
        rifasPagasPix: rifasPagasPixGlobal,
        rifasPagasComprovante: rifasPagasComprovanteGlobal,
        valorArrecadadoPixBruto: valorPixBrutoGlobal,
        valorArrecadadoPixLiquido,
        valorArrecadadoComprovante: valorComprovanteGlobal,
        rifasPendentes: rifasPendentesGlobal,
        rifasPendentesPix: rifasPendentesPixGlobal,
        rifasPendentesComprovante: rifasPendentesComprovanteGlobal,
        aderidosAtivos: aderidos.length,
      },
      aderidos,
    };
  }

  /**
   * Obtém o histórico detalhado e unificado de todas as compras (Pix e Comprovantes),
   * agrupando bilhetes da mesma negociação, saneando datas ausentes e enriquecendo dados do vendedor.
   *
   * @returns {Promise<TransacaoTesouraria[]>} Lista de compras ordenada pela data mais recente.
   */
  static async obterHistoricoDetalhado(): Promise<TransacaoTesouraria[]> {
    const db = admin.firestore();

    const bilhetesSnap = await db
      .collection("bilhetes")
      .where("status", "in", ["pago", "pendente", "reservado", "recusado"])
      .limit(5000)
      .get();

    const bilhetesDocs = extrairDocsSnapshot<Bilhete>(bilhetesSnap);

    let precisaEnriquecerVendedor = false;
    bilhetesDocs.forEach((doc) => {
      const data = doc.data() as Bilhete;
      if (data.vendedor_id && (!cpfEhValido(data.vendedor_cpf) || !data.vendedor_nome)) {
        precisaEnriquecerVendedor = true;
      }
    });

    let mapaVendedores: MapaVendedores | null = null;
    if (precisaEnriquecerVendedor) {
      const usuariosSnap = await db.collection("usuarios").get();
      const usuariosDocs = extrairDocsSnapshot<Partial<Usuario>>(usuariosSnap);
      if (usuariosDocs.length > 0) {
        mapaVendedores = criarMapaVendedores(usuariosDocs);
      }
    }

    const agrupado: Record<string, TransacaoTesouraria> = {};

    bilhetesDocs.forEach((doc) => {
      const data = doc.data() as Bilhete;
      const numero = doc.id;

      const bilheteComNumero: BilheteComNumero = {
        ...data,
        numero,
      };

      const chave = chaveCompra(bilheteComNumero);
      const vendedorResolvido = resolverVendedorDoBilhete(data, mapaVendedores);
      const vendedorNome =
        vendedorResolvido?.nome || data.vendedor_nome || "Desconhecido";
      const vendedorCpf = formatarCpfVendedor(data.vendedor_cpf, vendedorResolvido);
      const dataReserva = data.data_reserva || data.data_pagamento || null;
      const dataPagamento =
        data.data_pagamento || (data.status === "pago" ? data.data_reserva || null : null);
      const valorBilhete = data.valor_pago || data.valor_bruto || VALOR_RIFA;
      const origem: OrigemTransacaoTesouraria = data.pix_order_id
        ? "PIX"
        : "COMPROVANTE";

      if (!agrupado[chave]) {
        agrupado[chave] = {
          id: chave,
          dataReserva,
          dataPagamento,
          vendedorId: vendedorResolvido?.docId || data.vendedor_id,
          vendedorNome,
          vendedorCpf,
          compradorId: data.comprador_id || null,
          compradorNome: data.comprador_nome || "Desconhecido",
          compradorEmail: data.comprador_email || "",
          compradorTelefone: data.comprador_telefone || "",
          status: data.status,
          comprovanteUrl: data.comprovante_url || null,
          bilhetes: [numero],
          valorTotal: valorBilhete,
          origem,
          pixOrderId: data.pix_order_id || null,
          statusPagamentoBanco: data.status_pagamento_banco || null,
          statusValidacao: data.status_validacao || null,
          correcaoPendente: Boolean(data.correcao_pendente),
        };
      } else {
        if (!agrupado[chave].bilhetes.includes(numero)) {
          agrupado[chave].bilhetes.push(numero);
          agrupado[chave].valorTotal += valorBilhete;
        }
        agrupado[chave].comprovanteUrl =
          agrupado[chave].comprovanteUrl || data.comprovante_url || null;
        agrupado[chave].dataReserva =
          agrupado[chave].dataReserva || dataReserva;
        agrupado[chave].dataPagamento =
          agrupado[chave].dataPagamento || dataPagamento;
        if (data.correcao_pendente) {
          agrupado[chave].correcaoPendente = true;
        }
      }
    });

    const historico = Object.values(agrupado).map((transacao) => {
      transacao.bilhetes.sort((a, b) =>
        a.localeCompare(b, "pt-BR", { numeric: true }),
      );
      transacao.valorLiquido =
        transacao.origem === "PIX"
          ? Number((transacao.valorTotal * 0.99).toFixed(2))
          : transacao.valorTotal;

      return transacao;
    });

    historico.sort((a, b) => {
      const dataA = valorDataSeguro(a.dataReserva || a.dataPagamento);
      const dataB = valorDataSeguro(b.dataReserva || b.dataPagamento);

      return dataB - dataA;
    });

    return historico;
  }


  static async atualizarCompradorCompra(
    compradorId: string,
    dados: DadosAtualizacaoCompradorCompra,
  ) {
    const db = admin.firestore();
    const bilhetesSnap = await db
      .collection("bilhetes")
      .where("comprador_id", "==", compradorId)
      .get();

    if (bilhetesSnap.empty) {
      throw new Error("COMPRA_NAO_ENCONTRADA");
    }

    const bilheteAtualizado = {
      comprador_nome: dados.nome,
      comprador_email: dados.email || null,
      comprador_telefone: dados.telefone || null,
    };

    const compradorDocAtualizado = {
      nome: dados.nome,
      email: dados.email || null,
      telefone: dados.telefone || null,
    };

    const batch = db.batch();

    bilhetesSnap.docs.forEach((doc) => {
      batch.update(doc.ref, bilheteAtualizado);
    });

    const compradorRef = db.collection("compradores").doc(compradorId);
    const compradorSnap = await compradorRef.get();

    if (compradorSnap.exists) {
      batch.update(compradorRef, compradorDocAtualizado);
    }

    await batch.commit();

    return {
      comprador_id: compradorId,
      ...compradorDocAtualizado,
      rifasAtualizadas: bilhetesSnap.size,
      compradorDocumentoAtualizado: compradorSnap.exists,
    };
  }
}
