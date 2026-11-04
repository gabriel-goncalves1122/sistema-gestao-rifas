// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/routes/minhasRifasRoutes.ts
// ============================================================================
import { Router } from "express";

import { validateToken } from "../../../shared/middlewares/authMiddleware";
import { rifasController } from "../rifasController";

const minhasRifasRoutes = Router();

// GET /rifas/minhas-rifas
// Retorna os bilhetes vinculados ao aderido autenticado.
minhasRifasRoutes.get(
  "/minhas-rifas",
  validateToken,
  rifasController.getMinhasRifas,
);

// GET /rifas/meu-relatorio
// Retorna o relatório consolidado de vendas do aderido autenticado.
minhasRifasRoutes.get(
  "/meu-relatorio",
  validateToken,
  rifasController.obterMeuRelatorioVendas,
);

// GET /rifas/minhas-rifas/relatorio (alias de conveniência)
minhasRifasRoutes.get(
  "/minhas-rifas/relatorio",
  validateToken,
  rifasController.obterMeuRelatorioVendas,
);

export default minhasRifasRoutes;
