// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/controllers/negarLotePixTransacoesController.ts
// ============================================================================
import { Response } from "express";

import { AuthRequest } from "../../../shared/middlewares/authMiddleware";
import { TesourariaService } from "../tesourariaService";

export async function negarLotePixTransacoes(req: AuthRequest, res: Response) {
  try {
    const transacoes = Array.isArray(req.body?.transacoes) ? req.body.transacoes : [];
    const motivo = String(req.body?.motivo || "").trim();

    if (transacoes.length === 0) {
      return res.status(400).json({ error: "Nenhuma transação informada para recusa." });
    }

    if (!motivo) {
      return res.status(400).json({ error: "Motivo da recusa é obrigatório." });
    }

    const resultado = await TesourariaService.negarLotePixTransacoes({
      transacoes,
      uidTesouraria: req.user?.uid || "",
      emailTesouraria: req.user?.email,
      motivo,
    });

    return res.status(200).json(resultado);
  } catch (error: any) {
    if (error.message === "MOTIVO_REQUIRED") {
      return res.status(400).json({ error: "Motivo da recusa é obrigatório." });
    }

    console.error("[TesourariaController] Erro ao negar transações em lote:", error);
    return res.status(500).json({ error: "Erro ao negar transações em lote." });
  }
}
