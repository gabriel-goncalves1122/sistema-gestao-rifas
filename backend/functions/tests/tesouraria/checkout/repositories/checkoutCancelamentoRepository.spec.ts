// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/checkout/repositories/checkoutCancelamentoRepository.spec.ts
// ============================================================================

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as admin from "firebase-admin";

const mockSet = jest.fn<any>();
const mockUpdate = jest.fn<any>();
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
    })),
  })),
  runTransaction: mockRunTransaction,
} as unknown as admin.firestore.Firestore;

import { CheckoutCancelamentoRepository } from "../../../../src/modules/tesouraria/checkout/repositories/checkoutCancelamentoRepository";

describe("Repository: CheckoutCancelamentoRepository", () => {
  let repo: CheckoutCancelamentoRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new CheckoutCancelamentoRepository(mockDb);
  });

  it("deve respeitar guarda de posse pix_reference_id e não sobrescrever bilhete pago ao liberar", async () => {
    const mockTx = {
      getAll: jest.fn<any>().mockResolvedValueOnce([
        {
          exists: true,
          ref: { id: "001" },
          data: () => ({ status: "reservado", pix_reference_id: "REF_ALHEIA" }),
        },
        {
          exists: true,
          ref: { id: "002" },
          data: () => ({ status: "pago", pix_reference_id: "REF_CERTA" }),
        },
        {
          exists: true,
          ref: { id: "003" },
          data: () => ({ status: "reservado", pix_reference_id: "REF_CERTA" }),
        },
      ]),
      set: mockSet,
    };

    await CheckoutCancelamentoRepository.liberarBilhetesNaTransacao(
      mockTx,
      mockDb,
      "__DELETE__",
      ["001", "002", "003"],
      "cancelled",
      "Expirado",
      false,
      undefined,
      "REF_CERTA",
    );

    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      { id: "003" },
      expect.objectContaining({ status: "disponivel" }),
      { merge: true },
    );
  });

  it("deve ignorar status não cancelável quando ignorarSeStatusInvalido=true", async () => {
    const mockTx = {
      get: jest.fn<any>().mockResolvedValueOnce({
        exists: true,
        data: () => ({ status_pagamento_banco: "PAID", numeros_rifas: ["001"] }),
      }),
      update: mockUpdate,
    };
    mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTx));

    const res = await repo.cancelarPagamentoLocal({
      pagamentoId: "PAG_1",
      motivo: "Cron",
      erroCriacaoTexto: "Cron",
      ignorarSeStatusInvalido: true,
    });

    expect(res.ignorado).toBe(true);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
