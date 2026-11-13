// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/checkout/checkoutStrategyFactory.spec.ts
// ============================================================================

import { beforeEach, describe, expect, it } from "@jest/globals";

import { CheckoutStrategyFactory } from "../../../src/modules/tesouraria/checkout/checkoutStrategyFactory";
import { MercadoPagoCheckoutStrategy } from "../../../src/modules/tesouraria/checkout/strategies/mercadoPagoCheckoutStrategy";
import { PixNormalCheckoutStrategy } from "../../../src/modules/tesouraria/checkout/strategies/pixNormalCheckoutStrategy";
import { PaymentProviderFactory } from "../../../src/shared/payments/paymentProviderFactory";

describe("CheckoutStrategyFactory", () => {
  beforeEach(() => {
    PaymentProviderFactory.resetarParaTestes();
    delete process.env.MODO_PAGAMENTO_PROVIDER;
    delete process.env.PAYMENT_PROVIDER_MODE;
  });

  it("deve resolver para PixNormalCheckoutStrategy no modo padrão (EMV_OFFLINE)", () => {
    const strategy = CheckoutStrategyFactory.obterParaCriacao();
    expect(strategy).toBeInstanceOf(PixNormalCheckoutStrategy);
    expect(strategy.tipo).toBe("EMV_OFFLINE");
  });

  it("deve resolver para PixNormalCheckoutStrategy mesmo quando MODO_PAGAMENTO_PROVIDER for MERCADOPAGO_API", () => {
    process.env.MODO_PAGAMENTO_PROVIDER = "MERCADOPAGO_API";
    const strategy = CheckoutStrategyFactory.obterParaCriacao();
    expect(strategy).toBeInstanceOf(PixNormalCheckoutStrategy);
    expect(strategy.tipo).toBe("EMV_OFFLINE");
  });

  it("deve resolver para MercadoPagoCheckoutStrategy apenas quando explicitamente forçado", () => {
    const strategy = CheckoutStrategyFactory.obterParaCriacao("MERCADOPAGO_API");
    expect(strategy).toBeInstanceOf(MercadoPagoCheckoutStrategy);
    expect(strategy.tipo).toBe("MERCADOPAGO_API");
  });

  it("deve priorizar campo explícito provedor_pagamento ao resolver por pagamento", () => {
    expect(
      CheckoutStrategyFactory.obterPorPagamento({
        provedor_pagamento: "EMV_OFFLINE",
        pix_order_id: "123456",
      }),
    ).toBeInstanceOf(PixNormalCheckoutStrategy);

    expect(
      CheckoutStrategyFactory.obterPorPagamento({
        provedor_pagamento: "MERCADOPAGO_API",
        pix_order_id: "RIFA_LEGACY",
      }),
    ).toBeInstanceOf(MercadoPagoCheckoutStrategy);
  });

  it("deve aplicar fallback retrocompatível para documentos legados sem provedor_pagamento", () => {
    expect(
      CheckoutStrategyFactory.obterPorPagamento({
        raw_mercadopago: { geradoOffline: true },
      }),
    ).toBeInstanceOf(PixNormalCheckoutStrategy);

    expect(
      CheckoutStrategyFactory.obterPorPagamento({
        pix_order_id: "RIFA123456",
      }),
    ).toBeInstanceOf(PixNormalCheckoutStrategy);

    expect(
      CheckoutStrategyFactory.obterPorPagamento({
        pix_order_id: "987654321",
      }),
    ).toBeInstanceOf(MercadoPagoCheckoutStrategy);
  });
});
