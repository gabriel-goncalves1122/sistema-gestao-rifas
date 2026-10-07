import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

import { PagamentoPix } from "../../types/models";
import {
  extrairPagoEmMercadoPago,
  extrairStatusPagamentoMercadoPago,
  extrairValorPagoReaisMercadoPago,
  liberarBilhetesNaTransacao,
} from "./checkoutPixHelper";

function obterMotivoFalhaBanco(payload: any) {
  return payload?.status_detail || "Pagamento não confirmado pelo banco.";
}

export async function aprovarOuRejeitarPixNoFirestore(
  db: admin.firestore.Firestore,
  payload: any
) {
  const orderId = String(payload.id).trim();

  const statusBanco = extrairStatusPagamentoMercadoPago(payload);
  const pagoEm = extrairPagoEmMercadoPago(payload);
  const valorPago = extrairValorPagoReaisMercadoPago(payload);

  return await db.runTransaction(async (transaction) => {
    // Inicia transação

    // 1. Busca do pagamento (query) DENTRO da transação
    let querySnap = await transaction.get(
      db.collection("pagamentos_pix").where("pix_order_id", "==", orderId).limit(1)
    );

    if (querySnap.empty && payload.external_reference) {
      // Fallback: o webhook pode chegar antes de a API salvar o pix_order_id.
      // Nesse caso procuramos pela referência externa (reference_id).
      querySnap = await transaction.get(
        db.collection("pagamentos_pix").where("reference_id", "==", String(payload.external_reference)).limit(1)
      );
    }

    if (querySnap.empty) {
      // Pagamento não encontrado
      throw new Error("PAGAMENTO_NOT_FOUND");
    }

    const pagamentoRef = querySnap.docs[0].ref;
    const pagamento = querySnap.docs[0].data() as PagamentoPix;
    // Atualiza apenas se o status mudar

    if (pagamento.status_pagamento_banco === statusBanco) {
      transaction.set(pagamentoRef, { raw_mercadopago: payload }, { merge: true });

      return {
        sucesso: true,
        idempotente: true,
        status: statusBanco,
      };
    }

    const dadosPagamento: Partial<PagamentoPix> = {
      pix_order_id: String(payload?.id || pagamento.pix_order_id || pagamento.id),
      status_pagamento_banco: statusBanco,
      valor_pago: valorPago || pagamento.valor_pago || 0,
      data_pagamento: pagoEm || pagamento.data_pagamento || null,
      raw_mercadopago: payload,
    };

    const jaValidadoManualmente =
      pagamento.status_validacao === "aceita" || pagamento.status_validacao === "negada";

    if (!jaValidadoManualmente) {
      if (["approved", "authorized", "paid"].includes(statusBanco)) {
        const refs = pagamento.numeros_rifas.map(n => db.collection("bilhetes").doc(n));
        let bilhetesAtualizados = 0;
        
        if (refs.length > 0) {
          const bilhetesSnaps = await transaction.getAll(...refs);
          
          bilhetesSnaps.forEach((snap) => {
            if (!snap.exists) return;
            const bilhete = snap.data();
            
            if (pagamento.reference_id && bilhete?.pix_reference_id !== pagamento.reference_id) {
              return; // Bilhete já foi liberado ou pertence a outra transação
            }

            bilhetesAtualizados++;

            transaction.set(
              snap.ref,
              {
                status: "pendente",
                status_pagamento_banco: statusBanco,
                status_validacao: null,
                valor_pago:
                  pagamento.numeros_rifas.length > 0
                    ? (valorPago || pagamento.valor_bruto) /
                      pagamento.numeros_rifas.length
                    : 0,
                data_pagamento: pagoEm || new Date().toISOString(),
                pix_order_id: orderId,
              },
              { merge: true },
            );
          });
        }

        // Se nenhum bilhete foi atualizado, significa que o pagamento caiu no "limbo"
        // (webhook aprovou após a expiração e liberação dos bilhetes).
        if (refs.length > 0 && bilhetesAtualizados === 0) {
          dadosPagamento.necessita_reembolso = true;
          dadosPagamento.observacao_reembolso = "Pagamento recebido durante ou após cancelamento automático/expiração. Os bilhetes já haviam sido liberados.";
        }
      }

      if (["rejected", "cancelled", "canceled", "refunded"].includes(statusBanco)) {
        const motivo = obterMotivoFalhaBanco(payload);

        // Usar helper para liberar os bilhetes, limpando os dados com delete()
        await liberarBilhetesNaTransacao(
          transaction,
          db,
          FieldValue.delete(),
          pagamento.numeros_rifas || [],
          statusBanco,
          motivo,
          false,
          undefined,
          pagamento.reference_id // Guarda de posse
        );

        if (pagamento.vendedor_id) {
          const notificacaoRef = db.collection("notificacoes").doc();
          transaction.set(notificacaoRef, {
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

    transaction.set(pagamentoRef, dadosPagamento, { merge: true });

    return {
      sucesso: true,
      idempotente: jaValidadoManualmente,
      status: statusBanco,
      mensagem: jaValidadoManualmente
        ? "Webhook alterou apenas dados bancários pois o pagamento já foi validado pela tesouraria."
        : undefined,
    };
  });
}
