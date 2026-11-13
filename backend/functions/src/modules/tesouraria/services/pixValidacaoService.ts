// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/services/pixValidacaoService.ts
// ============================================================================
import * as admin from "firebase-admin";

import { enviarEmailRecibo } from "../../rifas/emailService";
import { ComprasManuaisService } from "./comprasManuaisService";
import {
  bilhetePertenceAoPagamento,
  ehChaveManual,
  montarNotificacaoCorrecaoDados,
  montarPayloadBilheteAprovado,
  montarPayloadBilheteRecusado,
} from "../helpers/validacaoCompraHelper";
import {
  ItemLoteValidacaoTransacao,
  ResultadoLoteValidacaoTransacoes,
} from "../types/tesourariaTypes";

interface ValidarPixParams {
  transacaoId: string;
  chaveAcao?: string;
  uidTesouraria: string;
  emailTesouraria?: string;
  motivo?: string;
}

export interface ResultadoAceitePix {
  sucesso: boolean;
  statusValidacao: "aceita";
  transacaoId: string;
  rifas: string[];
  emailEnviado?: boolean;
}

export interface ResultadoNegacaoPix {
  sucesso: boolean;
  statusValidacao: "negada";
  transacaoId: string;
  rifas: string[];
  motivo?: string;
}

type AcaoValidacaoPix = "aceita" | "negada";

interface ResultadoInternoDecisaoPix {
  numerosRifas: string[];
  compradorEmail: string | null;
  compradorNome: string;
}

export class PixValidacaoService {
  /**
   * Valida e aprova uma transação Pix (ou encaminha chaves manuais para `ComprasManuaisService`),
   * atualizando `pagamentos_pix` e todos os `bilhetes` vinculados em transação ACID.
   *
   * @param {ValidarPixParams} params - Identificadores da transação e do avaliador na Tesouraria.
   * @returns {Promise<ResultadoAceitePix>} Resultado da aprovação com lista de rifas liberadas.
   * @throws {Error} `"TRANSACAO_SEM_REFERENCIA"`, `"PAGAMENTO_NOT_FOUND"`, `"PIX_ALREADY_VALIDATED"`, `"TRANSACAO_SEM_RIFAS"`, `"UM_OU_MAIS_BILHETES_NAO_ENCONTRADOS"` ou `"TODOS_BILHETES_PERDIDOS"`.
   * @transactional Opera leituras e escritas em `db.runTransaction`.
   * @sideEffects Envia recibo por e-mail ao comprador via `enviarEmailRecibo`.
   */
  static async aceitarTransacao(params: ValidarPixParams): Promise<ResultadoAceitePix> {
    const chaveEfetiva = String(params.chaveAcao || params.transacaoId || "").trim();

    if (ehChaveManual(chaveEfetiva)) {
      const resultadoManual = await ComprasManuaisService.aceitarCompra({
        chave: chaveEfetiva,
        uidTesouraria: params.uidTesouraria,
        emailTesouraria: params.emailTesouraria,
      });

      return {
        sucesso: true,
        statusValidacao: "aceita",
        transacaoId: params.transacaoId,
        rifas: resultadoManual.rifas,
        emailEnviado: resultadoManual.emailEnviado,
      };
    }

    const resultado = await this.executarDecisaoTransacao({
      acao: "aceita",
      chaveEfetiva,
      uidTesouraria: params.uidTesouraria,
      emailTesouraria: params.emailTesouraria,
    });

    const emailEnviado = resultado.compradorEmail
      ? await enviarEmailRecibo(
          resultado.compradorEmail,
          resultado.compradorNome,
          resultado.numerosRifas,
          "aprovado",
        )
      : false;

    return {
      sucesso: true,
      statusValidacao: "aceita",
      transacaoId: params.transacaoId,
      rifas: resultado.numerosRifas,
      emailEnviado,
    };
  }

