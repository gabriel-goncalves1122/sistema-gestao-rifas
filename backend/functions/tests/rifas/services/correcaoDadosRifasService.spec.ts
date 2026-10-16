import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockTransactionUpdate = jest.fn<any>();
const mockTransactionGet = jest.fn<any>();
const mockRunTransaction = jest.fn<any>();
const mockObterContextoAderidoPorEmail = jest.fn<any>();

jest.mock("firebase-admin", () => ({
  firestore: jest.fn().mockReturnValue({
    collection: jest.fn((nome: string) => {
      if (nome === "bilhetes") {
        return {
          doc: (id: string) => ({ id }),
        };
      }

      return { doc: (id: string) => ({ id }) };
    }),
    runTransaction: mockRunTransaction,
  }),
}));

jest.mock("../../../src/modules/rifas/helpers/usuarioRifasHelper", () => ({
  obterContextoAderidoPorEmail: mockObterContextoAderidoPorEmail,
}));

import { CorrecaoDadosRifasService } from "../../../src/modules/rifas/services/correcaoDadosRifasService";

describe("Service: CorrecaoDadosRifasService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockObterContextoAderidoPorEmail.mockResolvedValue({
      idAderido: "ADERIDO_001",
    });

    mockRunTransaction.mockImplementation(async (callback: any) => {
      return callback({
        get: mockTransactionGet,
        update: mockTransactionUpdate,
        getAll: jest.fn(async (...refs: any[]) => {
          return Promise.all(
            refs.map(async (r: any) => {
              const snap = await mockTransactionGet(r);
              return { ...snap, ref: r };
            })
          );
        }),
      });
    });
  });

  it("Deve validar dados obrigatórios", async () => {
    await expect(
      CorrecaoDadosRifasService.corrigirDadosRifasRecusadas(
        "aderido@teste.com",
        [],
        { nome: "", telefone: "" },
      ),
    ).rejects.toThrow("INVALID_DATA");

    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("Deve corrigir rifa recusada do aderido logado", async () => {
    mockTransactionGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        numero: "001",
        vendedor_id: "ADERIDO_001",
        status: "recusado",
        status_pagamento_banco: "PAID",
      }),
    });

    const sucesso = await CorrecaoDadosRifasService.corrigirDadosRifasRecusadas(
      "aderido@teste.com",
      ["001"],
      {
        nome: "Comprador Corrigido",
        email: "comprador@teste.com",
        telefone: "35999990000",
      },
    );

    expect(sucesso).toBe(true);
    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "001" }),
      expect.objectContaining({
        status: "pendente",
        comprador_nome: "Comprador Corrigido",
        comprador_telefone: "35999990000",
        comprador_email: "comprador@teste.com",
        status_validacao: null,
        motivo_recusa: null,
        correcao_pendente: null,
      }),
    );
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  it("Deve rejeitar rifa de outro aderido", async () => {
    mockTransactionGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        numero: "001",
        vendedor_id: "ADERIDO_999",
        status: "recusado",
      }),
    });

    await expect(
      CorrecaoDadosRifasService.corrigirDadosRifasRecusadas(
        "aderido@teste.com",
        ["001"],
        { nome: "Comprador", telefone: "35999990000" },
      ),
    ).rejects.toThrow("RIFAS_NOT_FOUND");

    expect(mockTransactionUpdate).not.toHaveBeenCalled();
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  it("Deve rejeitar rifa que não está recusada e não tem correção pendente", async () => {
    mockTransactionGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        numero: "001",
        vendedor_id: "ADERIDO_001",
        status: "pendente", // sem correcao_pendente
      }),
    });

    await expect(
      CorrecaoDadosRifasService.corrigirDadosRifasRecusadas(
        "aderido@teste.com",
        ["001"],
        { nome: "Comprador", telefone: "35999990000" },
      ),
    ).rejects.toThrow("RIFAS_NOT_FOUND");
  });

  it("Deve corrigir rifa paga com correcao_pendente preservando o status pago e sincronizando compradores", async () => {
    mockTransactionGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        numero: "001",
        vendedor_id: "ADERIDO_001",
        comprador_id: "COMP_123",
        status: "pago",
        correcao_pendente: true,
      }),
    });

    const sucesso = await CorrecaoDadosRifasService.corrigirDadosRifasRecusadas(
      "aderido@teste.com",
      ["001"],
      {
        nome: "Comprador Corrigido",
        email: "comprador@teste.com",
        telefone: "35999990000",
      },
    );

    expect(sucesso).toBe(true);
    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "001" }),
      {
        comprador_nome: "Comprador Corrigido",
        comprador_telefone: "35999990000",
        comprador_email: "comprador@teste.com",
        motivo_recusa: null,
        correcao_pendente: null,
      },
    );
    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "COMP_123" }),
      {
        nome: "Comprador Corrigido",
        telefone: "35999990000",
        email: "comprador@teste.com",
      },
    );
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });
});
