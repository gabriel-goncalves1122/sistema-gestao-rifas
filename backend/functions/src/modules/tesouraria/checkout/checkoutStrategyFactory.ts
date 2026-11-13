// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/checkout/checkoutStrategyFactory.ts
// ============================================================================

import { PagamentoPix } from "../../types/models";
import { PaymentProviderFactory } from "../../../shared/payments/paymentProviderFactory";
import { ModoProvedorPagamento } from "../../../shared/payments/types/paymentProviderTypes";
import { CheckoutPixRepository } from "./repositories/checkoutPixRepository";
import { BaseCheckoutStrategy } from "./strategies/baseCheckoutStrategy";
import { MercadoPagoCheckoutStrategy } from "./strategies/mercadoPagoCheckoutStrategy";
import { PixNormalCheckoutStrategy } from "./strategies/pixNormalCheckoutStrategy";

/**
 * Fábrica responsável por resolver e instanciar a estratégia OO correta
 * (`MercadoPagoCheckoutStrategy` ou `PixNormalCheckoutStrategy`) tanto para
 * criação de novas cobranças quanto para operações sobre cobranças já persistidas.
 */
export class CheckoutStrategyFactory {
  /**
   * Identifica se um documento de pagamento já persistido pertence ao fluxo Pix Normal (EMV Offline),
   * priorizando o campo explícito `provedor_pagamento` com fallback retrocompatível para
   * documentos gravados no formato legado.
   *
   * @param {Partial<PagamentoPix>} pagamento - Documento lido de `pagamentos_pix`.
   * @returns {boolean} `true` quando o pagamento é Pix Normal / EMV Offline.
   */
  static isPagamentoPixNormal(pagamento: Partial<PagamentoPix> & Record<string, any>): boolean {
    if (
      pagamento.provedor_pagamento === "EMV_OFFLINE" ||
      pagamento.provedor_pagamento === "COMPROVANTE_PURO"
    ) {
      return true;
    }

    if (pagamento.provedor_pagamento === "MERCADOPAGO_API") {
      return false;
    }

    return (
      Boolean(pagamento?.raw_mercadopago?.geradoOffline) ||
      String(pagamento?.pix_order_id || "").startsWith("RIFA") ||
      Boolean(pagamento?.dados_conciliacao)
    );
  }

  /**
   * Retorna a estratégia configurada para criação de novas cobranças Pix.
   *
   * @param {ModoProvedorPagamento} [modoForcado] - Opcional para testes ou seleção explícita.
   * @param {CheckoutPixRepository} [repository] - Repositório opcional para injeção de dependência.
   * @returns {BaseCheckoutStrategy} Estratégia instanciada.
   */
  static obterParaCriacao(
    modoForcado?: ModoProvedorPagamento,
    repository: CheckoutPixRepository = new CheckoutPixRepository(),
  ): BaseCheckoutStrategy {
    const modo = modoForcado || PaymentProviderFactory.obterModoAtivo();
    const provider = PaymentProviderFactory.obterProvedor(modo);

    if (modo === "MERCADOPAGO_API") {
      return new MercadoPagoCheckoutStrategy(repository, provider);
    }

    return new PixNormalCheckoutStrategy(repository, provider);
  }

  /**
   * Resolve polimorficamente a estratégia correspondente a um pagamento já salvo no Firestore.
   *
   * @param {Partial<PagamentoPix>} pagamento - Documento de `pagamentos_pix`.
   * @param {CheckoutPixRepository} [repository] - Repositório opcional para injeção de dependência.
   * @returns {BaseCheckoutStrategy} Estratégia adequada ao ciclo de vida daquele pagamento.
   */
  static obterPorPagamento(
    pagamento: Partial<PagamentoPix> & Record<string, any>,
    repository: CheckoutPixRepository = new CheckoutPixRepository(),
  ): BaseCheckoutStrategy {
    if (this.isPagamentoPixNormal(pagamento)) {
      return new PixNormalCheckoutStrategy(
        repository,
        PaymentProviderFactory.obterProvedor("EMV_OFFLINE"),
      );
    }

    return new MercadoPagoCheckoutStrategy(
      repository,
      PaymentProviderFactory.obterProvedor("MERCADOPAGO_API"),
    );
  }
}
