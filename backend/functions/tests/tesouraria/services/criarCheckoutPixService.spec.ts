import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as admin from "firebase-admin";

const mockGet = jest.fn<any>();
const mockSet = jest.fn<any>();
const mockDelete = jest.fn<any>();
const mockRunTransaction = jest.fn<any>();
const mockDoc = jest.fn<any>();
const mockCollection = jest.fn<any>();

jest.mock("firebase-admin", () => {
  return {
    firestore: Object.assign(
      jest.fn().mockReturnValue({
        collection: mockCollection.mockImplementation((colPath: string) => ({
          doc: mockDoc.mockImplementation((docId?: string) => ({
            id: docId || "MOCK_DOC_ID",
            path: `${colPath}/${docId || "MOCK_DOC_ID"}`,
            get: mockGet,
          })),
        })),
        runTransaction: mockRunTransaction,
      }),
      {
        Timestamp: {
          now: () => ({ valueOf: () => Date.now() }),
          fromDate: (date: Date) => ({ valueOf: () => date.getTime() })
        }
      }
    ),
  };
});

jest.mock("../../../src/modules/tesouraria/helpers/checkoutPixFirestoreHelper", () => ({
  verificarDisponibilidadeRifasPix: jest.fn(),
  obterPagamentoAtivoPorLockPix: jest.fn(),
  compensarErroCriacaoPix: jest.fn(),
  montarRespostaPagamentoPix: jest.fn(),
  erroMensagem: (e: any) => e.message,
  STATUS_PAGAMENTO_PIX_ATIVO: ["WAITING"],
  persistirPedidoMercadoPagoNoFirestore: jest.fn(),
}));

import {
  verificarDisponibilidadeRifasPix,
  obterPagamentoAtivoPorLockPix,
  compensarErroCriacaoPix,
  montarRespostaPagamentoPix,
  persistirPedidoMercadoPagoNoFirestore,
} from "../../../src/modules/tesouraria/helpers/checkoutPixFirestoreHelper";

jest.mock("../../../src/modules/rifas/helpers/usuarioRifasHelper", () => ({
  obterContextoAderidoPorEmail: jest.fn(),
}));

import { obterContextoAderidoPorEmail } from "../../../src/modules/rifas/helpers/usuarioRifasHelper";

jest.mock("../../../src/shared/services/mercadoPagoPixClient", () => ({
  MercadoPagoPixClient: {
    criarPedidoPix: jest.fn(),
  },
}));

import { MercadoPagoPixClient } from "../../../src/shared/services/mercadoPagoPixClient";
import { CriarCheckoutPixService } from "../../../src/modules/tesouraria/services/criarCheckoutPixService";
import { PaymentProviderFactory } from "../../../src/shared/payments/paymentProviderFactory";

