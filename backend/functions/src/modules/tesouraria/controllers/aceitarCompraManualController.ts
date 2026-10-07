// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/controllers/aceitarCompraManualController.ts
// ============================================================================
import { Response } from "express";

import { AuthRequest } from "../../../shared/middlewares/authMiddleware";
import { ComprasManuaisService } from "../services/comprasManuaisService";

export async function aceitarCompraManual(req: AuthRequest, res: Response) {
  try {
    const chave = String(req.params.chave || "").trim();

    if (!chave) {
      return res.status(400).json({ error: "Chave da transação inválida." });
    }

    const resultado = await ComprasManuaisService.aceitarCompra({
      chave,
      uidTesouraria: req.user?.uid || "",
      emailTesouraria: req.user?.email,
    });

    return res.status(200).json(resultado);
  } catch (error: any) {
    if (error.message === "COMPRA_NOT_FOUND") {
      return res.status(404).json({ error: "Compra não encontrada." });
    }

    if (error.message === "TRANSACAO_SEM_RIFAS_PENDENTES") {
      return res.status(409).json({ error: "Nenhuma rifa pendente para aprovar nesta compra." });
    }

    if (error.message === "PIX_ALREADY_VALIDATED") {
      return res.status(409).json({ error: "Transação já validada." });
    }

    if (error.message === "CHAVE_INVALIDA") {
      return res.status(400).json({ error: "Formato de chave de agrupamento inválido." });
    }

    console.error("[TesourariaController] Erro ao aceitar compra:", error);

    return res.status(500).json({ error: "Erro ao aceitar compra." });
  }
}
