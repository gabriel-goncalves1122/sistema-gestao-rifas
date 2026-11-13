// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/checkout/mercadoPagoCheckoutStrategy.spec.ts
// ============================================================================

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../../src/modules/rifas/helpers/usuarioRifasHelper", () => ({
  obterContextoAderidoPorEmail: jest.fn(),
}));

import { MercadoPagoCheckoutStrategy } from "../../../src/modules/tesouraria/checkout/strategies/mercadoPagoCheckoutStrategy";
import { CheckoutPixRepository } from "../../../src/modules/tesouraria/checkout/repositories/checkoutPixRepository";
import { IPaymentProvider } from "../../../src/shared/payments/types/paymentProviderTypes";

describe("MercadoPagoCheckoutStrategy", () => {
  let mockRepo: jest.Mocked<CheckoutPixRepository>;
  let mockProvider: jest.Mocked<IPaymentProvider>;
  let strategy: MercadoPagoCheckoutStrategy;

  beforeEach(() => {
    mockRepo = {
      buscarPagamentoPorId: jest.fn(),
      cancelarPagamentoLocal: jest.fn(),
      aplicarEventoPagamento: jest.fn(),
    } as unknown as jest.Mocked<CheckoutPixRepository>;

    mockProvider = {
      modo: "MERCADOPAGO_API",
      criarCobranca: jest.fn(),
      consultarCobranca: jest.fn(),
      consultarEventoStatus: jest.fn(),
      cancelarCobranca: jest.fn(),
    };

    strategy = new MercadoPagoCheckoutStrategy(mockRepo, mockProvider);
  });

  it("deve exigir CPF/CNPJ e e-mail ao criar checkout via Mercado Pago", async () => {
    await expect(
      strategy.criarCheckout("uid_1", "vendedor@teste.com", {
        nome: "Comprador",
        telefone: "35999990000",
        numerosRifas: ["001"],
      }),
    ).rejects.toThrow("MERCADOPAGO_DADOS_OBRIGATORIOS_AUSENTES");
  });

  it("deve rejeitar confirmação manual de envio de comprovante", async () => {
    await expect(
      strategy.confirmarEnvioComprovante({
        uid: "uid_1",
        emailLogado: "vendedor@teste.com",
        pagamentoId: "PAG_1",
      }),
    ).rejects.toThrow("CONFIRMACAO_MANUAL_NAO_SUPORTADA");
  });

  it("deve sincronizar pagamento caso pré-check antes de cancelar indique aprovação no MP", async () => {
    const pagamento = {
      id: "PAG_MP_1",
      pix_order_id: "MP_123",
      status_pagamento_banco: "WAITING",
    } as any;

    (mockProvider.consultarEventoStatus as jest.Mock<any>).mockResolvedValueOnce({
      orderId: "MP_123",
      statusCanonico: "pago",
      statusBancoBruto: "approved",
      valorPagoReais: 20,
    });

    await expect(
      strategy.cancelarCheckout(
        { uid: "uid_1", email: "a@a.com", role: "super-admin", pagamentoId: "PAG_MP_1" },
        pagamento,
      ),
    ).rejects.toThrow("PAGAMENTO_JA_APROVADO");

    expect(mockRepo.aplicarEventoPagamento).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "MP_123", statusCanonico: "pago" }),
    );
    expect(mockRepo.cancelarPagamentoLocal).not.toHaveBeenCalled();
  });

  it("deve cancelar localmente e invalidar cobrança no Mercado Pago ao expirar", async () => {
    const pagamento = {
      id: "PAG_MP_2",
      pix_order_id: "MP_999",
      status_pagamento_banco: "WAITING",
    } as any;

    (mockProvider.consultarEventoStatus as jest.Mock<any>).mockResolvedValueOnce({
      orderId: "MP_999",
      statusCanonico: "aguardando_pagamento",
      statusBancoBruto: "pending",
      valorPagoReais: 0,
    });
    mockRepo.cancelarPagamentoLocal.mockResolvedValueOnce({
      pagamento,
      jaCancelado: false,
    });

    await strategy.expirarCheckout("PAG_MP_2", pagamento);

    expect(mockRepo.cancelarPagamentoLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        pagamentoId: "PAG_MP_2",
        erroCriacaoTexto: "Expirado automaticamente (CRON).",
      }),
    );
    expect(mockProvider.cancelarCobranca).toHaveBeenCalledWith("MP_999");
  });
});
