// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/checkout/repositories/checkoutManualRepository.ts
// ============================================================================

import { Bilhete, PagamentoPix } from "../../../types/models";
import { isReservaBilheteExpirada } from "../../helpers/checkoutPixHelper";
import { ehPagamentoGatewayMercadoPago } from "../../helpers/origemPagamentoHelper";
import { BaseFirestoreRepository } from "./baseFirestoreRepository";

/**
 * Repositório especializado nas operações manuais e de ambiente local do checkout
 * (confirmação de envio de comprovante no Pix Normal e simulação em emulador).
 */
export class CheckoutManualRepository extends BaseFirestoreRepository {
  /**
   * Registra transacionalmente o envio do comprovante para cobrança Pix Normal/Offline,
   * transicionando os bilhetes para `'pendente'` e o pagamento para `'IN_ANALYSIS'`.
   *
   * @param {Object} params - Parâmetros de confirmação de envio.
   * @returns {Promise<{ numerosRifas: string[]; compradorEmail?: string | null; compradorNome?: string | null }>}
   * @transactional Executa leitura prévia do pagamento e dos bilhetes antes das mutações.
   * @throws {Error} `"PAGAMENTO_NOT_FOUND"`, `"UNAUTHORIZED"`, `"CONFIRMACAO_MANUAL_NAO_SUPORTADA"`, `"STATUS_INVALIDO_CONFIRMACAO"`, `"RIFA_INDISPONIVEL"`, `"TRANSACAO_JA_FINALIZADA"` ou `"RIFA_NOT_FOUND"`.
   */
  async registrarConfirmacaoEnvio(params: {
    pagamentoId: string;
    comprovanteUrl: string;
    hashComprovante?: string | null;
    autorizar: (pagamento: PagamentoPix) => void | Promise<void>;
  }): Promise<{
    numerosRifas: string[];
    compradorEmail?: string | null;
    compradorNome?: string | null;
  }> {
    const db = this.getDb();
    const pagamentoRef = db.collection("pagamentos_pix").doc(params.pagamentoId);

    return await db.runTransaction(async (transaction) => {
      const snapPagamento = await transaction.get(pagamentoRef);
      if (!snapPagamento.exists) {
        throw new Error("PAGAMENTO_NOT_FOUND");
      }

      const pagamento = snapPagamento.data() as PagamentoPix;
      await params.autorizar(pagamento);

      if (ehPagamentoGatewayMercadoPago(pagamento)) {
        throw new Error("CONFIRMACAO_MANUAL_NAO_SUPORTADA");
      }

      if (
        ["PAID", "AUTHORIZED", "approved", "authorized"].includes(
          String(pagamento.status_pagamento_banco),
        ) ||
        pagamento.status_validacao === "aceita"
      ) {
        throw new Error("TRANSACAO_JA_FINALIZADA");
      }

      if (
        ["CANCELADO", "CANCELED", "cancelled", "expired", "ERRO_CRIACAO", "DECLINED"].includes(
          String(pagamento.status_pagamento_banco),
        ) ||
        pagamento.status_validacao === "negada"
      ) {
        throw new Error("STATUS_INVALIDO_CONFIRMACAO");
      }

      const numerosRifas = pagamento.numeros_rifas || [];
      const rifasRefs = numerosRifas.map((num) => db.collection("bilhetes").doc(num));
      const snapsRifas = await Promise.all(rifasRefs.map((ref) => transaction.get(ref)));

      for (const snap of snapsRifas) {
        if (!snap.exists) throw new Error("RIFA_NOT_FOUND");

        const bilhete = ((typeof snap.data === "function" ? snap.data() : snap.data) ||
          {}) as Partial<Bilhete>;
        if (bilhete.status === "pago") {
          throw new Error("RIFA_INDISPONIVEL");
        }

        if (bilhete.status === "reservado" || bilhete.status === "pendente") {
          const pixOrderIdsDoPagamento = [
            pagamento.pix_order_id,
            params.pagamentoId,
          ].filter(Boolean);

          const pertenceAOutroPagamento =
            (bilhete.pix_order_id && !pixOrderIdsDoPagamento.includes(bilhete.pix_order_id)) ||
            (pagamento.reference_id &&
              bilhete.pix_reference_id &&
              bilhete.pix_reference_id !== pagamento.reference_id) ||
            (pagamento.comprador_id &&
              bilhete.comprador_id &&
              bilhete.comprador_id !== pagamento.comprador_id);

          if (pertenceAOutroPagamento && !isReservaBilheteExpirada(bilhete)) {
            throw new Error("RIFA_INDISPONIVEL");
          }
        }
      }

      const agora = new Date().toISOString();

      transaction.set(
        pagamentoRef,
        {
          status_pagamento_banco: "IN_ANALYSIS",
          status_validacao: null,
          motivo_recusa: null,
          comprovante_url: params.comprovanteUrl,
          hash_comprovante: params.hashComprovante || null,
          atualizado_em: agora,
        },
        { merge: true },
      );

      const pixOrderIdEfetivo = pagamento.pix_order_id || params.pagamentoId;

      rifasRefs.forEach((ref) => {
        const updateBilhete: Partial<Omit<Bilhete, "comprador_nome">> &
          Record<string, unknown> = {
          status: "pendente",
          comprador_id: pagamento.comprador_id || null,
          comprador_nome: pagamento.comprador_nome || null,
          comprador_telefone: pagamento.comprador_telefone || null,
          comprador_email: pagamento.comprador_email || null,
          comprovante_url: params.comprovanteUrl,
          data_reserva: agora,
          pix_order_id: pixOrderIdEfetivo,
          pix_reference_id: pagamento.reference_id || null,
          provedor_pagamento: "EMV_OFFLINE",
          status_pagamento_banco: "IN_ANALYSIS",
          status_validacao: null,
          motivo_recusa: null,
        };

        if (params.hashComprovante) {
          updateBilhete.hash_comprovante = params.hashComprovante;
        }

        transaction.set(ref, updateBilhete, { merge: true });
      });

      return {
        numerosRifas,
        compradorEmail: pagamento.comprador_email,
        compradorNome: pagamento.comprador_nome,
      };
    });
  }

  /**
   * Simula a liquidação bancária de um pagamento Pix em ambiente de emulador.
   *
   * @param {string} pagamentoId - Identificador do pagamento em `pagamentos_pix`.
   * @returns {Promise<void>}
   * @transactional Atualiza pagamento e bilhetes atomicamente.
   * @throws {Error} `"PAGAMENTO_NOT_FOUND"` se o documento não existir.
   */
  async simularPagamento(pagamentoId: string): Promise<void> {
    const db = this.getDb();
    const pagamentoRef = db.collection("pagamentos_pix").doc(pagamentoId);

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(pagamentoRef);
      if (!snap.exists) {
        throw new Error("PAGAMENTO_NOT_FOUND");
      }

      const dados = snap.data();
      const numerosRifas: string[] = dados?.numeros_rifas || [];
      const valorBruto = dados?.valor_bruto || 0;
      const agora = new Date().toISOString();

      transaction.update(pagamentoRef, {
        status_pagamento_banco: "PAID",
        valor_pago: valorBruto,
        data_pagamento: agora,
      });

      for (const numero of numerosRifas) {
        transaction.update(db.collection("bilhetes").doc(numero), {
          status: "pendente",
          status_pagamento_banco: "PAID",
          valor_pago: numerosRifas.length > 0 ? valorBruto / numerosRifas.length : 0,
          data_pagamento: agora,
        });
      }
    });
  }
}
