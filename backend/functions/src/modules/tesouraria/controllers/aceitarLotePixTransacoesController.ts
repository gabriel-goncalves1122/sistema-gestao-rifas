// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/controllers/aceitarLotePixTransacoesController.ts
// ============================================================================
import { Response } from "express";

import { AuthRequest } from "../../../shared/middlewares/authMiddleware";
import { TesourariaService } from "../tesourariaService";

export async function aceitarLotePixTransacoes(req: AuthRequest, res: Response) {
  try {
    const transacoes = Array.isArray(req.body?.transacoes) ? req.body.transacoes : [];

    if (transacoes.length === 0) {
      return res.status(400).json({ error: "Nenhuma transação informada para aprovação." });
    }

    const resultado = await TesourariaService.aceitarLotePixTransacoes({
      transacoes,
      uidTesouraria: req.user?.uid || "",
      emailTesouraria: req.user?.email,
    });

    return res.status(200).json(resultado);
  } catch (error: any) {
    console.error("[TesourariaController] Erro ao aceitar transações em lote:", error);
    return res.status(500).json({ error: "Erro ao aceitar transações em lote." });
  }
}
