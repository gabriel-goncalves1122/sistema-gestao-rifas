import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

import { PagamentoPix } from "../../types/models";
import { MercadoPagoPixClient } from "../../../shared/services/mercadoPagoPixClient";
import { obterContextoAderidoPorEmail } from "../../rifas/helpers/usuarioRifasHelper";
import { liberarBilhetesNaTransacao } from "../helpers/checkoutPixHelper";

export class CancelarCheckoutPixService {
  static async executar(params: {
    uid: string;
    email: string;
    role: string;
    pagamentoId: string;
    reterReserva?: boolean;
  }): Promise<void> {
    const { uid, email, role, pagamentoId, reterReserva = false } = params;

    if (!uid || !pagamentoId) {
      throw new Error("UNAUTHORIZED");
    }

    const db = admin.firestore();
    const pagamentoRef = db.collection("pagamentos_pix").doc(pagamentoId);
    let orderIdParaCancelar = "";

    console.log(`[DEBUG] CancelarCheckoutPixService: Iniciando para pagamentoId=${pagamentoId}`);

    // Pre-check: Consultar MP fora da transação para evitar cancelar algo recém-pago
    const pagamentoSnap = await pagamentoRef.get();
    if (!pagamentoSnap.exists) throw new Error("PAGAMENTO_NOT_FOUND");
    const pag = pagamentoSnap.data() as PagamentoPix;

    if (pag.pix_order_id && ["WAITING", "pending", "CRIANDO"].includes(String(pag.status_pagamento_banco))) {
      try {
        const pagamentoMP = await MercadoPagoPixClient.consultarPedido(pag.pix_order_id);
        const statusMP = pagamentoMP?.status || "";
        
        // Use a imported helper ou faça check manual simples
        if (["approved", "authorized", "paid"].includes(String(statusMP).toLowerCase())) {
          console.log(`[DEBUG] CancelarCheckoutPixService: Pagamento já estava aprovado no MP! Abortando cancelamento.`);
          // Sincronizar approval
          const { aprovarOuRejeitarPixNoFirestore } = require("../helpers/checkoutPixWebhookHelper");
          await aprovarOuRejeitarPixNoFirestore(db, pagamentoMP);
          throw new Error("PAGAMENTO_JA_APROVADO");
        }
      } catch (err: any) {
        if (err.message === "PAGAMENTO_JA_APROVADO") throw err;
        console.warn(`[DEBUG] CancelarCheckoutPixService: Falha ao pre-checar MP. Ignorando e prosseguindo. Erro: ${err.message}`);
      }
    }

    await db.runTransaction(async (transaction) => {
      console.log(`[DEBUG] CancelarCheckoutPixService: Dentro da transação`);
      const snap = await transaction.get(pagamentoRef);

      if (!snap.exists) {
        throw new Error("PAGAMENTO_NOT_FOUND");
      }

      const pagamento = snap.data() as PagamentoPix;

      let isAuthorized = false;
      if (role === "super-admin") {
        isAuthorized = true;
      } else if (pagamento.comprador_id === uid) {
        isAuthorized = true;
      } else if (email) {
        try {
          const contextoAderido = await obterContextoAderidoPorEmail(email);
          if (contextoAderido && contextoAderido.idAderido === pagamento.vendedor_id) {
            isAuthorized = true;
          }
        } catch (err) {
          // Fallback se não for Aderido ou erro ao obter contexto
        }
      }

      // Se ainda não autorizado, tenta a verificação legada
      if (!isAuthorized && pagamento.vendedor_id === uid) {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        console.log(`[DEBUG] CancelarCheckoutPixService: UNAUTHORIZED. uid=${uid}, comprador_id=${pagamento.comprador_id}, vendedor_id=${pagamento.vendedor_id}`);
        throw new Error("UNAUTHORIZED");
      }

      console.log(`[DEBUG] CancelarCheckoutPixService: Autorizado. Status banco: ${pagamento.status_pagamento_banco}`);

      const statusJaCancelados = ["CANCELADO", "cancelled", "canceled", "rejected", "declined", "ERRO_CRIACAO", "expired", "expirado"];
      const statusValidosParaCancelar = ["WAITING", "CRIANDO", "pending"];
      
      if (statusJaCancelados.includes(String(pagamento.status_pagamento_banco))) {
        console.log(`[DEBUG] CancelarCheckoutPixService: Já estava cancelado.`);
        // Se já está cancelado, mas o caller pediu liberação completa,
        // precisamos garantir que os bilhetes sejam liberados.
        if (!reterReserva) {
          await liberarBilhetesNaTransacao(
            transaction,
            db,
            FieldValue.delete(),
            pagamento.numeros_rifas || [],
            "cancelled",
            "Cancelado pelo usuário.",
            false,
            undefined,
            pagamento.reference_id
          );
        }
        return; 
      }

      if (!statusValidosParaCancelar.includes(String(pagamento.status_pagamento_banco))) {
        console.log(`[DEBUG] CancelarCheckoutPixService: Status inválido para cancelamento: ${pagamento.status_pagamento_banco}`);
        throw new Error("STATUS_INVALIDO_CANCELAMENTO");
      }

      console.log(`[DEBUG] CancelarCheckoutPixService: Atualizando o status do pagamento para CANCELADO`);

      console.log(`[DEBUG] CancelarCheckoutPixService: Chamando liberarBilhetesNaTransacao. reterReserva=${reterReserva}, numRifas=${pagamento.numeros_rifas?.length}`);
      // Libera as rifas primeiro, pois faz leitura (getAll)
      await liberarBilhetesNaTransacao(
        transaction,
        db,
        FieldValue.delete(),
        pagamento.numeros_rifas || [],
        "cancelled",
        "Cancelado pelo usuário.",
        reterReserva,
        undefined,
        pagamento.reference_id
      );

      console.log(`[DEBUG] CancelarCheckoutPixService: liberarBilhetesNaTransacao concluído com sucesso.`);

      // Prepara os bilhetes para reverter (já feito acima)

      // Cancela o pagamento (apenas escrita agora)
      transaction.update(pagamentoRef, {
        status_pagamento_banco: "cancelled",
        erro_criacao: "Cancelado pelo usuário.",
      });

      // Removemos a exclusão do lockRef (idempotency_key) aqui para evitar deadlocks 
      // entre transações de cancelamento concorrendo com transações de criação.
      // O lock antigo será ignorado/sobrescrito naturalmente pela criação se o status do pagamento não for ativo.

      orderIdParaCancelar = pagamento.pix_order_id || "";
    });

    console.log(`[DEBUG] CancelarCheckoutPixService: Transação concluída com sucesso.`);

    // Fora da transação, tenta cancelar no Mercado Pago se houver orderId
    if (orderIdParaCancelar) {
      try {
        await MercadoPagoPixClient.cancelarPedidoPix(orderIdParaCancelar);
      } catch (error) {
        console.warn(`[CancelarCheckoutPixService] Erro ao cancelar no Mercado Pago (Order ${orderIdParaCancelar}):`, error);
        // Não quebramos o fluxo porque o banco de dados já foi revertido localmente.
      }
    }
  }
}
