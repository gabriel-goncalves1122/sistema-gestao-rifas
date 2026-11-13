// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/routes/pixTransacoesRoutes.ts
// ============================================================================
import { Router } from "express";

import {
  requireTesourariaOrAdmin,
  validateToken,
} from "../../../shared/middlewares/authMiddleware";
import { tesourariaController } from "../tesourariaController";
import { validate } from "../../../shared/middlewares/validate";
import {
  aceitarLotePixSchema,
  aceitarPixSchema,
  negarLotePixSchema,
  negarPixSchema,
  reanalisarOcrTransacaoSchema,
} from "../schemas/pixTransacoesSchema";

const pixTransacoesRoutes = Router();

pixTransacoesRoutes.get(
  "/transacoes-bancarias",
  validateToken,
  requireTesourariaOrAdmin,
  tesourariaController.listarPixTransacoes,
);

pixTransacoesRoutes.get(
  "/transacoes-bancarias/resumo",
  validateToken,
  requireTesourariaOrAdmin,
  tesourariaController.obterPixTransacoesResumo,
);

pixTransacoesRoutes.post(
  "/transacoes-bancarias/sincronizar",
  validateToken,
  requireTesourariaOrAdmin,
  tesourariaController.sincronizarPixTransacoes,
);

pixTransacoesRoutes.post(
  "/transacoes-bancarias/aceitar-lote",
  validateToken,
  requireTesourariaOrAdmin,
  validate(aceitarLotePixSchema),
  tesourariaController.aceitarLotePixTransacoes,
);

pixTransacoesRoutes.post(
  "/transacoes-bancarias/negar-lote",
  validateToken,
  requireTesourariaOrAdmin,
  validate(negarLotePixSchema),
  tesourariaController.negarLotePixTransacoes,
);

pixTransacoesRoutes.post(
  "/transacoes-bancarias/:transacaoId/aceitar",
  validateToken,
  requireTesourariaOrAdmin,
  validate(aceitarPixSchema),
  tesourariaController.aceitarPixTransacao,
);

pixTransacoesRoutes.post(
  "/transacoes-bancarias/:transacaoId/negar",
  validateToken,
  requireTesourariaOrAdmin,
  validate(negarPixSchema),
  tesourariaController.negarPixTransacao,
);

pixTransacoesRoutes.post(
  "/transacoes-bancarias/:transacaoId/reanalisar-ocr",
  validateToken,
  requireTesourariaOrAdmin,
  validate(reanalisarOcrTransacaoSchema),
  tesourariaController.reanalisarOcrTransacao,
);

export default pixTransacoesRoutes;
