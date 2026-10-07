// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/controllers/receberWebhookCheckoutPixController.ts
// ============================================================================
import { Request, Response } from "express";

import { CheckoutPixWebhookService } from "../services/checkoutPixWebhookService";

interface RawBodyRequest extends Request {
  rawBody?: string;
}

export async function receberWebhookCheckoutPix(
  req: RawBodyRequest,
  res: Response,
) {
  try {
    // Debug logs removidos para produção

    const mergedPayload = { ...req.query, ...req.body };
    // Suporte para quando 'data.id' vem parseado como string literal no query params (Express)
    if (req.query?.["data.id"]) {
      mergedPayload.data = { ...(mergedPayload.data || {}), id: req.query["data.id"] };
    }

    const resultado = await CheckoutPixWebhookService.processarWebhook({
      payload: mergedPayload,
      rawBody: req.rawBody || JSON.stringify(req.body || {}),
      assinatura: String(req.headers?.["x-authenticity-token"] || ""),
    });

    return res.status(200).json(resultado);
  } catch (error: any) {
    if (error.message === "INVALID_SIGNATURE") {
      return res.status(401).json({ error: "Assinatura Pix inválida." });
    }

    if (error.message === "PAGAMENTO_NOT_FOUND") {
      return res.status(404).json({ error: "Pagamento Pix não encontrado." });
    }

    console.error("[RifasController] Erro no webhook Pix:", error);

    return res.status(500).json({ error: "Erro ao processar webhook Pix." });
  }
}
