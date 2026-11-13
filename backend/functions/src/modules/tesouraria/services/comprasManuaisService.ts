// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/services/comprasManuaisService.ts
// ============================================================================
import * as admin from "firebase-admin";

import { enviarEmailRecibo } from "../../rifas/emailService";
import {
  montarNotificacaoCorrecaoDados,
  montarPayloadBilheteAprovado,
  montarPayloadBilheteRecusado,
  resolverFiltrosChaveManual,
} from "../helpers/validacaoCompraHelper";

export interface ResultadoAceiteCompraManual {
  sucesso: boolean;
  statusValidacao: "aceita";
  rifas: string[];
  atualizados?: number;
  emailEnviado?: boolean;
  transacaoId?: string;
}

export interface ResultadoNegacaoCompraManual {
  sucesso: boolean;
  statusValidacao: "negada";
  rifas: string[];
  atualizados?: number;
  motivo?: string;
  transacaoId?: string;
}

type AcaoCompraManual = "aceita" | "negada";

/**
 * Constrói a query Firestore equivalente a uma chave de compra manual validada.
 *
 * @param {admin.firestore.Firestore} db - Instância do Firestore.
 * @param {string} chave - Chave prefixada (`comprovante-`, `comprador-`, `pixref-` ou `manual|`).
 * @returns {admin.firestore.Query} Query pronta para leitura transacional.
 */
function criarQueryCompraManual(
  db: admin.firestore.Firestore,
  chave: string,
): admin.firestore.Query {
  const filtros = resolverFiltrosChaveManual(chave);
  let query: admin.firestore.Query = db.collection("bilhetes");

  for (const filtro of filtros) {
    query = query.where(filtro.campo, "==", filtro.valor);
  }

  return query;
}

export class ComprasManuaisService {
  /**
   * Aprova manualmente uma compra agrupada por chave não-Pix (`comprovante-`, `comprador-`, `pixref-`, `manual|`)
   * atualizando os bilhetes pendentes/reservados para `"pago"` e disparando recibo por e-mail.
   *
   * @param {object} params - Chave de agrupamento e identificação do avaliador na Tesouraria.
   * @returns {Promise<ResultadoAceiteCompraManual>} Resultado do aceite manual com rifas afetadas.
   * @throws {Error} `"CHAVE_INVALIDA"`, `"CANNOT_PARSE_MANUAL_KEY"`, `"COMPRA_NOT_FOUND"` ou `"TRANSACAO_SEM_RIFAS_PENDENTES"`.
   * @transactional Atualiza todos os bilhetes do grupo em `db.runTransaction`.
   * @sideEffects Envia e-mail de confirmação para o comprador via `enviarEmailRecibo`.
   */
  static async aceitarCompra(params: {
    chave: string;
    uidTesouraria: string;
    emailTesouraria?: string;
  }): Promise<ResultadoAceiteCompraManual> {
    const resultado = await this.executarDecisaoCompraManual({
      acao: "aceita",
      chave: params.chave,
      uidTesouraria: params.uidTesouraria,
      emailTesouraria: params.emailTesouraria,
    });

    const emailEnviado = resultado.compradorEmail
      ? await enviarEmailRecibo(
          resultado.compradorEmail,
          resultado.compradorNome || "Comprador",
          resultado.numerosRifas,
          "aprovado",
        )
      : false;

    return {
      sucesso: true,
      statusValidacao: "aceita",
      rifas: resultado.numerosRifas,
      atualizados: resultado.atualizados,
      emailEnviado,
    };
  }

  /**
   * Recusa manualmente uma compra agrupada por chave não-Pix, marcando os bilhetes pendentes
   * como `"recusado"` e gerando notificação de correção para o aderido vendedor.
   *
   * @param {object} params - Chave de agrupamento, identificação da Tesouraria e motivo da recusa.
   * @returns {Promise<ResultadoNegacaoCompraManual>} Resultado da recusa com contagem de rifas afetadas.
   * @throws {Error} `"MOTIVO_REQUIRED"`, `"CHAVE_INVALIDA"`, `"COMPRA_NOT_FOUND"`, `"PIX_ALREADY_VALIDATED"` ou `"TRANSACAO_SEM_RIFAS_VALIDAS"`.
   * @transactional Executa recusa dos bilhetes e gravação de notificações em `db.runTransaction`.
   */
  static async negarCompra(params: {
    chave: string;
    uidTesouraria: string;
    emailTesouraria?: string;
    motivo: string;
  }): Promise<ResultadoNegacaoCompraManual> {
    if (!params.motivo) {
      throw new Error("MOTIVO_REQUIRED");
    }

    const resultado = await this.executarDecisaoCompraManual({
      acao: "negada",
      chave: params.chave,
      uidTesouraria: params.uidTesouraria,
      emailTesouraria: params.emailTesouraria,
      motivo: params.motivo,
    });

    return {
      sucesso: true,
      statusValidacao: "negada",
      rifas: resultado.numerosRifas,
      atualizados: resultado.atualizados,
    };
  }

