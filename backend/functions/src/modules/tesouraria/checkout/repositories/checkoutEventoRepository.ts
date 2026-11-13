// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/checkout/repositories/checkoutEventoRepository.ts
// ============================================================================

import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

import { PagamentoPix, ProvedorPagamento } from "../../../types/models";
import { EventoStatusPagamento } from "../../../../shared/payments/types/paymentProviderTypes";
import { construirGatewayMetaEnxuto } from "../../helpers/origemPagamentoHelper";
import {
  BaseFirestoreRepository,
  ResultadoAplicacaoEventoPix,
} from "./baseFirestoreRepository";
import { CheckoutCancelamentoRepository } from "./checkoutCancelamentoRepository";

/**
 * Repositório especializado na consulta de pagamentos Pix e aplicação transacional
 * de eventos de status recebidos de gateways externos (webhooks, sincronização e CRON).
 */
export class CheckoutEventoRepository extends BaseFirestoreRepository {
  /**
   * Busca um documento de pagamento Pix pelo seu ID.
   *
   * @param {string} pagamentoId - Identificador do documento em `pagamentos_pix`.
   * @returns {Promise<PagamentoPix | null>} Documento encontrado ou `null`.
   */
  async buscarPagamentoPorId(pagamentoId: string): Promise<PagamentoPix | null> {
    const snap = await this.getDb().collection("pagamentos_pix").doc(pagamentoId).get();
    if (!snap.exists) {
      return null;
    }

    const dados = snap.data() as PagamentoPix;
    return {
      ...dados,
      id: dados?.id || snap.id,
    };
  }

  /**
   * Aplica transacionalmente um evento canônico de status de pagamento no Firestore,
   * atualizando `pagamentos_pix`, os `bilhetes` vinculados e disparando notificação quando liberados.
   *
   * @param {EventoStatusPagamento} evento - Evento normalizado originado de gateway externo.
   * @returns {Promise<ResultadoAplicacaoEventoPix>} Resultado da aplicação idempotente.
   * @transactional Executa busca do pagamento, leitura dos bilhetes e mutações em `db.runTransaction`.
   * @throws {Error} `"PAGAMENTO_NOT_FOUND"` quando nenhum pagamento corresponde ao `orderId`/`referenceId`.
   */
  async aplicarEventoPagamento(
    evento: EventoStatusPagamento,
  ): Promise<ResultadoAplicacaoEventoPix> {
    const db = this.getDb();

    return await db.runTransaction(async (transaction) => {
      const pagamentoDoc = await this.buscarDocPagamentoNaTransacao(
        transaction,
        db,
        evento.orderId,
        evento.referenceId,
      );

      if (!pagamentoDoc) {
        throw new Error("PAGAMENTO_NOT_FOUND");
      }

      const pagamentoRef = pagamentoDoc.ref;
      const pagamento = pagamentoDoc.data() as PagamentoPix;

      if (pagamento.provedor_pagamento === "EMV_OFFLINE") {
        return {
          sucesso: true,
          idempotente: true,
          status: pagamento.status_pagamento_banco,
          mensagem: "Evento de gateway externo ignorado para pagamento operado em modo Pix Normal / Offline.",
        };
      }

      const gatewayMeta = construirGatewayMetaEnxuto(
        evento.rawPayload,
        (pagamento.provedor_pagamento as ProvedorPagamento) || "MERCADOPAGO_API",
      );

      if (pagamento.status_pagamento_banco === evento.statusBancoBruto) {
        if (!pagamento.gateway_meta && gatewayMeta) {
          transaction.set(pagamentoRef, { gateway_meta: gatewayMeta }, { merge: true });
        }

        return {
          sucesso: true,
          idempotente: true,
          status: evento.statusBancoBruto,
        };
      }

      const dadosPagamento: Partial<PagamentoPix> = {
        pix_order_id: evento.orderId || pagamento.pix_order_id || pagamento.id,
        valor_pago: evento.valorPagoReais || pagamento.valor_pago || 0,
        data_pagamento: evento.pagoEm || pagamento.data_pagamento || null,
        ...(gatewayMeta ? { gateway_meta: gatewayMeta } : {}),
      };

      const jaValidadoManualmente =
        pagamento.status_validacao === "aceita" || pagamento.status_validacao === "negada";

      if (!jaValidadoManualmente) {
        dadosPagamento.status_pagamento_banco = evento.statusBancoBruto;
        await this.aplicarTransicaoBilhetes(transaction, db, pagamento, evento, dadosPagamento);
      }

      transaction.set(pagamentoRef, dadosPagamento, { merge: true });

      return {
        sucesso: true,
        idempotente: jaValidadoManualmente,
        status: evento.statusBancoBruto,
        mensagem: jaValidadoManualmente
          ? "Webhook alterou apenas dados bancários pois o pagamento já foi validado pela tesouraria."
          : undefined,
      };
    });
  }

