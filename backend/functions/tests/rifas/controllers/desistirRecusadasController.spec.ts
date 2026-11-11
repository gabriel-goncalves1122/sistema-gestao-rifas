// ============================================================================
// ARQUIVO: backend/functions/tests/rifas/controllers/desistirRecusadasController.spec.ts
// ============================================================================
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Response } from "express";

import { AuthRequest } from "../../../src/shared/middlewares/authMiddleware";
import { criarReqResRifasController } from "../helpers/criarReqResRifasController";

const mockDesistirRifasRecusadas = jest.fn<any>();

jest.mock("../../../src/modules/rifas/rifasService", () => ({
  RifasService: {
    desistirRifasRecusadas: mockDesistirRifasRecusadas,
  },
}));

import { desistirRecusadas } from "../../../src/modules/rifas/controllers/desistirRecusadasController";

describe("Controller: desistirRecusadas", () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    const contexto = criarReqResRifasController();
    req = contexto.req;
    res = contexto.res;
  });

  it("Deve retornar 401 se o usuário não tiver e-mail no token", async () => {
    req.user = { uid: "user_123" } as any;

    await desistirRecusadas(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Utilizador não autenticado.",
    });
  });

  it("Deve retornar 400 se a lista de rifas for vazia ou inválida", async () => {
    req.body = {
      numerosRifas: [],
    };

    await desistirRecusadas(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Informe a lista de rifas para desistência.",
    });
  });

  it("Deve retornar 404 se o usuário não for aderido oficial", async () => {
    req.body = {
      numerosRifas: ["010"],
    };

    mockDesistirRifasRecusadas.mockRejectedValueOnce(
      new Error("USER_NOT_FOUND"),
    );

    await desistirRecusadas(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Você não está na lista de aderidos oficiais.",
    });
  });

  it("Deve chamar o serviço e retornar 200 em caso de sucesso", async () => {
    req.body = {
      numerosRifas: ["010", "011"],
    };

    mockDesistirRifasRecusadas.mockResolvedValueOnce(true);

    await desistirRecusadas(req as AuthRequest, res as Response);

    expect(mockDesistirRifasRecusadas).toHaveBeenCalledWith(
      "teste@teste.com",
      ["010", "011"],
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      sucesso: true,
      mensagem: "Venda cancelada e rifas liberadas com sucesso!",
    });
  });

  it("Deve retornar 500 em caso de erro inesperado no serviço", async () => {
    req.body = {
      numerosRifas: ["010"],
    };

    mockDesistirRifasRecusadas.mockRejectedValueOnce(
      new Error("Erro de infraestrutura"),
    );

    await desistirRecusadas(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Erro ao desistir de rifas recusadas.",
    });
  });
});
