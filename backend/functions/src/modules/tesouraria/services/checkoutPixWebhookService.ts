// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/services/checkoutPixWebhookService.ts
// ============================================================================

import {
  MercadoPagoCheckoutStrategy,
  ProcessarWebhookMercadoPagoInput,
  ResultadoWebhookMercadoPago,
} from "../checkout/strategies/mercadoPagoCheckoutStrategy";
import { ResultadoAplicacaoEventoPix } from "../checkout/repositories/checkoutPixRepository";

export class CheckoutPixWebhookService {
  /**
   * Encaminha notificações Webhook do Mercado Pago para a estratégia OO especializada,
   * validando o status real diretamente via API do provedor.
   *
   * @param {ProcessarWebhookMercadoPagoInput} params - Payload bruto e metadados da requisição.
   * @returns {Promise<ResultadoWebhookMercadoPago>} Resultado da liquidação ou motivo de descarte.
   */
  static async processarWebhook(
    params: ProcessarWebhookMercadoPagoInput,
  ): Promise<ResultadoWebhookMercadoPago> {
    const strategy = new MercadoPagoCheckoutStrategy();
    return await strategy.processarWebhook(params);
  }

  /**
   * Traduz e aplica diretamente um payload confiável obtido da API do Mercado Pago.
   *
   * @param {any} payload - Objeto de pagamento retornado pela API do Mercado Pago.
   * @returns {Promise<ResultadoAplicacaoEventoPix>} Resultado da aplicação transacional no Firestore.
   */
  static async processarPayloadConfiavel(
    payload: any,
  ): Promise<ResultadoAplicacaoEventoPix> {
    const strategy = new MercadoPagoCheckoutStrategy();
    return await strategy.processarPayloadConfiavel(payload);
  }
}