  /**
   * Localiza o documento em `pagamentos_pix` por `pix_order_id` ou fallback `reference_id`.
   */
  private async buscarDocPagamentoNaTransacao(
    transaction: FirebaseFirestore.Transaction,
    db: admin.firestore.Firestore,
    orderId: string,
    referenceId?: string | null,
  ) {
    let querySnap = await transaction.get(
      db.collection("pagamentos_pix").where("pix_order_id", "==", orderId).limit(1),
    );

    if (querySnap.empty && referenceId) {
      querySnap = await transaction.get(
        db.collection("pagamentos_pix").where("reference_id", "==", String(referenceId)).limit(1),
      );
    }

    return querySnap.empty ? null : querySnap.docs[0];
  }

  /**
   * Propaga pagamento confirmado ou cancelamento para os bilhetes vinculados dentro da transação.
   */
  private async aplicarTransicaoBilhetes(
    transaction: FirebaseFirestore.Transaction,
    db: admin.firestore.Firestore,
    pagamento: PagamentoPix,
    evento: EventoStatusPagamento,
    dadosPagamento: Partial<PagamentoPix>,
  ): Promise<void> {
    if (evento.statusCanonico === "pago") {
      const refs = pagamento.numeros_rifas.map((numero) => db.collection("bilhetes").doc(numero));
      let bilhetesAtualizados = 0;

      if (refs.length > 0) {
        const bilhetesSnaps = await transaction.getAll(...refs);

        bilhetesSnaps.forEach((snap) => {
          if (!snap.exists) return;
          const bilhete = snap.data();

          if (pagamento.reference_id && bilhete?.pix_reference_id !== pagamento.reference_id) {
            return;
          }

          bilhetesAtualizados++;
          transaction.set(
            snap.ref,
            {
              status: "pendente",
              status_pagamento_banco: evento.statusBancoBruto,
              status_validacao: null,
              valor_pago:
                pagamento.numeros_rifas.length > 0
                  ? (evento.valorPagoReais || pagamento.valor_bruto) /
                    pagamento.numeros_rifas.length
                  : 0,
              data_pagamento: evento.pagoEm || new Date().toISOString(),
              pix_order_id: evento.orderId,
            },
            { merge: true },
          );
        });
      }

      if (refs.length > 0 && bilhetesAtualizados === 0) {
        dadosPagamento.necessita_reembolso = true;
        dadosPagamento.observacao_reembolso =
          "Pagamento recebido durante ou após cancelamento automático/expiração. Os bilhetes já haviam sido liberados.";
      }
      return;
    }

    if (evento.statusCanonico === "cancelado") {
      const motivo = evento.motivoFalha || "Pagamento não confirmado pelo banco.";

      await CheckoutCancelamentoRepository.liberarBilhetesNaTransacao(
        transaction,
        db,
        FieldValue.delete(),
        pagamento.numeros_rifas || [],
        evento.statusBancoBruto,
        motivo,
        false,
        undefined,
        pagamento.reference_id,
      );

      if (pagamento.vendedor_id) {
        transaction.set(db.collection("notificacoes").doc(), {
          vendedor_id: pagamento.vendedor_id,
          tipo: "rifa_liberada",
          titulo: "Rifas disponíveis novamente",
          mensagem:
            motivo || "O pagamento não foi confirmado pelo banco e as rifas voltaram para venda.",
          rifas: pagamento.numeros_rifas,
          lida: false,
          data_criacao: new Date().toISOString(),
        });
      }
    }
  }
}