  /**
   * Recusa uma transação Pix (ou encaminha chaves manuais para `ComprasManuaisService`),
   * marcando os bilhetes como `"recusado"` e notificando o aderido para correção.
   *
   * @param {ValidarPixParams} params - Identificadores da transação, motivo obrigatório e avaliador.
   * @returns {Promise<ResultadoNegacaoPix>} Resultado da recusa com rifas afetadas.
   * @throws {Error} `"MOTIVO_REQUIRED"`, `"TRANSACAO_SEM_REFERENCIA"`, `"PAGAMENTO_NOT_FOUND"`, `"PIX_ALREADY_VALIDATED"`, `"TRANSACAO_SEM_RIFAS"`, `"UM_OU_MAIS_BILHETES_NAO_ENCONTRADOS"` ou `"TODOS_BILHETES_PERDIDOS"`.
   * @transactional Opera leituras, recusas e criação de notificações em `db.runTransaction`.
   */
  static async negarTransacao(params: ValidarPixParams): Promise<ResultadoNegacaoPix> {
    const motivo = String(params.motivo || "").trim();
    if (!motivo) {
      throw new Error("MOTIVO_REQUIRED");
    }

    const chaveEfetiva = String(params.chaveAcao || params.transacaoId || "").trim();

    if (ehChaveManual(chaveEfetiva)) {
      const resultadoManual = await ComprasManuaisService.negarCompra({
        chave: chaveEfetiva,
        uidTesouraria: params.uidTesouraria,
        emailTesouraria: params.emailTesouraria,
        motivo,
      });

      return {
        sucesso: true,
        statusValidacao: "negada",
        transacaoId: params.transacaoId,
        rifas: resultadoManual.rifas,
        motivo,
      };
    }

    const resultado = await this.executarDecisaoTransacao({
      acao: "negada",
      chaveEfetiva,
      uidTesouraria: params.uidTesouraria,
      emailTesouraria: params.emailTesouraria,
      motivo,
    });

    return {
      sucesso: true,
      statusValidacao: "negada",
      transacaoId: params.transacaoId,
      rifas: resultado.numerosRifas,
      motivo,
    };
  }

  /**
   * Processa em lote a aprovação sequencial de transações selecionadas na Tesouraria.
   *
   * @param {object} params - Lista de itens do lote e dados do avaliador.
   * @returns {Promise<ResultadoLoteValidacaoTransacoes>} Contabilização de sucessos, ignoradas e erros.
   */
  static async aceitarTransacoesEmLote(params: {
    itens: ItemLoteValidacaoTransacao[];
    uidTesouraria: string;
    emailTesouraria?: string;
  }): Promise<ResultadoLoteValidacaoTransacoes> {
    return this.executarDecisaoEmLote({
      itens: params.itens,
      errosIgnorados: ["PIX_ALREADY_VALIDATED", "TRANSACAO_JA_FINALIZADA"],
      erroPadrao: "Erro ao aprovar",
      executarItem: (item) =>
        this.aceitarTransacao({
          transacaoId: item.id,
          chaveAcao: item.chaveAcao,
          uidTesouraria: params.uidTesouraria,
          emailTesouraria: params.emailTesouraria,
        }),
    });
  }

  /**
   * Processa em lote a recusa sequencial de transações selecionadas na Tesouraria.
   *
   * @param {object} params - Lista de itens do lote, motivo obrigatório e avaliador.
   * @returns {Promise<ResultadoLoteValidacaoTransacoes>} Contabilização de sucessos, ignoradas e erros.
   * @throws {Error} `"MOTIVO_REQUIRED"` quando o motivo estiver vazio.
   */
  static async negarTransacoesEmLote(params: {
    itens: ItemLoteValidacaoTransacao[];
    uidTesouraria: string;
    emailTesouraria?: string;
    motivo: string;
  }): Promise<ResultadoLoteValidacaoTransacoes> {
    const motivo = String(params.motivo || "").trim();
    if (!motivo) {
      throw new Error("MOTIVO_REQUIRED");
    }

    return this.executarDecisaoEmLote({
      itens: params.itens,
      errosIgnorados: ["PIX_ALREADY_VALIDATED"],
      erroPadrao: "Erro ao recusar",
      executarItem: (item) =>
        this.negarTransacao({
          transacaoId: item.id,
          chaveAcao: item.chaveAcao,
          uidTesouraria: params.uidTesouraria,
          emailTesouraria: params.emailTesouraria,
          motivo,
        }),
    });
  }

