// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/repositories/conciliacaoExtratoRepository.ts
// ============================================================================

import * as admin from "firebase-admin";

import { Bilhete, PagamentoPix } from "../../types/models";
import { CandidatoPendencia } from "../helpers/conciliacaoExtratoMatcherHelper";
import { ItemAprovacaoLoteInput } from "../types/conciliacaoExtratoTypes";

interface OperacaoItemAprovacao {
  item: ItemAprovacaoLoteInput;
  pagRef: admin.firestore.DocumentReference | null;
  numerosRifas: string[];
  rifasSnaps: admin.firestore.DocumentSnapshot[];
  compradorEmail?: string;
  compradorNome: string;
}

export interface ResultadoChunkConciliacao {
  aprovadosCount: number;
  totalRifasAprovadas: number;
  valorTotalAprovado: number;
  falhasCount: number;
  emailsParaEnviar: Array<{
    email: string;
    nome: string;
    rifas: string[];
  }>;
}

/**
 * Repositório Firestore dedicado às consultas de pendências candidatas e
 * aprovação transacional em lote na conciliação bancária.
 */
export class ConciliacaoExtratoRepository {
  /**
   * Busca todas as compras e pagamentos pendentes no sistema para cruzamento com o extrato.
   *
   * @param {admin.firestore.Firestore} [dbOverride] - Instância opcional do Firestore.
   * @returns {Promise<CandidatoPendencia[]>} Lista de pendências candidatas à conciliação.
   */
  static async buscarPendenciasCandidatas(
    dbOverride?: admin.firestore.Firestore,
  ): Promise<CandidatoPendencia[]> {
    const db = dbOverride || admin.firestore();
    const pendencias: CandidatoPendencia[] = [];
    const pagamentosProcessados = new Set<string>();

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
      pagamentosProcessados.add(`pix-${doc.id}`);
      if (data.pix_order_id) {
        pagamentosProcessados.add(String(data.pix_order_id));
        pagamentosProcessados.add(`pix-${data.pix_order_id}`);
      }
      if (data.reference_id) {
        pagamentosProcessados.add(String(data.reference_id));
        pagamentosProcessados.add(`pix-${data.reference_id}`);
      }

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

    const snapsBilhetes = await db
      .collection("bilhetes")
      .where("status", "in", ["pendente", "reservado"])
      .limit(2000)
      .get();

    const gruposAvulsos: Record<string, Array<Bilhete & { numero: string }>> = {};

    snapsBilhetes.forEach((doc) => {
      const data = doc.data() as Bilhete & Record<string, any>;
      const orderIdStr = data.pix_order_id ? String(data.pix_order_id) : null;
      const refIdStr = data.pix_reference_id ? String(data.pix_reference_id) : null;
      const pagIdStr = data.pagamento_id ? String(data.pagamento_id) : null;

      const jaProcessado =
        (pagIdStr && pagamentosProcessados.has(pagIdStr)) ||
        (orderIdStr && (pagamentosProcessados.has(orderIdStr) || pagamentosProcessados.has(`pix-${orderIdStr}`))) ||
        (refIdStr && (pagamentosProcessados.has(refIdStr) || pagamentosProcessados.has(`pix-${refIdStr}`)));

      if (jaProcessado) return;

      const bilhete = { ...data, numero: doc.id };
      const chave = bilhete.comprovante_url
        ? `comp-${bilhete.comprovante_url}`
        : bilhete.comprador_id
          ? `comp-${bilhete.comprador_id}`
          : `avulso-${bilhete.numero}`;

      if (!gruposAvulsos[chave]) gruposAvulsos[chave] = [];
      gruposAvulsos[chave].push(bilhete);
    });

    Object.entries(gruposAvulsos).forEach(([chave, grupo]) => {
      const base = grupo[0] as Bilhete & { numero: string } & Record<string, any>;
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
        numerosRifas: grupo.map((b) => b.numero),
        dataReserva: base.data_reserva || new Date().toISOString(),
        comprovanteUrl: base.comprovante_url ?? null,
      });
    });

    return pendencias;
  }

  /**
   * Executa uma transação ACID para um lote de até 40 itens conciliados,
   * executando todas as leituras antes das escritas para evitar TOCTOU.
   *
   * @param {ItemAprovacaoLoteInput[]} chunk - Subconjunto de itens selecionados.
   * @param {string} validadorIdentificacao - Identificação (e-mail ou UID) do tesoureiro.
   * @param {string} agora - Timestamp ISO da validação.
   * @returns {Promise<ResultadoChunkConciliacao>} Contadores e e-mails pendentes do chunk.
   * @transactional Executa leituras e escritas em `db.runTransaction`.
   */
  static async aprovarChunkConciliacao(
    chunk: ItemAprovacaoLoteInput[],
    validadorIdentificacao: string,
    agora: string,
  ): Promise<ResultadoChunkConciliacao> {
    const db = admin.firestore();
    let aprovadosCount = 0;
    let totalRifasAprovadas = 0;
    let valorTotalAprovado = 0;
    let falhasCount = 0;
    const emailsParaEnviar: ResultadoChunkConciliacao["emailsParaEnviar"] = [];

    await db.runTransaction(async (transaction) => {
      const operacoes: OperacaoItemAprovacao[] = [];

      // FASE 1: TODAS AS LEITURAS PRIMEIRO (ACID Firestore Rule)
      for (const item of chunk) {
        const leitura = await this.lerOperacaoItemNaTransacao(transaction, db, item);
        if (leitura === "ignorar") continue;
        if (leitura === "falha") {
          falhasCount++;
          continue;
        }
        operacoes.push(leitura);
      }

      const motivoRecusaClear = admin.firestore?.FieldValue?.delete
        ? admin.firestore.FieldValue.delete()
        : null;

      // FASE 2: TODAS AS ESCRITAS DEPOIS
      for (const op of operacoes) {
        try {
          this.escreverOperacaoItemNaTransacao(
            transaction,
            op,
            validadorIdentificacao,
            agora,
            motivoRecusaClear,
          );

          aprovadosCount++;
          totalRifasAprovadas += op.numerosRifas.length;
          valorTotalAprovado += op.item.valorBanco;

          if (op.compradorEmail) {
            emailsParaEnviar.push({
              email: op.compradorEmail,
              nome: op.compradorNome,
              rifas: op.numerosRifas,
            });
          }
        } catch (err) {
          console.error(`[ConciliacaoExtrato] Erro ao aprovar item ${op.item.pagamentoId}:`, err);
          falhasCount++;
        }
      }
    });

    return {
      aprovadosCount,
      totalRifasAprovadas,
      valorTotalAprovado,
      falhasCount,
      emailsParaEnviar,
    };
  }

  /**
   * Lê na transação os documentos de pagamento e bilhetes de um item de conciliação.
   */
  private static async lerOperacaoItemNaTransacao(
    transaction: FirebaseFirestore.Transaction,
    db: admin.firestore.Firestore,
    item: ItemAprovacaoLoteInput,
  ): Promise<OperacaoItemAprovacao | "ignorar" | "falha"> {
    try {
      let numerosRifas: string[] = [];
      let compradorEmail: string | undefined;
      let compradorNome = "Comprador";
      let pagRef: admin.firestore.DocumentReference | null = null;

      const docRef = db.collection("pagamentos_pix").doc(item.pagamentoId);
      const pagSnap = await transaction.get(docRef);

      if (pagSnap.exists) {
        const pagData = pagSnap.data() as PagamentoPix & Record<string, any>;
        if (pagData.status_validacao === "aceita") return "ignorar";

        pagRef = docRef;
        numerosRifas = pagData.numeros_rifas || [];
        compradorEmail = pagData.comprador_email ?? undefined;
        compradorNome = pagData.comprador_nome || compradorNome;
      } else {
        const resolvido = await this.resolverBilhetesAvulsosNaTransacao(
          transaction,
          db,
          item.pagamentoId,
        );
        numerosRifas = resolvido.numerosRifas;
        compradorEmail = resolvido.compradorEmail;
        compradorNome = resolvido.compradorNome;
      }

      if (numerosRifas.length === 0) return "falha";

      const rifasSnaps = await Promise.all(
        numerosRifas.map((num) => transaction.get(db.collection("bilhetes").doc(num))),
      );

      return {
        item,
        pagRef,
        numerosRifas,
        rifasSnaps,
        compradorEmail,
        compradorNome,
      };
    } catch (err) {
      console.error(`[ConciliacaoExtrato] Erro ao ler item ${item.pagamentoId}:`, err);
      return "falha";
    }
  }

  /**
   * Resolve diretamente os números de rifa e comprador de um item avulso ou por comprovante.
   */
  private static async resolverBilhetesAvulsosNaTransacao(
    transaction: FirebaseFirestore.Transaction,
    db: admin.firestore.Firestore,
    pagamentoId: string,
  ): Promise<{
    numerosRifas: string[];
    compradorEmail?: string;
    compradorNome: string;
  }> {
    let docsEncontrados: admin.firestore.DocumentSnapshot[] = [];

    if (pagamentoId.startsWith("avulso-")) {
      const numero = pagamentoId.slice("avulso-".length);
      if (numero) {
        const snap = await transaction.get(db.collection("bilhetes").doc(numero));
        if (snap.exists) {
          const data = snap.data() as Bilhete;
          if (data.status === "pendente" || data.status === "reservado") {
            docsEncontrados = [snap];
          }
        }
      }
    } else if (pagamentoId.startsWith("comp-")) {
      const sufixo = pagamentoId.slice("comp-".length);
      if (sufixo) {
        const campoPrincipal = /^https?:\/\//i.test(sufixo) ? "comprovante_url" : "comprador_id";
        let querySnap = await transaction.get(
          db.collection("bilhetes").where(campoPrincipal, "==", sufixo),
        );
        if (querySnap.empty && campoPrincipal === "comprador_id") {
          querySnap = await transaction.get(
            db.collection("bilhetes").where("comprovante_url", "==", sufixo),
          );
        }
        docsEncontrados = querySnap.docs.filter((doc) => {
          const b = doc.data() as Bilhete;
          return b.status === "pendente" || b.status === "reservado";
        });
      }
    }

    if (docsEncontrados.length === 0) {
      return { numerosRifas: [], compradorNome: "Comprador" };
    }

    const base = docsEncontrados[0].data() as Bilhete;
    return {
      numerosRifas: docsEncontrados.map((d) => d.id),
      compradorEmail: base.comprador_email ?? undefined,
      compradorNome: base.comprador_nome || "Comprador",
    };
  }

  /**
   * Persiste na transação o aceite do pagamento pai e dos bilhetes vinculados.
   */
  private static escreverOperacaoItemNaTransacao(
    transaction: FirebaseFirestore.Transaction,
    op: OperacaoItemAprovacao,
    validadorIdentificacao: string,
    agora: string,
    motivoRecusaClear: unknown,
  ): void {
    if (op.pagRef) {
      transaction.set(
        op.pagRef,
        {
          status_validacao: "aceita",
          status_pagamento_banco: "PAID",
          validado_em: agora,
          validado_por: validadorIdentificacao,
          dados_conciliacao: {
            ...op.item,
            dataAprovacao: agora,
          },
        },
        { merge: true },
      );
    }

    const resumoConciliacaoBilhete = {
      pagamentoId: op.item.pagamentoId,
      tipoMatch: op.item.tipoMatch,
      valorBanco: op.item.valorBanco,
      ...(op.item.txidBanco ? { txidBanco: op.item.txidBanco } : {}),
      dataAprovacao: agora,
    };

    for (const rSnap of op.rifasSnaps) {
      if (!rSnap.exists) continue;
      const rData = rSnap.data() as Bilhete | undefined;

      transaction.set(
        rSnap.ref,
        {
          status: "pago",
          status_pagamento_banco: "PAID",
          status_validacao: "aceita",
          valor_pago: Number(rData?.valor_bruto || 10),
          motivo_recusa: motivoRecusaClear,
          validado_em: agora,
          validado_por: validadorIdentificacao,
          data_pagamento: op.item.dataBanco || agora,
          dados_conciliacao: resumoConciliacaoBilhete,
        },
        { merge: true },
      );
    }
  }
}
