import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as admin from "firebase-admin";

const mockGet = jest.fn<any>();
const mockSet = jest.fn<any>();
const mockUpdate = jest.fn<any>();
const mockRunTransaction = jest.fn<any>();
const mockWhere = jest.fn<any>();

jest.mock("firebase-admin", () => {
  return {
    firestore: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        where: mockWhere.mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          id: "MOCK_NOTIF_ID",
          set: mockSet,
          update: mockUpdate,
        }),
      }),
      runTransaction: mockRunTransaction,
    }),
  };
});

import { NotificarCorrecaoDadosService } from "../../../src/modules/tesouraria/services/notificarCorrecaoDadosService";

describe("Service: NotificarCorrecaoDadosService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Deve lançar erro COMPRA_NAO_ENCONTRADA se não achar bilhetes", async () => {
    mockRunTransaction.mockImplementationOnce(async (cb: any) => {
      return cb({
        get: jest.fn().mockResolvedValue({ empty: true }),
      });
    });

    await expect(
      NotificarCorrecaoDadosService.notificar("COMP_123", "Por favor corrija seu CPF")
    ).rejects.toThrow("COMPRA_NAO_ENCONTRADA");
  });

  it("Deve lançar erro COMPRA_NAO_PAGA se algum bilhete não estiver pago", async () => {
    mockRunTransaction.mockImplementationOnce(async (cb: any) => {
      return cb({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [
            { id: "001", data: () => ({ status: "pago" }) },
            { id: "002", data: () => ({ status: "pendente" }) },
          ],
        }),
      });
    });

    await expect(
      NotificarCorrecaoDadosService.notificar("COMP_123", "msg")
    ).rejects.toThrow("COMPRA_NAO_PAGA");
  });

  it("Deve lançar erro VENDA_SEM_VENDEDOR se não achar id do vendedor nos bilhetes", async () => {
    mockRunTransaction.mockImplementationOnce(async (cb: any) => {
      return cb({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [
            { id: "001", data: () => ({ status: "pago" }) },
          ],
        }),
      });
    });

    await expect(
      NotificarCorrecaoDadosService.notificar("COMP_123", "msg")
    ).rejects.toThrow("VENDA_SEM_VENDEDOR");
  });

  it("Deve setar flag correcao_pendente, motivo_recusa e gerar notificacao usando fallback de doc.id se numero nao existir no body", async () => {
    const mockTransacao = {
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [
          { id: "002", data: () => ({ status: "pago", vendedor_id: "VEND_999" }), ref: "REF_002" },
          { id: "001", data: () => ({ status: "pago", vendedor_id: "VEND_999", numero: "001" }), ref: "REF_001" },
        ],
      }),
      update: mockUpdate,
      set: mockSet,
    };

    mockRunTransaction.mockImplementationOnce(async (cb: any) => {
      return cb(mockTransacao);
    });

    await NotificarCorrecaoDadosService.notificar("COMP_123", "Corrija os dados.");

    expect(mockTransacao.update).toHaveBeenCalledTimes(2);
    expect(mockTransacao.update).toHaveBeenCalledWith("REF_001", {
      correcao_pendente: true,
      motivo_recusa: "Corrija os dados.",
    });
    expect(mockTransacao.update).toHaveBeenCalledWith("REF_002", {
      correcao_pendente: true,
      motivo_recusa: "Corrija os dados.",
    });

    expect(mockTransacao.set).toHaveBeenCalledTimes(1);
    expect(mockTransacao.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        vendedor_id: "VEND_999",
        mensagem: "Corrija os dados.",
        rifas: ["001", "002"],
        tipo: "correcao_dados",
      })
    );
  });
});
