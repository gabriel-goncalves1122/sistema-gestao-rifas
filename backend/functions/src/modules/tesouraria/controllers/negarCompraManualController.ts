// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/controllers/negarCompraManualController.ts
// ============================================================================
import { Response } from "express";

import { AuthRequest } from "../../../shared/middlewares/authMiddleware";
import { ComprasManuaisService } from "../services/comprasManuaisService";

export async function negarCompraManual(req: AuthRequest, res: Response) {
  try {
    const chave = String(req.params.chave || "").trim();
    const motivo = String(req.body.motivo || "").trim();

    if (!chave) {
      return res.status(400).json({ error: "Chave da transação inválida." });
    }

    if (!motivo) {
      return res.status(400).json({ error: "O motivo da recusa é obrigatório." });
    }

    const resultado = await ComprasManuaisService.negarCompra({
      chave,
      uidTesouraria: req.user?.uid || "",
      emailTesouraria: req.user?.email,
      motivo,
    });

    return res.status(200).json(resultado);
  } catch (error: any) {
    if (error.message === "COMPRA_NOT_FOUND") {
      return res.status(404).json({ error: "Compra não encontrada." });
    }

    if (error.message === "TRANSACAO_SEM_RIFAS_VALIDAS") {
      return res.status(409).json({ error: "Nenhuma rifa válida para recusar nesta compra." });
    }

    if (error.message === "PIX_ALREADY_VALIDATED") {
      return res.status(409).json({ error: "Transação já validada." });
    }

    if (error.message === "CHAVE_INVALIDA") {
      return res.status(400).json({ error: "Formato de chave de agrupamento inválido." });
    }

    console.error("[TesourariaController] Erro ao negar compra:", error);

    return res.status(500).json({ error: "Erro ao recusar compra." });
  }
}