  /**
   * Executa transacionalmente o aceite ou recusa de um pagamento Pix e seus bilhetes vinculados,
   * tratando tanto registros principais em `pagamentos_pix` quanto fallback legado por `bilhetes`.
   */
  private static async executarDecisaoTransacao(params: {
    acao: AcaoValidacaoPix;
    chaveEfetiva: string;
    uidTesouraria: string;
    emailTesouraria?: string;
    motivo?: string;
  }): Promise<ResultadoInternoDecisaoPix> {
    const db = admin.firestore();
    const pixOrderId = params.chaveEfetiva.replace(/^pix-/, "");

    if (!pixOrderId) {
      throw new Error("TRANSACAO_SEM_REFERENCIA");
    }

    const validadoEm = new Date().toISOString();
    const validadoPor = params.emailTesouraria || params.uidTesouraria;

    return db.runTransaction(async (transaction) => {
      const querySnap = await transaction.get(
        db.collection("pagamentos_pix").where("pix_order_id", "==", pixOrderId).limit(1),
      );

      if (querySnap.empty) {
        return this.executarFallbackBilhetesNaTransacao({
          transaction,
          db,
          pixOrderId,
          acao: params.acao,
          motivo: params.motivo || "",
          validadoEm,
          validadoPor,
        });
      }

      const pagRef = querySnap.docs[0].ref;
      const pagamento = querySnap.docs[0].data() as any;

      if (
        pagamento.status_validacao === "aceita" ||
        (params.acao === "negada" && pagamento.status_validacao === "negada")
      ) {
        throw new Error("PIX_ALREADY_VALIDATED");
      }

      const numerosRifas: string[] = pagamento.numeros_rifas || [];
      if (numerosRifas.length === 0) {
        throw new Error("TRANSACAO_SEM_RIFAS");
      }

      const bilhetesRefs = numerosRifas.map((numero) => db.collection("bilhetes").doc(numero));
      const bilhetesSnaps =
        typeof transaction.getAll === "function"
          ? await transaction.getAll(...bilhetesRefs)
          : await Promise.all(bilhetesRefs.map((ref) => transaction.get(ref)));

      if (bilhetesSnaps.some((snap: any) => !snap.exists)) {
        throw new Error("UM_OU_MAIS_BILHETES_NAO_ENCONTRADOS");
      }

      let bilhetesAtualizados = 0;
      bilhetesSnaps.forEach((snap: any) => {
        const bilhete = snap.data();
        if (!bilhetePertenceAoPagamento(bilhete, pagamento, pixOrderId)) {
          return;
        }

        bilhetesAtualizados++;
        const payloadBilhete =
          params.acao === "aceita"
            ? montarPayloadBilheteAprovado({
                valorBruto: bilhete?.valor_bruto,
                dataPagamento: pagamento.data_pagamento,
                validadoEm,
                validadoPor,
              })
            : montarPayloadBilheteRecusado({
                motivo: params.motivo || "",
                validadoEm,
                validadoPor,
              });

        transaction.set(snap.ref, payloadBilhete, { merge: true });
      });

      if (bilhetesSnaps.length > 0 && bilhetesAtualizados === 0) {
        throw new Error("TODOS_BILHETES_PERDIDOS");
      }

      transaction.set(
        pagRef,
        params.acao === "aceita"
          ? {
              status_validacao: "aceita",
              status_pagamento_banco: "PAID",
              validado_em: validadoEm,
              validado_por: validadoPor,
              motivo_negacao: null,
              motivo_recusa: null,
            }
          : {
              status_validacao: "negada",
              status_pagamento_banco: "DECLINED",
              validado_em: validadoEm,
              validado_por: validadoPor,
              motivo_negacao: params.motivo,
              motivo_recusa: params.motivo,
            },
        { merge: true },
      );

      if (params.acao === "negada" && pagamento.vendedor_id) {
        transaction.set(
          db.collection("notificacoes").doc(),
          montarNotificacaoCorrecaoDados({
            vendedorId: pagamento.vendedor_id,
            titulo: "Venda recusada",
            mensagem: params.motivo || "Revise os dados do comprador e envie novamente.",
            rifas: numerosRifas,
            dataCriacao: validadoEm,
          }),
        );
      }

      let compradorEmail = pagamento.comprador_email || null;
      let compradorNome = pagamento.comprador_nome || "Comprador";

      if (!compradorEmail) {
        for (const snap of bilhetesSnaps) {
          const b = snap.data();
          if (b?.comprador_email) {
            compradorEmail = b.comprador_email;
            compradorNome = b.comprador_nome || compradorNome;
            break;
          }
        }
      }

      return {
        numerosRifas,
        compradorEmail,
        compradorNome,
      };
    });
  }

