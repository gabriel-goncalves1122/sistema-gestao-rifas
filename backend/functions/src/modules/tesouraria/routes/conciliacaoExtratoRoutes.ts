/**
 * Rotas da conciliação bancária por extrato da Tesouraria.
 *
 * @module conciliacaoExtratoRoutes
 */
import { Router } from "express";

import {
  requireTesourariaOrAdmin,
  validateToken,
} from "../../../shared/middlewares/authMiddleware";
import { validate } from "../../../shared/middlewares/validate";
import {
  analisarExtratoController,
  aprovarLoteConciliacaoController,
} from "../controllers/conciliacaoExtratoController";
import {
  analisarExtratoSchema,
  aprovarLoteConciliacaoSchema,
} from "../schemas/conciliacaoExtratoSchema";

const conciliacaoExtratoRoutes = Router();

conciliacaoExtratoRoutes.post(
  "/conciliacao/analisar",
  validateToken,
  requireTesourariaOrAdmin,
  validate(analisarExtratoSchema),
  analisarExtratoController,
);

conciliacaoExtratoRoutes.post(
  "/conciliacao/aprovar-lote",
  validateToken,
  requireTesourariaOrAdmin,
  validate(aprovarLoteConciliacaoSchema),
  aprovarLoteConciliacaoController,
);

export default conciliacaoExtratoRoutes;
