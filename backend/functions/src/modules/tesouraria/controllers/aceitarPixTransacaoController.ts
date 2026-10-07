// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/controllers/aceitarPixTransacaoController.ts
// ============================================================================
import { Response } from "express";

import { AuthRequest } from "../../../shared/middlewares/authMiddleware";
import { TesourariaService } from "../tesourariaService";

export async function aceitarPixTransacao(req: AuthRequest, res: Response) {
  try {
    const transacaoId = String(req.params.transacaoId || "").trim();

    if (!transacaoId) {
      return res.status(400).json({ error: "ID da transação inválido." });
    }

    const resultado = await TesourariaService.aceitarPixTransacao({
      transacaoId,
      uidTesouraria: req.user?.uid || "",
      emailTesouraria: req.user?.email,
    });

    return res.status(200).json(resultado);
  } catch (error: any) {
    if (error.message === "TRANSACAO_NOT_FOUND") {
      return res.status(404).json({ error: "Transação Pix não encontrada." });
    }

    if (error.message === "PIX_ALREADY_VALIDATED") {
      return res.status(409).json({ error: "Transação Pix já validada." });
    }

    if (error.message === "TRANSACAO_SEM_RIFAS") {
      return res.status(422).json({ error: "Transação sem rifas vinculadas." });
    }

    console.error("[TesourariaController] Erro ao aceitar Pix:", error);

    return res.status(500).json({ error: "Erro ao aceitar transação Pix." });
  }
}

