// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/checkout/strategies/mercadoPagoCheckoutStrategy.ts
// ============================================================================

import { PagamentoPix } from "../../../types/models";
import { CheckoutPixDadosNormalizados } from "../../helpers/checkoutPixHelper";
import { MercadoPagoPaymentProvider } from "../../../../shared/payments/providers/mercadoPagoPaymentProvider";
import {
  EventoStatusPagamento,
  IPaymentProvider,
  ModoProvedorPagamento,
} from "../../../../shared/payments/types/paymentProviderTypes";
import {
  CheckoutPixRepository,
  ResultadoAplicacaoEventoPix,
} from "../repositories/checkoutPixRepository";
import { BaseCheckoutStrategy } from "./baseCheckoutStrategy";

export interface ProcessarWebhookMercadoPagoInput {
  payload: any;
  rawBody: string;
  assinatura?: string;
}

export type ResultadoWebhookMercadoPago =
  | { sucesso: true; ignorado: true; motivo: string }
  | ResultadoAplicacaoEventoPix;

/**
 * Estratégia OO dedicada ao fluxo automatizado via API do Mercado Pago (`MERCADOPAGO_API`).
 * Isola regras de validação obrigatória de pagador (CPF/e-mail), consulta de pedido,
 * cancelamento remoto no gateway e processamento de notificações Webhook.
 */
export class MercadoPagoCheckoutStrategy extends BaseCheckoutStrategy {
  readonly tipo: ModoProvedorPagamento = "MERCADOPAGO_API";

  constructor(
    repository: CheckoutPixRepository = new CheckoutPixRepository(),
    provider: IPaymentProvider = new MercadoPagoPaymentProvider(),
  ) {
    super(repository, provider);
  }

  /**
   * Valida que CPF/CNPJ e e-mail foram informados antes de iniciar transação no Firestore.
   *
   * @param {CheckoutPixDadosNormalizados} dados - Dados normalizados do comprador.
   */
  protected validarDadosEspecificos(dados: CheckoutPixDadosNormalizados): void {
    if (!dados.documento || !dados.email) {
      throw new Error(
        "MERCADOPAGO_DADOS_OBRIGATORIOS_AUSENTES: CPF e e-mail são obrigatórios para emissão via Mercado Pago.",
      );
    }
  }

  /**
   * Consulta o estado real do pedido diretamente na API do Mercado Pago
   * e converte para o evento canônico do domínio.
   *
   * @param {PagamentoPix} pagamento - Registro do pagamento.
   * @returns {Promise<EventoStatusPagamento | null>} Evento traduzido ou `null`.
   */
  protected async consultarEventoExterno(
    pagamento: PagamentoPix,
  ): Promise<EventoStatusPagamento | null> {
    const orderId = String(pagamento.pix_order_id || pagamento.id || "").trim();
    if (!orderId) return null;

    if (typeof this.provider.consultarEventoStatus === "function") {
      return await this.provider.consultarEventoStatus(orderId);
    }

    return null;
  }

  /**
   * Invalida o QR Code dinâmico diretamente na API do Mercado Pago.
   *
   * @param {PagamentoPix} pagamento - Registro do pagamento cancelado/expirado.
   * @returns {Promise<void>}
   */
  protected async cancelarNoProvedorExterno(pagamento: PagamentoPix): Promise<void> {
    if (!pagamento.pix_order_id) return;
    await this.provider.cancelarCobranca(pagamento.pix_order_id);
  }

  /**
   * Cobranças dinâmicas via Mercado Pago são liquidadas por Webhook/API, não por confirmação manual.
   *
   * @returns {boolean} Sempre `false`.
   */
  protected permiteConfirmacaoManual(): boolean {
    return false;
  }

  protected mensagemExpiracaoAutomatica(): string {
    return "Pagamento expirado (limpeza automática por inatividade).";
  }

  protected mensagemErroExpiracaoCron(): string {
    return "Expirado automaticamente (CRON).";
  }

  /**
   * Processa uma notificação Webhook recebida do Mercado Pago validando o estado real
   * diretamente por consulta à API do gateway antes de liquidar ou liberar os bilhetes.
   *
   * @param {ProcessarWebhookMercadoPagoInput} params - Payload bruto e cabeçalhos recebidos.
   * @returns {Promise<ResultadoWebhookMercadoPago>} Resultado da operação ou motivo de descarte seguro.
   */
  async processarWebhook(
    params: ProcessarWebhookMercadoPagoInput,
  ): Promise<ResultadoWebhookMercadoPago> {
    const action = params.payload?.action || params.payload?.topic;
    const paymentId = params.payload?.data?.id || params.payload?.id;

    if (!paymentId) {
      return { sucesso: true, ignorado: true, motivo: "sem_payment_id" };
    }

    if (
      action !== "payment.updated" &&
      action !== "payment" &&
      params.payload?.type !== "payment"
    ) {
      return { sucesso: true, ignorado: true, motivo: "nao_e_payment_updated" };
    }

    const evento =
      typeof this.provider.consultarEventoStatus === "function"
        ? await this.provider.consultarEventoStatus(String(paymentId))
        : null;

    if (!evento) {
      return { sucesso: true, ignorado: true, motivo: "MERCADOPAGO_PAYMENT_NOT_FOUND" };
    }

    return await this.repository.aplicarEventoPagamento(evento);
  }

  /**
   * Traduz e aplica diretamente um payload confiável já consultado do Mercado Pago.
   *
   * @param {any} payload - Resposta confiável da API do Mercado Pago.
   * @returns {Promise<ResultadoAplicacaoEventoPix>} Resultado da aplicação transacional.
   */
  async processarPayloadConfiavel(payload: any): Promise<ResultadoAplicacaoEventoPix> {
    const evento = MercadoPagoPaymentProvider.traduzirPayloadParaEvento(payload);
    return await this.repository.aplicarEventoPagamento(evento);
  }
}
