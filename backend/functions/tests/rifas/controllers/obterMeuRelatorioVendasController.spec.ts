// ============================================================================
// ARQUIVO: backend/functions/tests/rifas/controllers/obterMeuRelatorioVendasController.spec.ts
// ============================================================================
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Response } from "express";

import { AuthRequest } from "../../../src/shared/middlewares/authMiddleware";
import { criarReqResRifasController } from "../helpers/criarReqResRifasController";

const mockObterRelatorioVendas = jest.fn<any>();

jest.mock("../../../src/modules/rifas/rifasService", () => ({
  RifasService: {
    obterRelatorioVendas: mockObterRelatorioVendas,
  },
}));

import { obterMeuRelatorioVendas } from "../../../src/modules/rifas/controllers/obterMeuRelatorioVendasController";

describe("Controller: obterMeuRelatorioVendas", () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    const contexto = criarReqResRifasController();
    req = contexto.req;
    res = contexto.res;
  });

  it("Deve retornar 401 se o usuário não estiver autenticado", async () => {
    req.user = undefined;

    await obterMeuRelatorioVendas(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Usuário não autenticado.",
    });
  });

  it("Deve retornar 404 se o usuário não for aderido oficial", async () => {
    mockObterRelatorioVendas.mockRejectedValueOnce(new Error("USER_NOT_FOUND"));

    await obterMeuRelatorioVendas(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Você não está na lista de aderidos oficiais.",
    });
  });

  it("Deve retornar 200 com o relatório em caso de sucesso", async () => {
    const mockRelatorio = {
      aderido: { nome: "Aderido Teste", email: "teste@teste.com" },
      geradoEm: "2026-11-04T10:00:00Z",
      resumo: {
        totalRifasLote: 25,
        totalVendidas: 10,
        rifasPagas: 8,
        valorPagoConfirmado: 80,
        rifasEmAnalise: 2,
        valorEmAnalise: 20,
        rifasDisponiveis: 15,
        valorTotalNegociado: 100,
      },
      itens: [],
    };

    mockObterRelatorioVendas.mockResolvedValueOnce(mockRelatorio);

    await obterMeuRelatorioVendas(req as AuthRequest, res as Response);

    expect(mockObterRelatorioVendas).toHaveBeenCalledWith("teste@teste.com");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockRelatorio);
  });

  it("Deve retornar 500 se ocorrer erro inesperado", async () => {
    mockObterRelatorioVendas.mockRejectedValueOnce(new Error("Falha inesperada no banco"));

    await obterMeuRelatorioVendas(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Erro interno ao obter relatório de vendas.",
    });
  });
});
