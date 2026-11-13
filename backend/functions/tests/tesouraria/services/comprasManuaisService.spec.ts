// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/services/comprasManuaisService.spec.ts
// ============================================================================

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockSet = jest.fn<any>();
const mockRunTransaction = jest.fn<any>();

jest.mock("firebase-admin", () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      doc: jest.fn(() => ({ id: "NOTIF_ID" })),
    })),
    runTransaction: (...args: any[]) => mockRunTransaction(...args),
  })),
}));

jest.mock("../../../src/modules/rifas/emailService", () => ({
  enviarEmailRecibo: jest.fn<any>().mockResolvedValue(true),
}));

import { ComprasManuaisService } from "../../../src/modules/tesouraria/services/comprasManuaisService";

describe("Service: ComprasManuaisService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve aprovar compra manual por chave comprovante e enviar recibo", async () => {
    const mockTx = {
      get: jest.fn<any>().mockResolvedValueOnce({
        empty: false,
        forEach: (cb: any) =>
          cb({
            id: "001",
            ref: { id: "001" },
            data: () => ({
              status: "pendente",
              valor_bruto: 10,
              comprador_email: "maria@teste.com",
              comprador_nome: "Maria",
            }),
          }),
      }),
      set: mockSet,
    };
    mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTx));

    const res = await ComprasManuaisService.aceitarCompra({
      chave: "comprovante-https://storage/comp.jpg",
      uidTesouraria: "TES_1",
      emailTesouraria: "tes@unifei.edu.br",
    });

    expect(res).toEqual({
      sucesso: true,
      statusValidacao: "aceita",
      rifas: ["001"],
      atualizados: 1,
      emailEnviado: true,
    });
    expect(mockSet).toHaveBeenCalledWith(
      { id: "001" },
      expect.objectContaining({ status: "pago", status_validacao: "aceita" }),
      { merge: true },
    );
  });

  it("deve exigir motivo ao negar compra manual", async () => {
    await expect(
      ComprasManuaisService.negarCompra({
        chave: "comprador-COMP_1",
        uidTesouraria: "TES_1",
        motivo: "",
      }),
    ).rejects.toThrow("MOTIVO_REQUIRED");
  });

  it("deve negar compra manual gerando notificação ao vendedor", async () => {
    const mockTx = {
      get: jest.fn<any>().mockResolvedValueOnce({
        empty: false,
        forEach: (cb: any) =>
          cb({
            id: "010",
            ref: { id: "010" },
            data: () => ({
              status: "pendente",
              vendedor_id: "ADERIDO_001",
              status_pagamento_banco: "IN_ANALYSIS",
            }),
          }),
      }),
      set: mockSet,
    };
    mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTx));

    const res = await ComprasManuaisService.negarCompra({
      chave: "comprador-COMP_1",
      uidTesouraria: "TES_1",
      motivo: "Comprovante ilegível",
    });

    expect(res).toEqual({
      sucesso: true,
      statusValidacao: "negada",
      rifas: ["010"],
      atualizados: 1,
    });
    expect(mockSet).toHaveBeenCalledTimes(2);
  });
});
