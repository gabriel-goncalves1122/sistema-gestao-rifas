// ARQUIVO: backend/functions/tests/tesouraria/services/cancelarCheckoutPixService.spec.ts

import * as admin from "firebase-admin";
import { CancelarCheckoutPixService } from "../../../src/modules/tesouraria/services/cancelarCheckoutPixService";
import { MercadoPagoPixClient } from "../../../src/shared/services/mercadoPagoPixClient";
import * as checkoutPixHelper from "../../../src/modules/tesouraria/helpers/checkoutPixHelper";

jest.mock("firebase-admin", () => {
  const deleteMock = jest.fn(() => "DELETE_TOKEN");
  const runTransactionMock = jest.fn();
  const firestoreMock = {
    collection: jest.fn(() => ({ 
      doc: jest.fn(() => ({ 
        id: "mock_doc",
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) })
      })) 
    })),
    runTransaction: runTransactionMock,
  };
  return {
    firestore: Object.assign(jest.fn(() => firestoreMock), {
      FieldValue: { delete: deleteMock }
    })
  };
});

jest.mock("firebase-admin/firestore", () => {
  return {
    FieldValue: {
      delete: jest.fn(() => "DELETE_TOKEN")
    }
  };
});

jest.mock("../../../src/shared/services/mercadoPagoPixClient", () => ({
  MercadoPagoPixClient: {
    cancelarPedidoPix: jest.fn(),
  },
}));

jest.mock("../../../src/modules/tesouraria/helpers/checkoutPixHelper", () => ({
  liberarBilhetesNaTransacao: jest.fn(),
}));

describe("CancelarCheckoutPixService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve disparar erro se não houver uid ou pagamentoId", async () => {
    await expect(CancelarCheckoutPixService.executar("", "pag_123")).rejects.toThrow("UNAUTHORIZED");
    await expect(CancelarCheckoutPixService.executar("uid", "")).rejects.toThrow("UNAUTHORIZED");
  });

  it("deve disparar erro se pagamento não for encontrado", async () => {
    const runTransactionMock = (admin.firestore().runTransaction as jest.Mock);
    runTransactionMock.mockImplementationOnce(async (callback) => {
      const transaction = {
        get: jest.fn().mockResolvedValue({ exists: false }),
      };
      await callback(transaction);
    });

      await expect(
        CancelarCheckoutPixService.executar({ uid: "uid", email: "teste@teste.com", role: "tesouraria", pagamentoId: "pag_404" })
      ).rejects.toThrow("PAGAMENTO_NOT_FOUND");
  });

  it("deve liberar bilhetes se o status ja estiver cancelado e reterReserva=false", async () => {
    const runTransactionMock = (admin.firestore().runTransaction as jest.Mock);
    runTransactionMock.mockImplementationOnce(async (callback) => {
      const transaction = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ vendedor_id: "uid", status_pagamento_banco: "CANCELADO", numeros_rifas: ["001"] }),
        }),
      };
      await callback(transaction);
    });

    await CancelarCheckoutPixService.executar({ uid: "uid", email: "a@a.com", role: "admin", pagamentoId: "pag_123", reterReserva: false });
    expect(checkoutPixHelper.liberarBilhetesNaTransacao).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      ["001"],
      "cancelled",
      "Cancelado pelo usuário.",
      false,
      undefined,
      undefined
    );
  });

  it("deve retornar sem liberar bilhetes se o status ja estiver cancelado e reterReserva=true", async () => {
    const runTransactionMock = (admin.firestore().runTransaction as jest.Mock);
    runTransactionMock.mockImplementationOnce(async (callback) => {
      const transaction = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ vendedor_id: "uid", status_pagamento_banco: "CANCELADO" }),
        }),
      };
      await callback(transaction);
    });

    await CancelarCheckoutPixService.executar({ uid: "uid", email: "a@a.com", role: "admin", pagamentoId: "pag_123", reterReserva: true });
    expect(checkoutPixHelper.liberarBilhetesNaTransacao).not.toHaveBeenCalled();
  });

  it("deve disparar erro se o status for invalido para cancelamento", async () => {
    const runTransactionMock = (admin.firestore().runTransaction as jest.Mock);
    runTransactionMock.mockImplementationOnce(async (callback) => {
      const transaction = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ vendedor_id: "uid", status_pagamento_banco: "PAID" }), // status não permitido
        }),
      };
      await callback(transaction);
    });

      await expect(
        CancelarCheckoutPixService.executar({ uid: "uid", email: "teste@teste.com", role: "tesouraria", pagamentoId: "pag_invalido" })
      ).rejects.toThrow("STATUS_INVALIDO_CANCELAMENTO");
  });

  it("deve cancelar o pagamento, liberar rifas e chamar mercado pago", async () => {
    const mockUpdate = jest.fn();
    const mockDelete = jest.fn();

    const runTransactionMock = (admin.firestore().runTransaction as jest.Mock);
    runTransactionMock.mockImplementationOnce(async (callback) => {
      const transaction = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            vendedor_id: "uid",
            status_pagamento_banco: "WAITING",
            numeros_rifas: ["001"],
            pix_order_id: "order_123",
            idempotency_key: "idem_123"
          }),
        }),
        update: mockUpdate,
        delete: mockDelete,
      };
      await callback(transaction);
    });

    await CancelarCheckoutPixService.executar({ uid: "uid", email: "a@a.com", role: "admin", pagamentoId: "pag_123" });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.anything(), // pagamentoRef
      {
        status_pagamento_banco: "cancelled",
        erro_criacao: "Cancelado pelo usuário.",
      }
    );

    expect(checkoutPixHelper.liberarBilhetesNaTransacao).toHaveBeenCalledWith(
      expect.anything(), // transaction
      expect.anything(), // db
      expect.anything(), // FieldValue.delete()
      ["001"],
      "cancelled",
      "Cancelado pelo usuário.",
      false,
      undefined,
      undefined
    );

    expect(MercadoPagoPixClient.cancelarPedidoPix).toHaveBeenCalledWith("order_123");
  });

  it("deve não quebrar caso MercadoPago falhe no cancelamento", async () => {
    const runTransactionMock = (admin.firestore().runTransaction as jest.Mock);
    runTransactionMock.mockImplementationOnce(async (callback) => {
      const transaction = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            vendedor_id: "uid",
            status_pagamento_banco: "CRIANDO",
            numeros_rifas: [],
            pix_order_id: "order_456"
          }),
        }),
        update: jest.fn(),
        delete: jest.fn(),
      };
      await callback(transaction);
    });

    const consoleWarnMock = jest.spyOn(console, "warn").mockImplementation();

    (MercadoPagoPixClient.cancelarPedidoPix as jest.Mock).mockRejectedValueOnce(new Error("API ERROR"));

    await CancelarCheckoutPixService.executar({ uid: "uid", email: "a@a.com", role: "admin", pagamentoId: "pag_123" });

    expect(consoleWarnMock).toHaveBeenCalled();
    
    consoleWarnMock.mockRestore();
  });
});
