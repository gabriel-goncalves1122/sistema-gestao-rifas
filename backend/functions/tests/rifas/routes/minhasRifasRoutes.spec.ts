// ============================================================================
// ARQUIVO: backend/functions/tests/rifas/routes/minhasRifasRoutes.spec.ts
// ============================================================================
import request from "supertest";
import { describe, expect, it, jest } from "@jest/globals";

import minhasRifasRoutes from "../../../src/modules/rifas/routes/minhasRifasRoutes";
import { criarAppRifasTeste } from "../helpers/criarAppRifasTeste";

jest.mock("../../../src/modules/rifas/rifasController", () => ({
  rifasController: {
    getMinhasRifas: (_req: any, res: any) =>
      res.status(200).json({ acao: "minhas_rifas" }),
    obterMeuRelatorioVendas: (_req: any, res: any) =>
      res.status(200).json({ acao: "meu_relatorio" }),
  },
}));

jest.mock("../../../src/shared/middlewares/authMiddleware", () => ({
  validateToken: (_req: any, _res: any, next: any) => next(),
}));

describe("Rotas de rifas do aderido", () => {
  it("GET /rifas/minhas-rifas -> deve chamar getMinhasRifas", async () => {
    const app = criarAppRifasTeste(minhasRifasRoutes);

    const response = await request(app).get("/rifas/minhas-rifas");

    expect(response.status).toBe(200);
    expect(response.body.acao).toBe("minhas_rifas");
  });

  it("GET /rifas/meu-relatorio -> deve chamar obterMeuRelatorioVendas", async () => {
    const app = criarAppRifasTeste(minhasRifasRoutes);

    const response = await request(app).get("/rifas/meu-relatorio");

    expect(response.status).toBe(200);
    expect(response.body.acao).toBe("meu_relatorio");
  });

  it("GET /rifas/minhas-rifas/relatorio -> deve chamar obterMeuRelatorioVendas", async () => {
    const app = criarAppRifasTeste(minhasRifasRoutes);

    const response = await request(app).get("/rifas/minhas-rifas/relatorio");

    expect(response.status).toBe(200);
    expect(response.body.acao).toBe("meu_relatorio");
  });
});
