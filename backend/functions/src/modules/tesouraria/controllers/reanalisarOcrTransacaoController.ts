// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/controllers/reanalisarOcrTransacaoController.ts
// ============================================================================
import { Response } from "express";

import { AuthRequest } from "../../../shared/middlewares/authMiddleware";
import { AnalisadorComprovanteService } from "../ocr/services/analisadorComprovanteService";

const analisadorComprovanteService = new AnalisadorComprovanteService();

/**
 * Reprocessa manualmente a análise de OCR e correlação de um comprovante Pix
 * a partir do identificador de transação da Tesouraria (`transacaoId`).
 *
 * @param {AuthRequest} req - Requisição Express autenticada com `params.transacaoId`.
 * @param {Response} res - Resposta Express retornando `{ analiseOcr }` em `camelCase`.
 * @returns {Promise<Response>} Resposta HTTP 200 com `AnaliseOcrDTO` ou erro mapeado (400/404/422/500).
 */
export async function reanalisarOcrTransacao(
  req: AuthRequest,
  res: Response,
): Promise<Response> {
  try {
    const transacaoId = String(req.params.transacaoId || "").trim();

    if (!transacaoId) {
      return res.status(400).json({ error: "ID da transação inválido." });
    }

    const analiseOcr =
      await analisadorComprovanteService.reanalisarPorTransacaoId(transacaoId);

    return res.status(200).json({ analiseOcr });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    if (message === "TRANSACAO_NAO_ENCONTRADA") {
      return res.status(404).json({ error: "Transação Pix não encontrada." });
    }

    if (message === "COMPROVANTE_AUSENTE") {
      return res
        .status(422)
        .json({ error: "Transação não possui comprovante anexado para OCR." });
    }

    console.error("[TesourariaController] Erro ao reanalisar OCR:", error);

    return res
      .status(500)
      .json({ error: "Erro ao reanalisar comprovante via OCR." });
  }
}
