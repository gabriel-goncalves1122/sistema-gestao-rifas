// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/checkout/repositories/checkoutReservaRepository.spec.ts
// ============================================================================

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as admin from "firebase-admin";

const mockGet = jest.fn<any>();
const mockSet = jest.fn<any>();
const mockDelete = jest.fn<any>();
const mockRunTransaction = jest.fn<any>();
let docCounter = 0;

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    delete: jest.fn(() => "__DELETE__"),
  },
}));

const mockDb = {
  collection: jest.fn<any>().mockImplementation((col: string) => ({
    doc: jest.fn<any>().mockImplementation((id?: string) => ({
      id: id || `${col}_${++docCounter}`,
      get: mockGet,
    })),
  })),
  runTransaction: mockRunTransaction,
} as unknown as admin.firestore.Firestore;

import { CheckoutReservaRepository } from "../../../../src/modules/tesouraria/checkout/repositories/checkoutReservaRepository";

describe("Repository: CheckoutReservaRepository", () => {
  let repo: CheckoutReservaRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    docCounter = 0;
    repo = new CheckoutReservaRepository(mockDb);
  });

  it("deve retornar pagamento ativo concorrente encontrado no lock dentro de reservarBilhetesAtomicamente", async () => {
    const pagamentoExistente = { id: "PAG_CONC", status_pagamento_banco: "WAITING" };
    const mockTx = {
      get: jest
        .fn<any>()
        .mockResolvedValueOnce({ exists: true, data: () => ({ payment_id: "PAG_CONC" }) })
        .mockResolvedValueOnce({ exists: true, data: () => pagamentoExistente }),
      set: mockSet,
    };
    mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTx));

    const res = await repo.reservarBilhetesAtomicamente({
      idempotencyKey: "LOCK_1",
      comprador: { nome: "Ana", telefone: "35999990000", email: null, criado_em: "2026-01-01" },
      pagamentoBase: {
        vendedor_id: "AD_1",
        vendedor_nome: "Vendedor",
        comprador_nome: "Ana",
        comprador_email: null,
        comprador_telefone: "35999990000",
        comprador_documento: null,
        numeros_rifas: ["001"],
        valor_bruto: 10,
        valor_pago: 0,
        status_pagamento_banco: "CRIANDO",
        status_validacao: null,
        pix_order_id: null,
        pix_qr_code_id: null,
        copia_e_cola: null,
        qr_code_imagem_url: null,
        sessao_checkout_id: null,
        data_criacao: "2026-01-01",
        data_expiracao: "2026-01-01",
        provedor_pagamento: "MERCADOPAGO_API",
        idempotency_key: "LOCK_1",
      },
      contextoAderido: { idAderido: "AD_1", vendedorNome: "Vendedor", vendedorCpf: "123" },
      dados: { nome: "Ana", telefone: "35999990000", numerosRifas: ["001"] },
      valorBruto: 10,
      agora: "2026-01-01",
      expiraEm: "2026-01-01",
    });

    expect(res.existente).toEqual(pagamentoExistente);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("deve persistir cobranca gerada preservando status ja resolvido caso webhook chegue antes", async () => {
    const mockTx = {
      get: jest.fn<any>().mockResolvedValueOnce({
        exists: true,
        data: () => ({ status_pagamento_banco: "PAID" }),
      }),
      set: mockSet,
    };
    mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTx));

    await repo.persistirCobrancaGerada({
      pagamentoId: "PAG_1",
      orderId: "ORD_1",
      qrCode: { id: "QR_1", copiaECola: "000201" },
      expiraEmFallback: "2026-01-01",
      numerosRifas: ["001"],
      provedorPagamento: "EMV_OFFLINE",
      rawProvedor: {},
    });

    expect(mockSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status_pagamento_banco: "PAID", pix_order_id: "ORD_1" }),
      { merge: true },
    );
  });

  it("deve compensar erro antes de gerar orderId liberando somente bilhetes do pagamento", async () => {
    const mockTx = {
      get: jest
        .fn<any>()
        .mockResolvedValueOnce({ exists: true })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ pix_reference_id: "REF_OK", comprador_id: "COMP_1" }),
        }),
      set: mockSet,
      delete: mockDelete,
    };
    mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTx));

    await repo.compensarErroCriacao({
      pagamentoId: "PAG_1",
      idempotencyKey: "LOCK_1",
      numerosRifas: ["001"],
      referenceId: "REF_OK",
      compradorId: "COMP_1",
      error: new Error("FALHA"),
    });

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "disponivel" }),
      { merge: true },
    );
  });
});
