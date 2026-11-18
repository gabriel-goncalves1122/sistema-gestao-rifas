// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/checkout/repositories/checkoutManualRepository.spec.ts
// ============================================================================

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as admin from "firebase-admin";

const mockSet = jest.fn<any>();
const mockUpdate = jest.fn<any>();
const mockRunTransaction = jest.fn<any>();

const mockDb = {
  collection: jest.fn<any>().mockImplementation((col: string) => ({
    doc: jest.fn<any>().mockImplementation((id?: string) => ({
      id: id || `${col}_DOC`,
    })),
  })),
  runTransaction: mockRunTransaction,
} as unknown as admin.firestore.Firestore;

import { CheckoutManualRepository } from "../../../../src/modules/tesouraria/checkout/repositories/checkoutManualRepository";

describe("Repository: CheckoutManualRepository", () => {
  let repo: CheckoutManualRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new CheckoutManualRepository(mockDb);
  });

  it("deve registrar confirmação manual para EMV_OFFLINE transicionando bilhetes para pendente preservando pix_order_id do provedor", async () => {
    const mockTx = {
      get: jest
        .fn<any>()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            id: "PAG_DOC_ID",
            vendedor_id: "AD_1",
            provedor_pagamento: "EMV_OFFLINE",
            status_pagamento_banco: "WAITING",
            numeros_rifas: ["010"],
            comprador_email: "ana@teste.com",
            comprador_nome: "Ana",
            comprador_id: "COMP_1",
            pix_order_id: "RIFA_OFF_123",
            reference_id: "rifas-pix-COMP_1",
          }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            numero: "010",
            status: "reservado",
            pix_order_id: "RIFA_OFF_123",
            pix_reference_id: "rifas-pix-COMP_1",
            comprador_id: "COMP_1",
            data_expiracao: new Date(Date.now() + 60000).toISOString(),
          }),
        }),
      set: mockSet,
    };
    mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTx));

    const res = await repo.registrarConfirmacaoEnvio({
      pagamentoId: "PAG_DOC_ID",
      comprovanteUrl: "https://storage/comprovante.jpg",
      hashComprovante: "HASH_1",
      autorizar: () => undefined,
    });

    expect(res).toEqual({
      numerosRifas: ["010"],
      compradorEmail: "ana@teste.com",
      compradorNome: "Ana",
    });
    expect(mockSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status_pagamento_banco: "IN_ANALYSIS" }),
      { merge: true },
    );
    expect(mockSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "pendente",
        hash_comprovante: "HASH_1",
        pix_order_id: "RIFA_OFF_123",
      }),
      { merge: true },
    );
  });

  it("deve permitir reenvio de confirmação quando o bilhete já possui o pagamentoId no pix_order_id", async () => {
    const mockTx = {
      get: jest
        .fn<any>()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            id: "PAG_DOC_ID",
            vendedor_id: "AD_1",
            provedor_pagamento: "EMV_OFFLINE",
            status_pagamento_banco: "WAITING",
            numeros_rifas: ["010"],
            comprador_email: "ana@teste.com",
            comprador_nome: "Ana",
            pix_order_id: "RIFA_OFF_123",
            reference_id: "rifas-pix-COMP_1",
          }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            numero: "010",
            status: "pendente",
            pix_order_id: "PAG_DOC_ID",
            pix_reference_id: "rifas-pix-COMP_1",
          }),
        }),
      set: mockSet,
    };
    mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTx));

    const res = await repo.registrarConfirmacaoEnvio({
      pagamentoId: "PAG_DOC_ID",
      comprovanteUrl: "https://storage/comprovante2.jpg",
      autorizar: () => undefined,
    });

    expect(res.numerosRifas).toEqual(["010"]);
  });

  it("deve lançar RIFA_INDISPONIVEL quando o bilhete pertence a outro pedido não expirado", async () => {
    const mockTx = {
      get: jest
        .fn<any>()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            id: "PAG_DOC_ID",
            vendedor_id: "AD_1",
            provedor_pagamento: "EMV_OFFLINE",
            status_pagamento_banco: "WAITING",
            numeros_rifas: ["010"],
            pix_order_id: "RIFA_MEU_PEDIDO",
            reference_id: "rifas-pix-COMP_MEU",
          }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            numero: "010",
            status: "reservado",
            pix_order_id: "RIFA_OUTRO_PEDIDO",
            pix_reference_id: "rifas-pix-OUTRO",
            data_expiracao: new Date(Date.now() + 60000).toISOString(),
          }),
        }),
      set: mockSet,
    };
    mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTx));

    await expect(
      repo.registrarConfirmacaoEnvio({
        pagamentoId: "PAG_DOC_ID",
        comprovanteUrl: "https://storage/comprovante.jpg",
        autorizar: () => undefined,
      }),
    ).rejects.toThrow("RIFA_INDISPONIVEL");
  });

  it("deve reativar pagamento expirado (CANCELED) ao enviar comprovante se os bilhetes estiverem disponíveis", async () => {
    const mockTx = {
      get: jest
        .fn<any>()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            id: "PAG_EXP_1",
            vendedor_id: "AD_1",
            provedor_pagamento: "EMV_OFFLINE",
            status_pagamento_banco: "CANCELED",
            numeros_rifas: ["16094"],
            comprador_email: "sabrina@teste.com",
            comprador_nome: "Sabrina",
            comprador_id: "COMP_1",
            pix_order_id: "RIFAQVOAJWADNM",
            reference_id: "rifas-pix-COMP_1",
          }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            numero: "16094",
            status: "disponivel",
          }),
        }),
      set: mockSet,
    };
    mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTx));

    const res = await repo.registrarConfirmacaoEnvio({
      pagamentoId: "PAG_EXP_1",
      comprovanteUrl: "https://storage/comprovante_tardio.jpg",
      hashComprovante: "HASH_TARDIO",
      autorizar: () => undefined,
    });

    expect(res.numerosRifas).toEqual(["16094"]);
    expect(mockSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status_pagamento_banco: "IN_ANALYSIS",
        erro_criacao: null,
        comprovante_url: "https://storage/comprovante_tardio.jpg",
      }),
      { merge: true },
    );
    expect(mockSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "pendente",
        pix_order_id: "RIFAQVOAJWADNM",
      }),
      { merge: true },
    );
  });

  it("deve bloquear confirmação se pagamento tiver sido recusado (status_validacao negada)", async () => {
    const mockTx = {
      get: jest.fn<any>().mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: "PAG_NEG",
          provedor_pagamento: "EMV_OFFLINE",
          status_pagamento_banco: "CANCELED",
          status_validacao: "negada",
          numeros_rifas: ["16094"],
        }),
      }),
    };
    mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTx));

    await expect(
      repo.registrarConfirmacaoEnvio({
        pagamentoId: "PAG_NEG",
        comprovanteUrl: "https://storage/comp.jpg",
        autorizar: () => undefined,
      }),
    ).rejects.toThrow("STATUS_INVALIDO_CONFIRMACAO");
  });

  it("deve simular pagamento atualizando documento pai e bilhetes", async () => {
    const mockTx = {
      get: jest.fn<any>().mockResolvedValueOnce({
        exists: true,
        data: () => ({ numeros_rifas: ["010", "011"], valor_bruto: 20 }),
      }),
      update: mockUpdate,
    };
    mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTx));

    await repo.simularPagamento("PAG_SIM");

    expect(mockUpdate).toHaveBeenCalledTimes(3);
  });
});
