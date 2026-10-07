// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/routes/relatorioTesourariaRoutes.ts
// ============================================================================
import { Router } from "express";

import { validateToken, requireTesourariaOrAdmin } from "../../../shared/middlewares/authMiddleware";
import { tesourariaController } from "../tesourariaController";
import { atualizarCompradorCompraSchema } from "../schemas/relatorioTesourariaSchema";
import { validate } from "../../../shared/middlewares/validate";

const relatorioTesourariaRoutes = Router();

relatorioTesourariaRoutes.get(
  "/relatorio",
  validateToken,
  requireTesourariaOrAdmin,
  tesourariaController.obterRelatorioTesouraria,
);

relatorioTesourariaRoutes.get(
  "/historico",
  validateToken,
  requireTesourariaOrAdmin,
  tesourariaController.obterHistoricoTesouraria,
);

relatorioTesourariaRoutes.patch(
  "/historico/compras/:compradorId",
  validateToken,
  requireTesourariaOrAdmin,
  validate(atualizarCompradorCompraSchema),
  tesourariaController.atualizarCompradorCompra,
);

relatorioTesourariaRoutes.post(
  "/historico/compras/:compradorId/reenviar-email-comprovante",
  validateToken,
  requireTesourariaOrAdmin,
  tesourariaController.reenviarEmailComprovante,
);

relatorioTesourariaRoutes.post(
  "/historico/compras/:compradorId/notificar-correcao",
  validateToken,
  requireTesourariaOrAdmin,
  tesourariaController.notificarCorrecaoDados,
);

relatorioTesourariaRoutes.post(
  "/historico/compras/:chave/aceitar",
  validateToken,
  requireTesourariaOrAdmin,
  tesourariaController.aceitarCompraManual,
);

relatorioTesourariaRoutes.post(
  "/historico/compras/:chave/negar",
  validateToken,
  requireTesourariaOrAdmin,
  tesourariaController.negarCompraManual,
);

export default relatorioTesourariaRoutes;
