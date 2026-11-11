// ============================================================================
// ARQUIVO: backend/functions/tests/admin/adminRoutes.spec.ts
// ============================================================================
import request from "supertest";
import express from "express";
import { jest, describe, beforeAll, it, expect } from "@jest/globals";

import adminRoutes from "../../src/modules/admin/adminRoutes";

jest.mock("../../src/modules/sistema/sistemaController", () => ({
  sistemaController: {
    atualizarManutencao: (_req: any, res: any) =>
      res.status(200).json({ success: true, mock: "manutencao" }),
  },
}));

jest.mock("../../src/modules/admin/secretaria/secretariaController", () => ({
  secretariaController: {
    listarAderidos: (_req: any, res: any) =>
      res.status(200).json([{ mock: "lista" }]),

    adicionarAderido: (_req: any, res: any) =>
      res.status(201).json({ mock: "aderido" }),

    atualizarAderido: (_req: any, res: any) =>
      res.status(200).json({ mock: "aderido-atualizado" }),
  },
}));

jest.mock("../../src/modules/admin/compac/compacController", () => ({
  compacController: {
    compactarArquivos: (_req: any, res: any) =>
      res.status(200).json({ mock: "compactar" }),
  },
}));

jest.mock("../../src/modules/admin/secretaria/documentos/documentosSecretariaController", () => ({
  documentosSecretariaController: {
    listar: (_req: any, res: any) => res.status(200).json([{ mock: "documentos" }]),
    criar: (_req: any, res: any) => res.status(201).json({ mock: "documento" }),
    atualizar: (_req: any, res: any) =>
      res.status(200).json({ mock: "documento-atualizado" }),
    conteudo: (_req: any, res: any) => res.status(200).send("arquivo"),
  },
}));

jest.mock("../../src/modules/admin/secretaria/documentos/documentosSecretariaMultipart", () => ({
  parseDocumentoSecretariaMultipart: () =>
    (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../../src/shared/middlewares/authMiddleware", () => ({
  validateToken: (_req: any, _res: any, next: any) => next(),
  requireTesourariaOrAdmin: (_req: any, _res: any, next: any) => next(),
  requireSecretariaOrAdmin: (_req: any, _res: any, next: any) => next(),
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../../src/shared/middlewares/validate", () => ({
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

describe("Rotas: /admin", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/admin", adminRoutes);
  });

  it("PUT /admin/manutencao deve chamar sistemaController.atualizarManutencao", async () => {
    const response = await request(app)
      .put("/admin/manutencao")
      .send({ emManutencao: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, mock: "manutencao" });
  });

  it("POST /admin/aderidos deve chamar secretariaController.adicionarAderido", async () => {
    const response = await request(app).post("/admin/aderidos");

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ mock: "aderido" });
  });

  it("PUT /admin/aderidos/:id deve chamar secretariaController.atualizarAderido", async () => {
    const response = await request(app).put("/admin/aderidos/ADERIDO_001");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ mock: "aderido-atualizado" });
  });

  it("POST /admin/compactar deve chamar compacController.compactarArquivos", async () => {
    const response = await request(app).post("/admin/compactar");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ mock: "compactar" });
  });

  it("GET /admin/documentos deve chamar documentosSecretariaController.listar", async () => {
    const response = await request(app).get("/admin/documentos");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ mock: "documentos" }]);
  });

  it("POST /admin/documentos deve chamar documentosSecretariaController.criar", async () => {
    const response = await request(app).post("/admin/documentos");

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ mock: "documento" });
  });

  it("GET /admin/documentos/:id/conteudo deve entregar o arquivo", async () => {
    const response = await request(app).get("/admin/documentos/doc-1/conteudo");

    expect(response.status).toBe(200);
    expect(response.text).toBe("arquivo");
  });

  it("GET /admin/compactar deve retornar 404 por método incorreto", async () => {
    const response = await request(app).get("/admin/compactar");

    expect(response.status).toBe(404);
  });
});
