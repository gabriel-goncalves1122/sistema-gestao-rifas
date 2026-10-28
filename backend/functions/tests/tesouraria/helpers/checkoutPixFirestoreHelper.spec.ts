import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import * as admin from "firebase-admin";

import {
  verificarDisponibilidadeRifasPix,
  obterPagamentoAtivoPorLockPix,
  compensarErroCriacaoPix,
  isPagamentoPixAtivoValido,
} from "../../../src/modules/tesouraria/helpers/checkoutPixFirestoreHelper";

const mockGet = jest.fn<any>();
const mockSet = jest.fn<any>();
const mockDelete = jest.fn<any>();
const mockRunTransaction = jest.fn<any>();

const mockDb = {
  collection: jest.fn<any>().mockReturnValue({
    doc: jest.fn<any>().mockReturnValue({
      get: mockGet,
    }),
  }),
  runTransaction: mockRunTransaction,
} as unknown as admin.firestore.Firestore;

describe("Helper: CheckoutPixFirestoreHelper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("verificarDisponibilidadeRifasPix", () => {
    it("Deve lançar erro RIFA_NOT_FOUND se o bilhete não existir", async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      await expect(
        verificarDisponibilidadeRifasPix(mockDb, ["001"]),
      ).rejects.toThrow("RIFA_NOT_FOUND");
    });

    it("Deve lançar erro RIFA_INDISPONIVEL se o bilhete estiver pago", async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ status: "pago" }),
      });

      await expect(
        verificarDisponibilidadeRifasPix(mockDb, ["001"]),
      ).rejects.toThrow("RIFA_INDISPONIVEL");
    });

    it("Deve passar sem erros se o bilhete estiver disponível", async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ status: "disponivel" }),
      });

      await expect(
        verificarDisponibilidadeRifasPix(mockDb, ["001"]),
      ).resolves.toBeUndefined();
    });
  });

  describe("obterPagamentoAtivoPorLockPix e isPagamentoPixAtivoValido", () => {
    const mockLockRef = { get: mockGet } as any;

    it("Deve retornar null se o lock não existir", async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const result = await obterPagamentoAtivoPorLockPix({
        db: mockDb,
        lockRef: mockLockRef,
      });

      expect(result).toBeNull();
    });

    it("Deve retornar null se o lock não tiver payment_id", async () => {
      mockGet.mockResolvedValueOnce({ exists: true, data: () => ({}) });

      const result = await obterPagamentoAtivoPorLockPix({
        db: mockDb,
        lockRef: mockLockRef,
      });

      expect(result).toBeNull();
    });

    it("Deve retornar null se o pagamento não existir no banco", async () => {
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ payment_id: "PAY_123" }),
        }) // lockRef.get()
        .mockResolvedValueOnce({ exists: false }); // pagamentoRef.get()

      const result = await obterPagamentoAtivoPorLockPix({
        db: mockDb,
        lockRef: mockLockRef,
      });

      expect(result).toBeNull();
    });

    it("Deve retornar null se o pagamento estiver cancelado", async () => {
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ payment_id: "PAY_123" }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ status_pagamento_banco: "CANCELLED" }),
        });

      const result = await obterPagamentoAtivoPorLockPix({
        db: mockDb,
        lockRef: mockLockRef,
      });

      expect(result).toBeNull();
    });

    it("Deve retornar o pagamento se ele estiver ativo", async () => {
      const pagamentoMock = { status_pagamento_banco: "WAITING" };
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ payment_id: "PAY_123" }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => pagamentoMock,
        });

      const result = await obterPagamentoAtivoPorLockPix({
        db: mockDb,
        lockRef: mockLockRef,
      });

      expect(result).toEqual(pagamentoMock);
    });

    it("Deve ignorar lock órfão preso em CRIANDO sem pix_order_id há mais de 45s", async () => {
      const pagamentoOrfao = {
        status_pagamento_banco: "CRIANDO",
        pix_order_id: null,
        data_criacao: new Date(Date.now() - 60 * 1000).toISOString(),
      } as any;

      expect(isPagamentoPixAtivoValido(pagamentoOrfao)).toBe(false);

      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ payment_id: "PAY_ORFAO" }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => pagamentoOrfao,
        });

      const result = await obterPagamentoAtivoPorLockPix({
        db: mockDb,
        lockRef: mockLockRef,
      });

      expect(result).toBeNull();
    });
  });

  describe("compensarErroCriacaoPix", () => {
    it("Deve rodar transação e liberar bilhetes ao falhar na criação", async () => {
      const mockTransacao = {
        get: jest
          .fn<any>()
          .mockResolvedValueOnce({ exists: true }) // pagamento
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({
              pix_reference_id: "REF_123",
              comprador_id: "COMP_123",
            }),
          }), // rifa
        set: mockSet,
        delete: mockDelete,
      };

      mockRunTransaction.mockImplementationOnce(async (cb: any) => {
        return cb(mockTransacao);
      });

      await compensarErroCriacaoPix({
        db: mockDb,
        pagamentoRef: {} as any,
        lockRef: {} as any,
        numerosRifas: ["001"],
        referenceId: "REF_123",
        compradorId: "COMP_123",
        error: new Error("MOCK_ERROR"),
      });

      expect(mockTransacao.get).toHaveBeenCalledTimes(2);
      expect(mockTransacao.delete).toHaveBeenCalledTimes(1); // delete lock
      expect(mockTransacao.set).toHaveBeenCalledTimes(2); // set pagamento (ERRO), set rifa (disponivel)

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
});