describe("Service: CriarCheckoutPixService", () => {
  const mockPayload = {
    nome: "João Silva",
    telefone: "11999999999",
    email: "joao@teste.com",
    documento: "11122233344",
    numerosRifas: ["001", "002"],
    sessaoCheckoutId: "sessao_123",
  };

  const contextoAderidoMock = {
    idAderido: "ADERIDO_123",
    slugBase: "rifa-do-aderido",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MODO_PAGAMENTO_PROVIDER = "MERCADOPAGO_API";
    PaymentProviderFactory.resetarParaTestes();

    (obterContextoAderidoPorEmail as jest.Mock).mockResolvedValue(contextoAderidoMock);
    
    // Configuração padrão do Firestore Transaction
    mockRunTransaction.mockImplementation(async (cb: any) => {
      return cb({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: "disponivel" }),
        }),
        set: mockSet,
        delete: mockDelete,
      });
    });
  });

  it("Deve retornar unauthorized se faltar uid ou email", async () => {
    await expect(
      CriarCheckoutPixService.executar("", "email@teste.com", mockPayload)
    ).rejects.toThrow("UNAUTHORIZED");

    await expect(
      CriarCheckoutPixService.executar("uid1", "", mockPayload)
    ).rejects.toThrow("UNAUTHORIZED");
  });

  it("Deve retornar pagamento ativo caso exista lock", async () => {
    (obterPagamentoAtivoPorLockPix as jest.Mock).mockResolvedValueOnce({ status_pagamento_banco: "WAITING" });
    (montarRespostaPagamentoPix as jest.Mock).mockReturnValueOnce({ id: "PAG_123" });

    const result = await CriarCheckoutPixService.executar("uid1", "joao@teste.com", mockPayload);

    expect(result).toEqual({ id: "PAG_123" });
    expect(MercadoPagoPixClient.criarPedidoPix).not.toHaveBeenCalled();
  });

  it("Deve criar novo pedido Pix no Mercado Pago e retornar resposta normalizada", async () => {
    (obterPagamentoAtivoPorLockPix as jest.Mock).mockResolvedValueOnce(null);
    (verificarDisponibilidadeRifasPix as jest.Mock).mockResolvedValueOnce(undefined);

    (MercadoPagoPixClient.criarPedidoPix as jest.Mock).mockResolvedValueOnce({
      id: "MP_ORDER_123",
      point_of_interaction: {
        transaction_data: {
          qr_code: "000201123456789",
          qr_code_base64: "base64==",
          ticket_url: "url",
        },
      },
      date_of_expiration: "2026-01-01T10:00:00Z",
    });

    const result = await CriarCheckoutPixService.executar("uid1", "joao@teste.com", mockPayload);

    expect(MercadoPagoPixClient.criarPedidoPix).toHaveBeenCalled();
    expect(mockRunTransaction).toHaveBeenCalledTimes(1); // apenas lock, a segunda persistência foi abstraída
    expect(persistirPedidoMercadoPagoNoFirestore).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        id: "MOCK_DOC_ID",
        status: "aguardando_pagamento",
        numerosRifas: ["001", "002"],
        qrCodeBase64: "base64==",
        qrCodeImagemUrl: null,
        copiaECola: "000201123456789",
        expiraEm: "2026-01-01T10:00:00Z",
      })
    );
  });

  it("Deve criar cobrança via EMV_OFFLINE quando configurado", async () => {
    process.env.MODO_PAGAMENTO_PROVIDER = "EMV_OFFLINE";
    PaymentProviderFactory.resetarParaTestes();

    (obterPagamentoAtivoPorLockPix as jest.Mock).mockResolvedValueOnce(null);
    (verificarDisponibilidadeRifasPix as jest.Mock).mockResolvedValueOnce(undefined);

    const result = await CriarCheckoutPixService.executar("uid1", "joao@teste.com", mockPayload);

    expect(MercadoPagoPixClient.criarPedidoPix).not.toHaveBeenCalled();
    expect(persistirPedidoMercadoPagoNoFirestore).toHaveBeenCalled();
    expect(result.status).toBe("aguardando_pagamento");
    expect(result.copiaECola).toContain("br.gov.bcb.pix");
    expect(result.qrCodeBase64).toBeDefined();
  });

  it("Deve disparar compensarErroCriacaoPix caso Mercado Pago falhe (throw erro) antes de retornar orderId", async () => {
    (obterPagamentoAtivoPorLockPix as jest.Mock).mockResolvedValueOnce(null);
    (verificarDisponibilidadeRifasPix as jest.Mock).mockResolvedValueOnce(undefined);

    (MercadoPagoPixClient.criarPedidoPix as jest.Mock).mockRejectedValueOnce(new Error("MP_TIMEOUT"));
    (compensarErroCriacaoPix as jest.Mock).mockResolvedValueOnce(undefined);

    await expect(
      CriarCheckoutPixService.executar("uid1", "joao@teste.com", mockPayload)
    ).rejects.toThrow("MP_TIMEOUT");

    expect(compensarErroCriacaoPix).toHaveBeenCalledWith(
      expect.objectContaining({
        compradorId: "MOCK_DOC_ID",
        error: expect.any(Error),
        numerosRifas: ["001", "002"],
      })
    );
  });

  it("Deve salvar erro no Firestore e disparar erro caso falhe MAS já tenha o orderId de alguma forma", async () => {
    (obterPagamentoAtivoPorLockPix as jest.Mock).mockResolvedValueOnce(null);
    (verificarDisponibilidadeRifasPix as jest.Mock).mockResolvedValueOnce(undefined);

    // O Mock de MercadoPagoClient irá falhar apenas num sub-passo (por exemplo, na transaction secundária)
    // Para testar a linha 202 (else { await db.runTransaction ... erro_criacao }), precisamos que 
    // a transaction secundária falhe.
    (MercadoPagoPixClient.criarPedidoPix as jest.Mock).mockResolvedValueOnce({
      id: "MP_ORDER_123",
      point_of_interaction: { transaction_data: { qr_code: "123" } },
    });

    (persistirPedidoMercadoPagoNoFirestore as jest.Mock).mockRejectedValueOnce(new Error("TRANSACTION_FAILED"));

    mockRunTransaction
      .mockImplementationOnce(async (cb: any) => cb({
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ status: "disponivel" }) }),
        set: mockSet
      }))
      .mockImplementationOnce(async (cb: any) => cb({ set: mockSet })); // a transação do fallback de erro

    await expect(
      CriarCheckoutPixService.executar("uid1", "joao@teste.com", mockPayload)
    ).rejects.toThrow("TRANSACTION_FAILED");

    // Verifica se rodou o fallback (lock + fallback = 2 chamadas)
    expect(mockRunTransaction).toHaveBeenCalledTimes(2);
  });

  it("Deve retornar pagamento existente caso alguém gere o lock concorrentemente na primeira transaction", async () => {
    (obterPagamentoAtivoPorLockPix as jest.Mock).mockResolvedValueOnce(null);
    (verificarDisponibilidadeRifasPix as jest.Mock).mockResolvedValueOnce(undefined);

    mockRunTransaction.mockImplementationOnce(async (cb: any) => {
      // Simula que o lockSnap existe na transaction
      const mockLockSnap = {
        exists: true,
        data: () => ({ payment_id: "PAG_CONCORRENTE", expira_em: { valueOf: () => Date.now() + 10000, toDate: () => new Date(Date.now() + 10000), toMillis: () => Date.now() + 10000, seconds: Date.now() / 1000 + 10, nanoseconds: 0 } as any }),
      };
      const mockPagamentoSnap = {
        exists: true,
        data: () => ({ status_pagamento_banco: "WAITING" }),
      };

      return cb({
        get: jest.fn().mockImplementation((ref: any) => {
          if (ref.id === "PAG_CONCORRENTE") return Promise.resolve(mockPagamentoSnap);
          if (ref.path && ref.path.includes("pagamentos_pix_idempotencia")) return Promise.resolve(mockLockSnap);
          return Promise.resolve({ exists: true, data: () => ({ status: "disponivel" }) });
        }),
        set: mockSet,
        delete: mockDelete,
      });
    });

    (montarRespostaPagamentoPix as jest.Mock).mockReturnValueOnce({ id: "PAG_CONCORRENTE" });

    const result = await CriarCheckoutPixService.executar("uid1", "joao@teste.com", mockPayload);

    expect(result).toEqual({ id: "PAG_CONCORRENTE" });
    expect(MercadoPagoPixClient.criarPedidoPix).not.toHaveBeenCalled();
  });
});
