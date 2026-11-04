// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/controllers/obterMeuRelatorioVendasController.ts
// ============================================================================
import { Response } from "express";

import { AuthRequest } from "../../../shared/middlewares/authMiddleware";
import { RifasService } from "../rifasService";

/**
 * Controller responsável por obter e retornar o relatório de vendas consolidado do aderido autenticado.
 *
 * @param {AuthRequest} req - Requisição contendo o usuário autenticado via token JWT.
 * @param {Response} res - Resposta HTTP Express com o relatório de vendas ou mensagem de erro.
 * @returns {Promise<Response>} Retorna status 200 com o DTO do relatório, 401 se não autenticado, 404 se não encontrado ou 500 em erro interno.
 */
export async function obterMeuRelatorioVendas(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const relatorio = await RifasService.obterRelatorioVendas(req.user.email);

    return res.status(200).json(relatorio);
  } catch (error: any) {
    if (error.message === "USER_NOT_FOUND") {
      return res
        .status(404)
        .json({ error: "Você não está na lista de aderidos oficiais." });
    }

    console.error("[RifasController] Erro ao obter relatório de vendas:", error);

    return res
      .status(500)
      .json({ error: "Erro interno ao obter relatório de vendas." });
  }
}
