// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/checkout/checkoutPixRepository.spec.ts
// ============================================================================

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as admin from "firebase-admin";

const mockGet = jest.fn<any>();
const mockSet = jest.fn<any>();
const mockUpdate = jest.fn<any>();
const mockDelete = jest.fn<any>();
const mockRunTransaction = jest.fn<any>();

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    delete: jest.fn(() => "__DELETE__"),
  },
}));

const mockDb = {
  collection: jest.fn<any>().mockReturnValue({
    doc: jest.fn<any>().mockImplementation((id?: string) => ({
      id: id || "AUTO_ID",
      get: mockGet,
    })),
    where: jest.fn<any>().mockReturnValue({
      limit: jest.fn<any>().mockReturnValue({
        get: mockGet,
      }),
    }),
  }),
  runTransaction: mockRunTransaction,
} as unknown as admin.firestore.Firestore;

import {
  CheckoutPixRepository,
  isPagamentoPixAtivoValido,
} from "../../../src/modules/tesouraria/checkout/repositories/checkoutPixRepository";

describe("CheckoutPixRepository", () => {
  let repository: CheckoutPixRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new CheckoutPixRepository(mockDb);
  });

  describe("verificarDisponibilidadeRifas", () => {
    it("deve lançar erro RIFA_NOT_FOUND se o bilhete não existir", async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      await expect(repository.verificarDisponibilidadeRifas(["001"])).rejects.toThrow(
        "RIFA_NOT_FOUND",
      );
    });

    it("deve lançar erro RIFA_INDISPONIVEL se o bilhete estiver pago", async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ status: "pago" }),
      });

      await expect(repository.verificarDisponibilidadeRifas(["001"])).rejects.toThrow(
        "RIFA_INDISPONIVEL",
      );
    });

    it("deve passar sem erros se o bilhete estiver disponível", async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ status: "disponivel" }),
      });

      await expect(repository.verificarDisponibilidadeRifas(["001"])).resolves.toBeUndefined();
    });
  });

  describe("obterPagamentoAtivoPorLock e isPagamentoPixAtivoValido", () => {
    it("deve retornar null se o lock não existir", async () => {
      mockGet.mockResolvedValueOnce({ exists: false });
      const result = await repository.obterPagamentoAtivoPorLock("LOCK_1");
      expect(result).toBeNull();
    });

    it("deve retornar null se o lock não tiver payment_id", async () => {
      mockGet.mockResolvedValueOnce({ exists: true, data: () => ({}) });
      const result = await repository.obterPagamentoAtivoPorLock("LOCK_1");
      expect(result).toBeNull();
    });

    it("deve retornar null se o pagamento não existir ou estiver cancelado", async () => {
      mockGet
        .mockResolvedValueOnce({ exists: true, data: () => ({ payment_id: "PAY_123" }) })
        .mockResolvedValueOnce({ exists: false });

      expect(await repository.obterPagamentoAtivoPorLock("LOCK_1")).toBeNull();

      mockGet
        .mockResolvedValueOnce({ exists: true, data: () => ({ payment_id: "PAY_123" }) })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ status_pagamento_banco: "CANCELLED" }),
        });

      expect(await repository.obterPagamentoAtivoPorLock("LOCK_1")).toBeNull();
    });

    it("deve retornar o pagamento se ele estiver ativo e ignorar órfão em CRIANDO > 45s", async () => {
      const pagamentoMock = { status_pagamento_banco: "WAITING" };
      mockGet
        .mockResolvedValueOnce({ exists: true, data: () => ({ payment_id: "PAY_123" }) })
        .mockResolvedValueOnce({ exists: true, data: () => pagamentoMock });

      expect(await repository.obterPagamentoAtivoPorLock("LOCK_1")).toEqual(pagamentoMock);

      const pagamentoOrfao = {
        status_pagamento_banco: "CRIANDO",
        pix_order_id: null,
        data_criacao: new Date(Date.now() - 60 * 1000).toISOString(),
      } as any;

      expect(isPagamentoPixAtivoValido(pagamentoOrfao)).toBe(false);

      const pagamentoExpirado = {
        status_pagamento_banco: "WAITING",
        data_expiracao: new Date(Date.now() - 1000).toISOString(),
      } as any;
      expect(isPagamentoPixAtivoValido(pagamentoExpirado)).toBe(false);

      const pagamentoEmAnaliseVencido = {
        status_pagamento_banco: "IN_ANALYSIS",
        data_expiracao: new Date(Date.now() - 1000).toISOString(),
      } as any;
      expect(isPagamentoPixAtivoValido(pagamentoEmAnaliseVencido)).toBe(true);

      mockGet
        .mockResolvedValueOnce({ exists: true, data: () => ({ payment_id: "PAY_ORFAO" }) })
        .mockResolvedValueOnce({ exists: true, data: () => pagamentoOrfao });

      expect(await repository.obterPagamentoAtivoPorLock("LOCK_1")).toBeNull();
    });
  });

  describe("compensarErroCriacao", () => {
    it("deve rodar transação e liberar apenas bilhetes pertencentes ao pagamento", async () => {
      const mockTransacao = {
        get: jest
          .fn<any>()
          .mockResolvedValueOnce({ exists: true })
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({
              pix_reference_id: "REF_123",
              comprador_id: "COMP_123",
            }),
          })
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({
              pix_reference_id: "OUTRO_REF",
              comprador_id: "OUTRO_COMP",
            }),
          }),
        set: mockSet,
        delete: mockDelete,
      };

      mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTransacao));

      await repository.compensarErroCriacao({
        pagamentoId: "PAG_1",
        idempotencyKey: "IDEM_1",
        numerosRifas: ["001", "002"],
        referenceId: "REF_123",
        compradorId: "COMP_123",
        error: new Error("MOCK_ERROR"),
      });

      expect(mockTransacao.get).toHaveBeenCalledTimes(3);
      expect(mockTransacao.delete).toHaveBeenCalledTimes(1);
      expect(mockTransacao.set).toHaveBeenCalledTimes(2);
      expect(mockTransacao.set).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({ status_pagamento_banco: "ERRO_CRIACAO" }),
        { merge: true },
      );
      expect(mockTransacao.set).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.objectContaining({ status: "disponivel" }),
        { merge: true },
      );
    });
  });

  describe("simularPagamento e registrarConfirmacaoEnvio", () => {
    it("deve simular pagamento marcando PAID e bilhetes pendentes", async () => {
      const mockTransacao = {
        get: jest.fn<any>().mockResolvedValueOnce({
          exists: true,
          data: () => ({ numeros_rifas: ["001", "002"], valor_bruto: 20 }),
        }),
        update: mockUpdate,
      };
      mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTransacao));

      await repository.simularPagamento("PAG_SIM");

      expect(mockUpdate).toHaveBeenCalledTimes(3);
      expect(mockUpdate).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({ status_pagamento_banco: "PAID", valor_pago: 20 }),
      );
    });

    it("deve bloquear confirmação manual se pagamento for MERCADOPAGO_API", async () => {
      const mockTransacao = {
        get: jest.fn<any>().mockResolvedValueOnce({
          exists: true,
          data: () => ({
            vendedor_id: "ADERIDO_1",
            provedor_pagamento: "MERCADOPAGO_API",
            status_pagamento_banco: "WAITING",
            numeros_rifas: ["001"],
          }),
        }),
      };
      mockRunTransaction.mockImplementationOnce(async (cb: any) => cb(mockTransacao));

      await expect(
        repository.registrarConfirmacaoEnvio({
          pagamentoId: "PAG_MP",
          autorizar: () => undefined,
        }),
      ).rejects.toThrow("CONFIRMACAO_MANUAL_NAO_SUPORTADA");
    });
  });
});
