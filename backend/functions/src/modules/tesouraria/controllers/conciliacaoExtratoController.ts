/**
 * Controladores Express para os endpoints de conciliação automática por extrato.
 *
 * @module conciliacaoExtratoController
 */
import { Response } from "express";

import { AuthRequest } from "../../../shared/middlewares/authMiddleware";
import { ConciliacaoExtratoService } from "../services/conciliacaoExtratoService";

export async function analisarExtratoController(
  req: AuthRequest,
  res: Response,
) {
  try {
    const { conteudoArquivo, nomeArquivo } = req.body;

    const resultado = await ConciliacaoExtratoService.analisarExtrato(
      conteudoArquivo,
      nomeArquivo,
    );

    return res.status(200).json(resultado);
  } catch (error: any) {
    console.error("[ConciliacaoExtratoController] Erro ao analisar extrato:", error);
    return res.status(500).json({
      error: "Erro ao analisar extrato bancário.",
      detalhes: error?.message,
    });
  }
}

export async function aprovarLoteConciliacaoController(
  req: AuthRequest,
  res: Response,
) {
  try {
    const { itens } = req.body;
    const uid = req.user?.uid || "";
    const email = req.user?.email;

    const resultado = await ConciliacaoExtratoService.aprovarLoteConciliacao(
      itens,
      uid,
      email,
    );

    return res.status(200).json(resultado);
  } catch (error: any) {
    console.error("[ConciliacaoExtratoController] Erro ao aprovar lote:", error);
    return res.status(500).json({
      error: "Erro ao aprovar lote de conciliação.",
      detalhes: error?.message,
    });
  }
}
