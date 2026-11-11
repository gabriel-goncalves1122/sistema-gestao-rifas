// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/controllers/confirmarEnvioCheckoutPixController.ts
// ============================================================================

import { Response } from "express";

import { AuthRequest } from "../../../shared/middlewares/authMiddleware";
import { ConfirmarEnvioCheckoutPixService } from "../services/confirmarEnvioCheckoutPixService";

/**
 * Controller responsável por receber a confirmação de pagamento manual/contingencial
 * com vínculo de comprovante e transicionar o status dos bilhetes para análise da Tesouraria.
 *
 * @param {AuthRequest} req - Requisição autenticada contendo ID do pagamento nos parâmetros e URL do comprovante no body.
 * @param {Response} res - Resposta HTTP com confirmação da operação.
 */
export async function confirmarEnvioCheckoutPix(req: AuthRequest, res: Response) {
  try {
    const uid = req.user?.uid;
    const emailLogado = req.user?.email || "";
    const role = req.user?.role || req.user?.cargo || "";

    if (!uid || !emailLogado) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const id = String(req.params.id || "").trim();
    if (!id) {
      return res.status(400).json({ error: "ID do pagamento obrigatório." });
    }

    const comprovanteUrl = req.body?.comprovanteUrl ? String(req.body.comprovanteUrl).trim() : null;
    const hashComprovante = req.body?.hashComprovante ? String(req.body.hashComprovante).trim() : null;

    const resultado = await ConfirmarEnvioCheckoutPixService.executar({
      uid,
      emailLogado,
      role,
      pagamentoId: id,
      comprovanteUrl,
      hashComprovante,
    });

    return res.status(200).json({
      mensagem: "Comprovante enviado com sucesso! O pagamento está em análise pela Tesouraria.",
      ...resultado,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return res.status(403).json({ error: "Você não possui permissão para confirmar este pagamento." });
    }

    if (error.message === "PAGAMENTO_NOT_FOUND") {
      return res.status(404).json({ error: "Cobrança Pix não encontrada." });
    }

    if (error.message === "TRANSACAO_JA_FINALIZADA") {
      return res.status(400).json({ error: "Esta transação já foi processada e aprovada anteriormente." });
    }

    console.error("[ConfirmarEnvioCheckoutPixController] Erro:", error);
    return res.status(500).json({ error: "Falha interna ao confirmar o envio do pagamento." });
  }
}
