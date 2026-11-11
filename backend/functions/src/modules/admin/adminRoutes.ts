// ============================================================================
// ARQUIVO: backend/functions/src/modules/admin/adminRoutes.ts
// ============================================================================
import { Router } from "express";

import secretariaRoutes from "./secretaria/secretariaRoutes";
import compacRoutes from "./compac/compacRoutes";
import { sistemaController } from "../sistema/sistemaController";
import { atualizarManutencaoSchema } from "../sistema/sistemaSchemas";
import {
  requireAdmin,
  validateToken,
} from "../../shared/middlewares/authMiddleware";
import { validate } from "../../shared/middlewares/validate";

const router = Router();

// Rota administrativa para alternar o modo de manutenção
// Exemplo final: PUT /admin/manutencao
router.put(
  "/manutencao",
  validateToken,
  requireAdmin,
  validate(atualizarManutencaoSchema),
  sistemaController.atualizarManutencao,
);

// Agrega rotas administrativas da secretaria.
// Exemplo final: /admin/aderidos
router.use("/", secretariaRoutes);

// Agrega rotas administrativas de compactação.
// Exemplo final: /admin/compactar
router.use("/", compacRoutes);

export default router;
