// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/checkout/repositories/checkoutEventoRepository.spec.ts
// ============================================================================

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as admin from "firebase-admin";

const mockSet = jest.fn<any>();
const mockGet = jest.fn<any>();
const mockRunTransaction = jest.fn<any>();

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    delete: jest.fn(() => "__DELETE__"),
  },
}));

const mockDb = {
  collection: jest.fn<any>().mockImplementation((col: string) => ({
    doc: jest.fn<any>().mockImplementation((id?: string) => ({
      id: id || `${col}_DOC`,
      get: mockGet,
    })),
    where: jest.fn<any>().mockReturnValue({
      limit: jest.fn<any>().mockReturnValue({}),
    }),
  })),
  runTransaction: mockRunTransaction,
} as unknown as admin.firestore.Firestore;

import { CheckoutEventoRepository } from "../../../../src/modules/tesouraria/checkout/repositories/checkoutEventoRepository";

describe("Repository: CheckoutEventoRepository", () => {
  let repo: CheckoutEventoRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new CheckoutEventoRepository(mockDb);
  });

  it("deve aplicar confirmação de pagamento e marcar necessita_reembolso se todos bilhetes tiverem sido perdidos", async () => {
    const pagamentoDoc = {
      ref: { id: "PAG_1" },
      data: () => ({
        id: "PAG_1",
        reference_id: "REF_1",
        status_pagamento_banco: "WAITING",
        status_validacao: null,
        numeros_rifas: ["001"],
        valor_bruto: 10,
      }),
    };

    const mockTx = {
      get: jest.fn<any>().mockResolvedValueOnce({ empty: false, docs: [pagamentoDoc] }),
      getAll: jest.fn<any>().mockResolvedValueOnce([
        {
          exists: true,
          ref: { id: "001" },
          data: () => ({ pix_reference_id: "OUTRA_REF" }),
        },
      ]),
      set: mockSet,
    };
    mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTx));

    const res = await repo.aplicarEventoPagamento({
      orderId: "ORD_1",
      referenceId: "REF_1",
      statusBancoBruto: "approved",
      statusCanonico: "pago",
      valorPagoReais: 10,
      rawPayload: { id: "ORD_1", status: "approved" },
    });

    expect(res.sucesso).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      { id: "PAG_1" },
      expect.objectContaining({ necessita_reembolso: true, status_pagamento_banco: "approved" }),
      { merge: true },
    );
  });

  it("deve retornar idempotente=true quando evento possui o mesmo status_pagamento_banco", async () => {
    const pagamentoDoc = {
      ref: { id: "PAG_1" },
      data: () => ({
        id: "PAG_1",
        status_pagamento_banco: "approved",
        gateway_meta: { provedor: "MERCADOPAGO_API" },
      }),
    };

    const mockTx = {
      get: jest.fn<any>().mockResolvedValueOnce({ empty: false, docs: [pagamentoDoc] }),
      set: mockSet,
    };
    mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTx));

    const res = await repo.aplicarEventoPagamento({
      orderId: "ORD_1",
      statusBancoBruto: "approved",
      statusCanonico: "pago",
      rawPayload: {},
    });

    expect(res).toEqual({ sucesso: true, idempotente: true, status: "approved" });
  });
});
