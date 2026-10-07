// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/tesourariaCrons.ts
// ============================================================================
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { MercadoPagoPixClient } from "../../shared/services/mercadoPagoPixClient";
import { liberarBilhetesNaTransacao } from "./helpers/checkoutPixHelper";
import { aprovarOuRejeitarPixNoFirestore } from "./helpers/checkoutPixWebhookHelper";
import { mapearStatusMercadoPagoParaCanonico } from "./helpers/statusPagamentoPixHelper";
import { PagamentoPix } from "../types/models";

/**
 * Função rodando a cada 15 minutos para fazer a limpeza (fallback) de Pix que expiraram 
 * mas cujo webhook do Mercado Pago nunca chegou ou falhou.
 */
export const limparPixExpirados = onSchedule(
  {
    schedule: "every 15 minutes",
    timeoutSeconds: 300,
    memory: "256MiB",
    retryCount: 0,
    region: "southamerica-east1",
  },
  async (event) => {
    const db = admin.firestore();
    const agora = new Date().toISOString();

    console.log("[CRON] Iniciando limpeza de pagamentos Pix expirados...");

    try {
      // 1. Busca todos os pagamentos pendentes cuja data_expiracao já passou
      const snap = await db
        .collection("pagamentos_pix")
        .where("status_pagamento_banco", "in", ["pending", "CRIANDO", "WAITING"])
        .where("data_expiracao", "<", agora)
        .limit(100) // Limite de lote
        .get();

      if (snap.empty) {
        console.log("[CRON] Nenhum pagamento expirado encontrado para limpeza.");
        return;
      }

      console.log(`[CRON] Encontrados ${snap.size} pagamentos possivelmente expirados.`);

      const promessasLimpeza = snap.docs.map(async (docSnap) => {
        const pagamento = docSnap.data() as PagamentoPix;
        const pagamentoId = docSnap.id;
        const orderId = pagamento.pix_order_id;

        try {
          if (!orderId) {
            throw new Error("Sem orderId para consultar.");
          }

          // 2. Consulta o status real no Mercado Pago para ter 100% de certeza
          const pagamentoMP = await MercadoPagoPixClient.consultarPedido(orderId);
          const statusMP = pagamentoMP?.status || "";
          const statusCanonico = mapearStatusMercadoPagoParaCanonico(statusMP);

          // Se o banco disser que foi pago/autorizado (ex: approved, authorized), aplicamos o pagamento
          // usando o mesmo helper do webhook, para não deixá-lo no vácuo se o webhook falhou.
          if (statusCanonico === "pago") {
            console.log(`[CRON] Pagamento ${pagamentoId} está pago no MP. Sincronizando aprovação...`);
            await aprovarOuRejeitarPixNoFirestore(db, pagamentoMP);
            return;
          }

          // Se não estiver pago, seguimos com o cancelamento
          await db.runTransaction(async (transaction) => {
            const trSnap = await transaction.get(docSnap.ref);
            if (!trSnap.exists) return;
            const trPagamento = trSnap.data() as PagamentoPix;

            // Previne Race Condition
            if (!["pending", "CRIANDO", "WAITING"].includes(String(trPagamento.status_pagamento_banco))) {
              return;
            }

            // 3. Libera as rifas
            await liberarBilhetesNaTransacao(
              transaction,
              db,
              FieldValue.delete(),
              trPagamento.numeros_rifas || [],
              "cancelled", // Status fictício para liberação
              "Pagamento expirado (limpeza automática por inatividade).",
              false,
              undefined,
              trPagamento.reference_id
            );

            // 4. Marca como cancelado com status consistente (minúsculo)
            transaction.update(docSnap.ref, {
              status_pagamento_banco: "cancelled",
              erro_criacao: "Expirado automaticamente (CRON).",
            });
          });

          // 5. Cancela fisicamente o QR Code no Mercado Pago para não permitir pagamento atrasado
          try {
            await MercadoPagoPixClient.cancelarPedidoPix(orderId);
            console.log(`[CRON] Pedido Pix cancelado ativamente na API do Mercado Pago (orderId: ${orderId}).`);
          } catch (mpError: any) {
            console.warn(`[CRON] Falha ao cancelar Pedido Pix no Mercado Pago (orderId: ${orderId}). Erro:`, mpError?.message);
          }

          console.log(`[CRON] Pagamento ${pagamentoId} expirado com sucesso e rifas liberadas.`);
        } catch (error: any) {
          console.error(`[CRON] Erro ao processar pagamento ${pagamentoId}:`, error);
        }
      });

      await Promise.all(promessasLimpeza);

      console.log("[CRON] Limpeza de pagamentos expirados finalizada.");
    } catch (err) {
      console.error("[CRON] Falha na execução principal da limpeza:", err);
    }
  }
);
