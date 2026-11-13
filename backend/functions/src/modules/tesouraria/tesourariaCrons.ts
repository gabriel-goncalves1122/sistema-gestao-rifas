// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/tesourariaCrons.ts
// ============================================================================
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { CheckoutStrategyFactory } from "./checkout/checkoutStrategyFactory";
import { CheckoutPixRepository } from "./checkout/repositories/checkoutPixRepository";
import { PagamentoPix } from "../types/models";

/**
 * Função agendada a cada 5 minutos para expirar e liberar cobranças Pix vencidas,
 * delegando o comportamento específico (Mercado Pago vs. Pix Normal/EMV Offline)
 * polimorficamente à estratégia OO correspondente.
 */
export const limparPixExpirados = onSchedule(
  {
    schedule: "every 5 minutes",
    timeoutSeconds: 300,
    memory: "256MiB",
    retryCount: 0,
    region: "southamerica-east1",
  },
  async () => {
    const db = admin.firestore();
    const repository = new CheckoutPixRepository(db);
    const agora = new Date().toISOString();

    console.log("[CRON] Iniciando limpeza de pagamentos Pix expirados...");

    try {
      const snap = await db
        .collection("pagamentos_pix")
        .where("status_pagamento_banco", "in", ["pending", "CRIANDO", "WAITING"])
        .where("data_expiracao", "<", agora)
        .limit(100)
        .get();

      if (snap.empty) {
        console.log("[CRON] Nenhum pagamento expirado encontrado para limpeza.");
        return;
      }

      console.log(`[CRON] Encontrados ${snap.size} pagamentos possivelmente expirados.`);

      const promessasLimpeza = snap.docs.map(async (docSnap) => {
        const pagamento = docSnap.data() as PagamentoPix;
        const pagamentoId = docSnap.id;

        try {
          const strategy = CheckoutStrategyFactory.obterPorPagamento(pagamento, repository);
          await strategy.expirarCheckout(pagamentoId, pagamento);
          console.log(`[CRON] Pagamento ${pagamentoId} processado com sucesso.`);
        } catch (error: any) {
          console.error(`[CRON] Erro ao processar pagamento ${pagamentoId}:`, error);
        }
      });

      await Promise.all(promessasLimpeza);

      console.log("[CRON] Limpeza de pagamentos expirados finalizada.");
    } catch (err) {
      console.error("[CRON] Falha na execução principal da limpeza:", err);
    }
  },
);
