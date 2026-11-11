// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/controllers/desistirRecusadasController.ts
// ============================================================================
import { Response } from "express";

import { AuthRequest } from "../../../shared/middlewares/authMiddleware";
import { RifasService } from "../rifasService";

/**
 * Controller para cancelar definitivamente uma venda recusada e liberar seus bilhetes para o estoque.
 *
 * @param {AuthRequest} req - Requisição autenticada contendo e-mail e array de números de rifas.
 * @param {Response} res - Resposta HTTP 200 em caso de sucesso.
 * @returns {Promise<Response>}
 */
export async function desistirRecusadas(
  req: AuthRequest,
  res: Response,
): Promise<any> {
  try {
    const emailLogado = req.user?.email;
    const { numerosRifas } = req.body;

    if (!emailLogado) {
      return res.status(401).json({ error: "Utilizador não autenticado." });
    }

    if (!numerosRifas || !Array.isArray(numerosRifas) || numerosRifas.length === 0) {
      return res
        .status(400)
        .json({ error: "Informe a lista de rifas para desistência." });
    }

    await RifasService.desistirRifasRecusadas(emailLogado, numerosRifas);

    return res.status(200).json({
      sucesso: true,
      mensagem: "Venda cancelada e rifas liberadas com sucesso!",
    });
  } catch (error: any) {
    if (error.message === "USER_NOT_FOUND") {
      return res
        .status(404)
        .json({ error: "Você não está na lista de aderidos oficiais." });
    }

    console.error("[DesistirRecusadasController] Erro:", error);
    return res.status(500).json({ error: "Erro ao desistir de rifas recusadas." });
  }
}
