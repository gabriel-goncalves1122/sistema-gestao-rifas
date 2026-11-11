// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/controllers/negarPixTransacaoController.ts
// ============================================================================
import { Response } from "express";

import { AuthRequest } from "../../../shared/middlewares/authMiddleware";
import { TesourariaService } from "../tesourariaService";

export async function negarPixTransacao(req: AuthRequest, res: Response) {
  try {
    const transacaoId = String(req.params.transacaoId || "").trim();
    const motivo = String(req.body?.motivo || "").trim();
    const chaveAcao = req.body?.chaveAcao ? String(req.body.chaveAcao).trim() : undefined;

    if (!transacaoId && !chaveAcao) {
      return res.status(400).json({ error: "ID da transação inválido." });
    }

    const resultado = await TesourariaService.negarPixTransacao({
      transacaoId,
      chaveAcao,
      uidTesouraria: req.user?.uid || "",
      emailTesouraria: req.user?.email,
      motivo,
    });

    return res.status(200).json(resultado);
  } catch (error: any) {
    if (error.message === "MOTIVO_REQUIRED") {
      return res.status(400).json({ error: "Motivo da negativa é obrigatório." });
    }

    if (error.message === "TRANSACAO_NOT_FOUND") {
      return res.status(404).json({ error: "Transação Pix não encontrada." });
    }

    if (error.message === "PIX_NOT_CONFIRMED") {
      return res.status(409).json({
        error: "A transação ainda não foi confirmada pelo banco.",
      });
    }

    if (error.message === "PIX_ALREADY_VALIDATED") {
      return res.status(409).json({ error: "Transação Pix já validada." });
    }

    if (error.message === "TRANSACAO_SEM_RIFAS") {
      return res.status(422).json({ error: "Transação sem rifas vinculadas." });
    }

    console.error("[TesourariaController] Erro ao negar Pix:", error);

    return res.status(500).json({ error: "Erro ao negar transação Pix." });
  }
}

