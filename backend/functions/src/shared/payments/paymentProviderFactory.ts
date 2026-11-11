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
   * Obtém o modo de pagamento ativo no ambiente.
   *
   * @returns {ModoProvedorPagamento} Modo selecionado via env ou padrão contingencial.
   */
  static obterModoAtivo(): ModoProvedorPagamento {
    const modoConfigurado = process.env.MODO_PAGAMENTO_PROVIDER || process.env.PAYMENT_PROVIDER_MODE;

    if (modoConfigurado === "EMV_OFFLINE") {
      return "EMV_OFFLINE";
    }

    if (modoConfigurado === "COMPROVANTE_PURO") {
      return "COMPROVANTE_PURO";
    }

    if (modoConfigurado === "MERCADOPAGO_API") {
      return "MERCADOPAGO_API";
    }

    // Na branch main-comprovantes, o modo padrão de operação é EMV_OFFLINE (InfinitePay)
    return "EMV_OFFLINE";
  }

  /**
   * Retorna a instância do provedor de pagamento correspondente à configuração ativa.
   *
   * @param {ModoProvedorPagamento} [modoForcado] - Opcional para testes e injeção de dependência.
   * @returns {IPaymentProvider} Provedor pronto para uso.
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
