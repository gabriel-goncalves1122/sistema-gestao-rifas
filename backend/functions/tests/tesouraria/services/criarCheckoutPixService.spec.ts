import { beforeEach, describe, expect, it, jest } from "@jest/globals";

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
          fromDate: (date: Date) => ({ valueOf: () => date.getTime() }),
        },
      },
    ),
  };
});

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
import { CheckoutStrategyFactory } from "../../../src/modules/tesouraria/checkout/checkoutStrategyFactory";
import { CheckoutPixRepository } from "../../../src/modules/tesouraria/checkout/repositories/checkoutPixRepository";

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
    vendedorNome: "Aderido Teste",
    vendedorCpf: "11122233344",
    slugBase: "rifa-do-aderido",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MODO_PAGAMENTO_PROVIDER = "MERCADOPAGO_API";
    PaymentProviderFactory.resetarParaTestes();

    (obterContextoAderidoPorEmail as jest.Mock).mockResolvedValue(contextoAderidoMock);

    mockGet.mockImplementation(() =>
      Promise.resolve({ exists: false, data: () => ({}) }),
    );

    mockRunTransaction.mockImplementation(async (cb: any) => {
      return cb({
        get: jest.fn().mockImplementation((ref: any) => {
          if (ref.path && ref.path.includes("pagamentos_pix_idempotencia")) {
            return Promise.resolve({ exists: false });
          }
          return Promise.resolve({
            exists: true,
            data: () => ({ status: "disponivel" }),
          });
        }),
        set: mockSet,
        delete: mockDelete,
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Deve retornar unauthorized se faltar uid ou email", async () => {
    await expect(
      CriarCheckoutPixService.executar("", "email@teste.com", mockPayload),
    ).rejects.toThrow("UNAUTHORIZED");

    await expect(
      CriarCheckoutPixService.executar("uid1", "", mockPayload),
    ).rejects.toThrow("UNAUTHORIZED");
  });

  it("Deve retornar pagamento ativo caso exista lock", async () => {
    jest
      .spyOn(CheckoutPixRepository.prototype, "obterPagamentoAtivoPorLock")
      .mockResolvedValueOnce({
        id: "PAG_123",
        status_pagamento_banco: "WAITING",
        pix_qr_code_id: "QR_123",
        copia_e_cola: "000201...",
        numeros_rifas: ["001"],
      } as any);

    const result = await CriarCheckoutPixService.executar("uid1", "joao@teste.com", mockPayload);

    expect(result).toEqual(expect.objectContaining({ id: "PAG_123" }));
    expect(MercadoPagoPixClient.criarPedidoPix).not.toHaveBeenCalled();
  });

  it("Deve criar novo pedido Pix no Mercado Pago quando estratégia for forçada e retornar resposta normalizada", async () => {
    jest
      .spyOn(CheckoutPixRepository.prototype, "obterPagamentoAtivoPorLock")
      .mockResolvedValueOnce(null);
    jest
      .spyOn(CheckoutPixRepository.prototype, "verificarDisponibilidadeRifas")
      .mockResolvedValueOnce(undefined);
    const persistirSpy = jest
      .spyOn(CheckoutPixRepository.prototype, "persistirCobrancaGerada")
      .mockResolvedValueOnce(undefined);

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

    const strategy = CheckoutStrategyFactory.obterParaCriacao("MERCADOPAGO_API");
    const result = await strategy.criarCheckout("uid1", "joao@teste.com", mockPayload);

    expect(MercadoPagoPixClient.criarPedidoPix).toHaveBeenCalled();
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(persistirSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "MP_ORDER_123",
        provedorPagamento: "MERCADOPAGO_API",
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: "MOCK_DOC_ID",
        status: "aguardando_pagamento",
        numerosRifas: ["001", "002"],
        qrCodeBase64: "base64==",
        qrCodeImagemUrl: null,
        copiaECola: "000201123456789",
        expiraEm: "2026-01-01T10:00:00Z",
      }),
    );
  });

  it("Deve criar cobrança via InfinitePay (EMV_OFFLINE) mesmo se MODO_PAGAMENTO_PROVIDER=MERCADOPAGO_API", async () => {
    process.env.MODO_PAGAMENTO_PROVIDER = "MERCADOPAGO_API";
    PaymentProviderFactory.resetarParaTestes();

    jest
      .spyOn(CheckoutPixRepository.prototype, "obterPagamentoAtivoPorLock")
      .mockResolvedValueOnce(null);
    jest
      .spyOn(CheckoutPixRepository.prototype, "verificarDisponibilidadeRifas")
      .mockResolvedValueOnce(undefined);
    const persistirSpy = jest
      .spyOn(CheckoutPixRepository.prototype, "persistirCobrancaGerada")
      .mockResolvedValueOnce(undefined);

    const result = await CriarCheckoutPixService.executar("uid1", "joao@teste.com", {
      nome: "Maria Offline",
      telefone: "35999990000",
      numerosRifas: ["001", "002"],
    });

    expect(MercadoPagoPixClient.criarPedidoPix).not.toHaveBeenCalled();
    expect(persistirSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provedorPagamento: "EMV_OFFLINE",
      }),
    );
    expect(result.status).toBe("aguardando_pagamento");
    expect(result.copiaECola).toContain("br.gov.bcb.pix");
    expect(result.qrCodeBase64).toBeDefined();
  });

  it("Deve disparar compensarErroCriacao caso Mercado Pago falhe antes de retornar orderId", async () => {
    jest
      .spyOn(CheckoutPixRepository.prototype, "obterPagamentoAtivoPorLock")
      .mockResolvedValueOnce(null);
    jest
      .spyOn(CheckoutPixRepository.prototype, "verificarDisponibilidadeRifas")
      .mockResolvedValueOnce(undefined);
    const compensarSpy = jest
      .spyOn(CheckoutPixRepository.prototype, "compensarErroCriacao")
      .mockResolvedValueOnce(undefined);

    (MercadoPagoPixClient.criarPedidoPix as jest.Mock).mockRejectedValueOnce(new Error("MP_TIMEOUT"));

    const strategy = CheckoutStrategyFactory.obterParaCriacao("MERCADOPAGO_API");
    await expect(
      strategy.criarCheckout("uid1", "joao@teste.com", mockPayload),
    ).rejects.toThrow("MP_TIMEOUT");

    expect(compensarSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        compradorId: "MOCK_DOC_ID",
        error: expect.any(Error),
        numerosRifas: ["001", "002"],
      }),
    );
  });

  it("Deve registrar erro pós-criação caso persistirCobrancaGerada falhe após receber orderId", async () => {
    jest
      .spyOn(CheckoutPixRepository.prototype, "obterPagamentoAtivoPorLock")
      .mockResolvedValueOnce(null);
    jest
      .spyOn(CheckoutPixRepository.prototype, "verificarDisponibilidadeRifas")
      .mockResolvedValueOnce(undefined);
    jest
      .spyOn(CheckoutPixRepository.prototype, "persistirCobrancaGerada")
      .mockRejectedValueOnce(new Error("TRANSACTION_FAILED"));
    const registrarErroSpy = jest
      .spyOn(CheckoutPixRepository.prototype, "registrarErroPosCriacao")
      .mockResolvedValueOnce(undefined);

    (MercadoPagoPixClient.criarPedidoPix as jest.Mock).mockResolvedValueOnce({
      id: "MP_ORDER_123",
      point_of_interaction: { transaction_data: { qr_code: "123" } },
    });

    const strategy = CheckoutStrategyFactory.obterParaCriacao("MERCADOPAGO_API");
    await expect(
      strategy.criarCheckout("uid1", "joao@teste.com", mockPayload),
    ).rejects.toThrow("TRANSACTION_FAILED");

    expect(registrarErroSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "MP_ORDER_123",
        provedorPagamento: "MERCADOPAGO_API",
      }),
    );
  });

  it("Deve retornar pagamento existente caso alguém gere o lock concorrentemente na primeira transaction", async () => {
    jest
      .spyOn(CheckoutPixRepository.prototype, "obterPagamentoAtivoPorLock")
      .mockResolvedValueOnce(null);
    jest
      .spyOn(CheckoutPixRepository.prototype, "verificarDisponibilidadeRifas")
      .mockResolvedValueOnce(undefined);

    mockRunTransaction.mockImplementationOnce(async (cb: any) => {
      const mockLockSnap = {
        exists: true,
        data: () => ({ payment_id: "PAG_CONCORRENTE" }),
      };
      const mockPagamentoSnap = {
        exists: true,
        data: () => ({
          id: "PAG_CONCORRENTE",
          status_pagamento_banco: "WAITING",
          pix_qr_code_id: "QR_CONC",
          copia_e_cola: "000201_CONC",
          numeros_rifas: ["001"],
        }),
      };

      return cb({
        get: jest.fn().mockImplementation((ref: any) => {
          if (ref.id === "PAG_CONCORRENTE") return Promise.resolve(mockPagamentoSnap);
          if (ref.path && ref.path.includes("pagamentos_pix_idempotencia")) {
            return Promise.resolve(mockLockSnap);
          }
          return Promise.resolve({ exists: true, data: () => ({ status: "disponivel" }) });
        }),
        set: mockSet,
        delete: mockDelete,
      });
    });

    const result = await CriarCheckoutPixService.executar("uid1", "joao@teste.com", mockPayload);

    expect(result).toEqual(expect.objectContaining({ id: "PAG_CONCORRENTE" }));
    expect(MercadoPagoPixClient.criarPedidoPix).not.toHaveBeenCalled();
  });
});
