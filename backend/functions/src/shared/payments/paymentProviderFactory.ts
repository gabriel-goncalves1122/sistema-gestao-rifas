// ============================================================================
// ARQUIVO: backend/functions/src/shared/payments/paymentProviderFactory.ts
// ============================================================================

import {
  IPaymentProvider,
  ModoProvedorPagamento,
} from "./types/paymentProviderTypes";
import { MercadoPagoPaymentProvider } from "./providers/mercadoPagoPaymentProvider";
import { EmvOfflinePaymentProvider } from "./providers/emvOfflinePaymentProvider";

/**
 * Fábrica de instâncias de provedores de pagamento.
 * Permite alternar entre Mercado Pago e Pix EMV Offline com contingência inteligente.
 */
export class PaymentProviderFactory {
  private static instanciaAtual?: IPaymentProvider;
  private static modoAtual?: ModoProvedorPagamento;

  /**
   * Reseta instâncias em cache (útil para testes unitários).
   */
  static resetarParaTestes(): void {
    this.instanciaAtual = undefined;
    this.modoAtual = undefined;
  }

  /**
   * Obtém o modo de pagamento ativo para novas cobranças.
   * Bloqueia a seleção automática de `MERCADOPAGO_API` mesmo que exista variável de
   * ambiente legada, mantendo o fluxo ativo estritamente em InfinitePay (`EMV_OFFLINE`).
   *
   * @returns {ModoProvedorPagamento} `"COMPROVANTE_PURO"` se explicitado, caso contrário `"EMV_OFFLINE"`.
   */
  static obterModoAtivo(): ModoProvedorPagamento {
    const modoConfigurado = process.env.MODO_PAGAMENTO_PROVIDER || process.env.PAYMENT_PROVIDER_MODE;

    if (modoConfigurado === "COMPROVANTE_PURO") {
      return "COMPROVANTE_PURO";
    }

    return "EMV_OFFLINE";
  }

  /**
   * Retorna a instância do provedor de pagamento correspondente à configuração ativa.
   *
   * @param {ModoProvedorPagamento} [modoForcado] - Opcional para testes e injeção de dependência.
   * @returns {IPaymentProvider} Provedor pronto para uso.
   */
  /**
   * Resolve dinamicamente o provedor de pagamento correspondente a um documento já persistido
   * em `pagamentos_pix`, priorizando `provedor_pagamento` com fallback retrocompatível.
   *
   * @param {Record<string, unknown> | null | undefined} pagamento - Documento de pagamento lido do Firestore.
   * @returns {IPaymentProvider} Provedor compatível com o ciclo de vida daquele pagamento.
   */
  static obterProvedorPorPagamento(
    pagamento?: Record<string, unknown> | null,
  ): IPaymentProvider {
    if (!pagamento) {
      return this.obterProvedor("EMV_OFFLINE");
    }

    const provedorExplicito = String(pagamento.provedor_pagamento || "").trim().toUpperCase();
    if (provedorExplicito === "MERCADOPAGO_API" || provedorExplicito === "MERCADOPAGO") {
      return this.obterProvedor("MERCADOPAGO_API");
    }
    if (provedorExplicito === "EMV_OFFLINE" || provedorExplicito === "COMPROVANTE_PURO") {
      return this.obterProvedor("EMV_OFFLINE");
    }

    const rawOffline = Boolean(
      (pagamento.raw_mercadopago as { geradoOffline?: unknown } | null | undefined)?.geradoOffline,
    );
    const metaOffline = Boolean(
      (pagamento.gateway_meta as { geradoOffline?: unknown } | null | undefined)?.geradoOffline,
    );
    const pixOrderId = String(pagamento.pix_order_id || "").trim();

    if (
      rawOffline ||
      metaOffline ||
      Boolean(pagamento.dados_conciliacao) ||
      pixOrderId.startsWith("RIFA") ||
      !pixOrderId
    ) {
      return this.obterProvedor("EMV_OFFLINE");
    }

    return this.obterProvedor("MERCADOPAGO_API");
  }

  /**
   * Instancia ou retorna em cache o provedor de pagamento configurado para o modo informado.
   *
   * @param {ModoProvedorPagamento} [modoForcado] - Modo opcional para sobrescrever a configuração de ambiente.
   * @returns {IPaymentProvider} Instância do provedor selecionado.
   */
  static obterProvedor(modoForcado?: ModoProvedorPagamento): IPaymentProvider {
    const modo = modoForcado || this.obterModoAtivo();

    if (this.instanciaAtual && this.modoAtual === modo) {
      return this.instanciaAtual;
    }

    let provedor: IPaymentProvider;

    switch (modo) {
      case "MERCADOPAGO_API":
        provedor = new MercadoPagoPaymentProvider();
        break;
      case "EMV_OFFLINE":
      default:
        provedor = new EmvOfflinePaymentProvider();
        break;
    }

    this.instanciaAtual = provedor;
    this.modoAtual = modo;

    return provedor;
  }
}