  /**
   * Executa transacionalmente o aceite ou recusa de um lote manual de bilhetes no Firestore.
   */
  private static async executarDecisaoCompraManual(params: {
    acao: AcaoCompraManual;
    chave: string;
    uidTesouraria: string;
    emailTesouraria?: string;
    motivo?: string;
  }): Promise<{
    numerosRifas: string[];
    atualizados: number;
    compradorEmail: string;
    compradorNome: string;
  }> {
    const db = admin.firestore();
    const query = criarQueryCompraManual(db, params.chave);

    return db.runTransaction(async (transaction) => {
      const bilhetesSnap = await transaction.get(query);
      if (bilhetesSnap.empty) {
        throw new Error("COMPRA_NOT_FOUND");
      }

      let atualizados = 0;
      let jaPagos = 0;
      const numerosRifas: string[] = [];
      const pixOrderIds = new Set<string>();
      let compradorEmail = "";
      let compradorNome = "";
      const rifasPorVendedor = new Map<string, string[]>();
      const validadoEm = new Date().toISOString();
      const validadoPor = params.emailTesouraria || params.uidTesouraria;

      const operacoesBilhetes: Array<{
        ref: FirebaseFirestore.DocumentReference;
        payload: Record<string, unknown>;
      }> = [];

      bilhetesSnap.forEach((snap) => {
        const bilhete = snap.data();

        if (bilhete.pix_order_id) {
          pixOrderIds.add(String(bilhete.pix_order_id));
        }

        if (bilhete.status === "pago") {
          jaPagos++;
          if (params.acao === "aceita") {
            atualizados++;
            numerosRifas.push(snap.id);
          }
          return;
        }

        if (bilhete.status !== "pendente" && bilhete.status !== "reservado") {
          return;
        }

        const payloadBilhete =
          params.acao === "aceita"
            ? montarPayloadBilheteAprovado({
                valorBruto: bilhete.valor_bruto,
                dataPagamento: validadoEm,
                validadoEm,
                validadoPor,
              })
            : montarPayloadBilheteRecusado({
                motivo: params.motivo || "",
                validadoEm,
                validadoPor,
                atualizarStatusBanco: Boolean(bilhete.status_pagamento_banco),
              });

        operacoesBilhetes.push({ ref: snap.ref, payload: payloadBilhete });
        atualizados++;
        numerosRifas.push(snap.id);
        compradorEmail = compradorEmail || bilhete.comprador_email;
        compradorNome = compradorNome || bilhete.comprador_nome;

        if (params.acao === "negada" && bilhete.vendedor_id) {
          const vendedorRifas = rifasPorVendedor.get(bilhete.vendedor_id) || [];
          vendedorRifas.push(snap.id);
          rifasPorVendedor.set(bilhete.vendedor_id, vendedorRifas);
        }
      });

      if (atualizados === 0) {
        if (params.acao === "negada") {
          if (jaPagos > 0) throw new Error("PIX_ALREADY_VALIDATED");
          throw new Error("TRANSACAO_SEM_RIFAS_VALIDAS");
        }
        throw new Error("TRANSACAO_SEM_RIFAS_PENDENTES");
      }

      // Lê documentos de pagamentos_pix por pix_order_id antes de qualquer escrita
      const pagamentosRefs: FirebaseFirestore.DocumentReference[] = [];
      for (const orderId of Array.from(pixOrderIds)) {
        const pagQuerySnap = await transaction.get(
          db.collection("pagamentos_pix").where("pix_order_id", "==", orderId).limit(1),
        );
        if (!pagQuerySnap.empty) {
          pagamentosRefs.push(pagQuerySnap.docs[0].ref);
        } else {
          pagamentosRefs.push(db.collection("pagamentos_pix").doc(orderId));
        }
      }

      // Executa escritas dos bilhetes
      operacoesBilhetes.forEach(({ ref, payload }) => {
        transaction.set(ref, payload, { merge: true });
      });

      // Executa escritas dos pagamentos
      pagamentosRefs.forEach((pagRef) => {
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
      });

      if (params.acao === "negada") {
        rifasPorVendedor.forEach((rifas, vendedorId) => {
          transaction.set(
            db.collection("notificacoes").doc(),
            montarNotificacaoCorrecaoDados({
              vendedorId,
              titulo: "Comprovante Manual Recusado",
              mensagem: params.motivo || "Revise os dados do comprovante e tente novamente.",
              rifas,
              dataCriacao: validadoEm,
            }),
          );
        });
      }

      return {
        numerosRifas,
        atualizados,
        compradorEmail,
        compradorNome,
      };
    });
  }
}
