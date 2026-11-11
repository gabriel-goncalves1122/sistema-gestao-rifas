// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/services/confirmarEnvioCheckoutPixService.ts
// ============================================================================

import * as admin from "firebase-admin";

import { Bilhete, PagamentoPix } from "../../types/models";
import { obterContextoAderidoPorEmail } from "../../rifas/helpers/usuarioRifasHelper";
import { enviarEmailRecibo } from "../../rifas/emailService";

interface ConfirmarEnvioParams {
  uid: string;
  emailLogado: string;
  role?: string;
  pagamentoId: string;
  comprovanteUrl?: string | null;
  hashComprovante?: string | null;
}

export class ConfirmarEnvioCheckoutPixService {
  /**
   * Confirma atômica e transacionalmente o envio de comprovante / declaração de pagamento
   * de um checkout Pix em contingência ou offline.
   *
   * Transiciona os bilhetes de 'reservado' para 'pendente' (garantindo que não expirem)
   * e vincula a URL do comprovante para conferência pela Tesouraria.
   *
   * @param {ConfirmarEnvioParams} params - Dados do usuário autenticado, ID do pagamento e comprovante.
   * @returns {Promise<{ sucesso: boolean; pagamentoId: string; rifas: string[] }>}
   * @transactional Executa leitura e escrita atômica dentro de db.runTransaction com proteção TOCTOU.
   * @throws {Error} "UNAUTHORIZED", "PAGAMENTO_NOT_FOUND" ou "TRANSACAO_JA_FINALIZADA".
   */
  static async executar(params: ConfirmarEnvioParams): Promise<{
    sucesso: boolean;
    pagamentoId: string;
    rifas: string[];
  }> {
    const { uid, emailLogado, role, pagamentoId, comprovanteUrl, hashComprovante } = params;

    if (!uid || !emailLogado || !pagamentoId) {
      throw new Error("UNAUTHORIZED");
    }

    const db = admin.firestore();
    const contextoAderido = await obterContextoAderidoPorEmail(emailLogado);
    const pagamentoRef = db.collection("pagamentos_pix").doc(pagamentoId);

    const resultado = await db.runTransaction(async (transaction) => {
      const snapPagamento = await transaction.get(pagamentoRef);

      if (!snapPagamento.exists) {
        throw new Error("PAGAMENTO_NOT_FOUND");
      }

      const pagamento = snapPagamento.data() as PagamentoPix;

      // Garantia de segurança Cross-Seller: Apenas o aderido dono ou comissão pode confirmar
      const isDono = pagamento.vendedor_id === contextoAderido.idAderido;
      const isAdmin = ["admin", "presidencia", "tesouraria"].includes(role || "");

      if (!isDono && !isAdmin) {
        throw new Error("UNAUTHORIZED");
      }

      // Impede reverter transação já paga
      if (pagamento.status_pagamento_banco === "PAID" || pagamento.status_validacao === "aceita") {
        throw new Error("TRANSACAO_JA_FINALIZADA");
      }

      const numerosRifas = pagamento.numeros_rifas || [];
      const rifasRefs = numerosRifas.map((num) => db.collection("bilhetes").doc(num));

      const snapsRifas = await Promise.all(rifasRefs.map((ref) => transaction.get(ref)));

      for (const snap of snapsRifas) {
        if (!snap.exists) throw new Error("RIFA_NOT_FOUND");
      }

      const agora = new Date().toISOString();

      // Atualiza o documento central do pagamento
      transaction.set(
        pagamentoRef,
        {
          status_pagamento_banco: "IN_ANALYSIS",
          comprovante_url: comprovanteUrl || null,
          hash_comprovante: hashComprovante || null,
          atualizado_em: agora,
        },
        { merge: true },
      );

      // Transiciona cada bilhete para status 'pendente' com o comprovante vinculado
      rifasRefs.forEach((ref) => {
        const updateBilhete: Partial<Bilhete> & Record<string, any> = {
          status: "pendente",
          comprovante_url: comprovanteUrl || null,
          data_reserva: agora,
          status_pagamento_banco: "IN_ANALYSIS",
        };

        if (hashComprovante) {
          updateBilhete.hash_comprovante = hashComprovante;
        }

        transaction.set(ref, updateBilhete, { merge: true });
      });

      return {
        numerosRifas,
        compradorEmail: pagamento.comprador_email,
        compradorNome: pagamento.comprador_nome,
      };
    });

    // Envio de e-mail informativo assíncrono para o comprador
    if (resultado.compradorEmail) {
      enviarEmailRecibo(
        resultado.compradorEmail,
        resultado.compradorNome || "Comprador",
        resultado.numerosRifas,
        "pendente",
      ).catch((erro) => {
        console.warn("[ConfirmarEnvio] Falha ao disparar e-mail de recebimento:", erro);
      });
    }

    return {
      sucesso: true,
      pagamentoId,
      rifas: resultado.numerosRifas,
    };
  }
}