  /**
   * Trata registros legados sem documento pai em `pagamentos_pix`, aplicando a decisão diretamente nos bilhetes.
   */
  private static async executarFallbackBilhetesNaTransacao(params: {
    transaction: FirebaseFirestore.Transaction;
    db: admin.firestore.Firestore;
    pixOrderId: string;
    acao: AcaoValidacaoPix;
    motivo: string;
    validadoEm: string;
    validadoPor: string;
  }): Promise<ResultadoInternoDecisaoPix> {
    const { transaction, db, pixOrderId, acao, motivo, validadoEm, validadoPor } = params;
    const bilhetesQuery = await transaction.get(
      db.collection("bilhetes").where("pix_order_id", "==", pixOrderId).limit(100),
    );

    if (bilhetesQuery.empty) {
      throw new Error("PAGAMENTO_NOT_FOUND");
    }

    const numerosRifas: string[] = [];
    let compradorEmail: string | null = null;
    let compradorNome = "Comprador";
    let vendedorIdFallback: string | null = null;

    bilhetesQuery.forEach((doc) => {
      const d = doc.data();
      if (acao === "negada" && (d.status_validacao === "aceita" || d.status === "pago")) {
        return;
      }

      numerosRifas.push(doc.id);
      compradorEmail = compradorEmail || d.comprador_email || null;
      compradorNome =
        compradorNome !== "Comprador" ? compradorNome : d.comprador_nome || "Comprador";
      vendedorIdFallback = vendedorIdFallback || d.vendedor_id || null;

      const payloadBilhete =
        acao === "aceita"
          ? montarPayloadBilheteAprovado({
              valorBruto: d.valor_bruto,
              dataPagamento: d.data_pagamento,
              validadoEm,
              validadoPor,
            })
          : montarPayloadBilheteRecusado({
              motivo,
              validadoEm,
              validadoPor,
            });

      transaction.set(doc.ref, payloadBilhete, { merge: true });
    });

    if (acao === "negada" && numerosRifas.length === 0) {
      throw new Error("PIX_ALREADY_VALIDATED");
    }

    if (acao === "negada" && vendedorIdFallback) {
      transaction.set(
        db.collection("notificacoes").doc(),
        montarNotificacaoCorrecaoDados({
          vendedorId: vendedorIdFallback,
          titulo: "Venda recusada",
          mensagem: motivo || "Revise os dados do comprador e envie novamente.",
          rifas: numerosRifas,
          dataCriacao: validadoEm,
        }),
      );
    }

    return {
      numerosRifas,
      compradorEmail,
      compradorNome,
    };
  }

  /**
   * Itera sequencialmente itens de decisão em lote contabilizando sucessos, idempotências e falhas.
   */
  private static async executarDecisaoEmLote(params: {
    itens: ItemLoteValidacaoTransacao[];
    errosIgnorados: string[];
    erroPadrao: string;
    executarItem: (item: ItemLoteValidacaoTransacao) => Promise<unknown>;
  }): Promise<ResultadoLoteValidacaoTransacoes> {
    let processadas = 0;
    let ignoradas = 0;
    const erros: Array<{ id: string; erro: string }> = [];

    for (const item of params.itens) {
      try {
        await params.executarItem(item);
        processadas++;
      } catch (err: any) {
        if (params.errosIgnorados.includes(err?.message)) {
          ignoradas++;
        } else {
          erros.push({ id: item.id, erro: err?.message || params.erroPadrao });
        }
      }
    }

    return {
      sucesso: erros.length === 0,
      processadas,
      ignoradas,
      erros,
    };
  }
}
