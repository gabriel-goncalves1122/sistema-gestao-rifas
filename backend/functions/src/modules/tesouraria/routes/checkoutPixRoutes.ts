// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/routes/checkoutPixRoutes.ts
// ============================================================================
import { Router } from "express";

import { validateToken } from "../../../shared/middlewares/authMiddleware";
import { validate } from "../../../shared/middlewares/validate";
import { criarCheckoutPix } from "../controllers/criarCheckoutPixController";
import { receberWebhookCheckoutPix } from "../controllers/receberWebhookCheckoutPixController";
import { simularPagamentoPix } from "../controllers/simularPagamentoPixController";
import { cancelarCheckoutPix } from "../controllers/cancelarCheckoutPixController";
import { confirmarEnvioCheckoutPix } from "../controllers/confirmarEnvioCheckoutPixController";
import { checkoutPixSchema } from "../schemas/checkoutPixSchema";
import { confirmarEnvioCheckoutPixSchema } from "../schemas/confirmarEnvioCheckoutPixSchema";

const checkoutPixRoutes = Router();

checkoutPixRoutes.post(
  "/checkout/pix",
  validateToken,
  validate(checkoutPixSchema),
  criarCheckoutPix,
);

checkoutPixRoutes.post(
  "/checkout/pix/webhook",
  receberWebhookCheckoutPix,
);

checkoutPixRoutes.post(
  "/checkout/pix/:id/simular-pagamento",
  validateToken,
  simularPagamentoPix,
);

checkoutPixRoutes.post(
  "/checkout/pix/:id/cancelar",
  validateToken,
  cancelarCheckoutPix,
);

checkoutPixRoutes.post(
  "/checkout/pix/:id/confirmar-envio",
  validateToken,
  validate(confirmarEnvioCheckoutPixSchema),
  confirmarEnvioCheckoutPix,
);

export default checkoutPixRoutes;
