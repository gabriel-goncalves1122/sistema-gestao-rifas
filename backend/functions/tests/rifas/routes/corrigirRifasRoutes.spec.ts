// ============================================================================
// ARQUIVO: backend/functions/tests/rifas/routes/corrigirRifasRoutes.spec.ts
// ============================================================================
import request from "supertest";
import { describe, expect, it, jest } from "@jest/globals";

import corrigirRifasRoutes from "../../../src/modules/rifas/routes/corrigirRifasRoutes";
import { criarAppRifasTeste } from "../helpers/criarAppRifasTeste";

jest.mock("../../../src/modules/rifas/rifasController", () => ({
  rifasController: {
    corrigirRecusadas: (_req: any, res: any) =>
      res.status(200).json({ acao: "corrigir_recusadas" }),
    corrigirDadosRifas: (_req: any, res: any) =>
      res.status(200).json({ acao: "corrigir_dados_rifas" }),
    desistirRecusadas: (_req: any, res: any) =>
      res.status(200).json({ acao: "desistir_recusadas" }),
  },
}));

jest.mock("../../../src/shared/middlewares/authMiddleware", () => ({
  validateToken: (_req: any, _res: any, next: any) => next(),
}));

describe("Rotas de correção de rifas", () => {
  it("POST /rifas/corrigir -> deve chamar corrigirRecusadas", async () => {
    const app = criarAppRifasTeste(corrigirRifasRoutes);

    const response = await request(app).post("/rifas/corrigir");

    expect(response.status).toBe(200);
    expect(response.body.acao).toBe("corrigir_recusadas");
  });

  it("POST /rifas/corrigir-dados -> deve chamar corrigirDadosRifas", async () => {
    const app = criarAppRifasTeste(corrigirRifasRoutes);

    const response = await request(app).post("/rifas/corrigir-dados");

    expect(response.status).toBe(200);
    expect(response.body.acao).toBe("corrigir_dados_rifas");
  });

  it("POST /rifas/desistir -> deve chamar desistirRecusadas", async () => {
    const app = criarAppRifasTeste(corrigirRifasRoutes);

    const response = await request(app).post("/rifas/desistir");

    expect(response.status).toBe(200);
    expect(response.body.acao).toBe("desistir_recusadas");
  });
});
