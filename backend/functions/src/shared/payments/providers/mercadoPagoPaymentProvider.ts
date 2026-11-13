// ============================================================================
// ARQUIVO: backend/functions/src/shared/payments/providers/mercadoPagoPaymentProvider.ts
// ============================================================================

import {
  CriarCobrancaProviderInput,
  CriarCobrancaProviderOutput,
  EventoStatusPagamento,
  IPaymentProvider,
  ModoProvedorPagamento,
} from "../types/paymentProviderTypes";
import { MercadoPagoPixClient } from "../../services/mercadoPagoPixClient";
import { mapearStatusMercadoPagoParaCanonico } from "../../../modules/tesouraria/helpers/statusPagamentoPixHelper";

/**
 * Adaptador para o gateway de pagamentos automatizado Mercado Pago.
 * Implementa IPaymentProvider consumindo a API REST do Mercado Pago e encapsula
 * a tradução de payloads, códigos de motivo e status específicos do gateway.
 */
export class MercadoPagoPaymentProvider implements IPaymentProvider {
  readonly modo: ModoProvedorPagamento = "MERCADOPAGO_API";

  /**
   * Extrai e normaliza o status bruto retornado pela API/webhook do Mercado Pago.
   *
   * @param {any} payload - Payload bruto do Mercado Pago.
   * @returns {string} Status normalizado (padrão `"pending"`).
   */
  static extrairStatus(payload: any): string {
    const status = String(payload?.status || "pending").trim();
    return status || "pending";
  }

  /**
   * Extrai o valor efetivamente pago em reais (R$) de um payload do Mercado Pago.
   *
   * @param {any} payload - Payload bruto do Mercado Pago.
   * @returns {number} Valor pago em reais.
   */
  static extrairValorPagoReais(payload: any): number {
    const valor = payload?.transaction_details?.total_paid_amount ?? payload?.transaction_amount;
    return Number.isFinite(Number(valor)) ? Number(valor) : 0;
  }

  /**
   * Extrai o timestamp ISO de liquidação/atualização do payload do Mercado Pago.
   *
   * @param {any} payload - Payload bruto do Mercado Pago.
   * @returns {string | null} Timestamp ISO ou `null`.
   */
  static extrairPagoEm(payload: any): string | null {
    return payload?.date_approved || payload?.last_updated || null;
  }

  /**
   * Traduz o código técnico `status_detail` retornado pelo Mercado Pago em uma
   * mensagem amigável em português para notificações e histórico.
   *
   * @param {any} payload - Payload do pagamento retornado pela API do Mercado Pago.
   * @returns {string} Mensagem legível descrevendo o motivo do cancelamento ou rejeição.
   */
  static obterMotivoFalha(payload: any): string {
    const detalhe = String(payload?.status_detail || "").trim().toLowerCase();

    if (!detalhe) {
      return "Pagamento não confirmado pelo banco.";
    }

    const mapaMotivos: Record<string, string> = {
      by_collector: "Cobrança Pix cancelada antes da conclusão do pagamento.",
      by_payer: "Pagamento cancelado pelo comprador no aplicativo do banco.",
      expired: "O tempo limite para pagamento do código Pix expirou.",
      accredited: "Pagamento confirmado pelo banco.",
      pending_waiting_transfer: "Aguardando transferência bancária do Pix.",
      cc_rejected_other_reason: "Pagamento recusado pelo banco do comprador.",
      rejected_high_risk: "Pagamento recusado por segurança pelo banco.",
      insufficient_amount: "Saldo insuficiente na conta do pagador.",
    };

    return (
      mapaMotivos[detalhe] ||
      "O pagamento não foi confirmado pelo banco e as rifas voltaram para venda."
    );
  }

  /**
   * Converte um payload bruto do Mercado Pago em um evento canônico de status de pagamento.
   *
   * @param {any} payload - Payload recebido via consulta ou webhook confiável do Mercado Pago.
   * @returns {EventoStatusPagamento} Evento normalizado independente de gateway.
   */
  static traduzirPayloadParaEvento(payload: any): EventoStatusPagamento {
    const statusBancoBruto = MercadoPagoPaymentProvider.extrairStatus(payload);
    const statusCanonico = mapearStatusMercadoPagoParaCanonico(statusBancoBruto);

    return {
      orderId: String(payload?.id || "").trim(),
      referenceId: payload?.external_reference ? String(payload.external_reference) : null,
      statusCanonico,
      statusBancoBruto,
      motivoFalha:
        statusCanonico === "cancelado"
          ? MercadoPagoPaymentProvider.obterMotivoFalha(payload)
          : null,
      valorPagoReais: MercadoPagoPaymentProvider.extrairValorPagoReais(payload),
      pagoEm: MercadoPagoPaymentProvider.extrairPagoEm(payload),
      rawPayload: payload,
    };
  }
  /**
   * Cria uma cobrança Pix dinâmica diretamente na API do Mercado Pago.
   *
   * @param {CriarCobrancaProviderInput} input - Dados do pagador e das rifas.
   * @returns {Promise<CriarCobrancaProviderOutput>} Cobrança com QR Code retornado pelo gateway.
   */
  async criarCobranca(input: CriarCobrancaProviderInput): Promise<CriarCobrancaProviderOutput> {
    if (!input.documento || !input.email) {
      throw new Error(
        "MERCADOPAGO_DADOS_OBRIGATORIOS_AUSENTES: CPF e e-mail são obrigatórios para emissão via Mercado Pago.",
      );
    }

    const resposta = await MercadoPagoPixClient.criarPedidoPix({
      referenceId: input.referenceId,
      nome: input.nome,
      telefone: input.telefone,
      email: input.email,
      documento: input.documento,
      numerosRifas: input.numerosRifas,
      valorCentavos: input.valorCentavos,
      expirationDate: input.expirationDate,
    });

    const orderId = String(resposta?.id || "").trim();
    const qrCodeData = resposta?.point_of_interaction?.transaction_data;
    const copiaECola = String(qrCodeData?.qr_code || "").trim();
    const qrCodeBase64 = qrCodeData?.qr_code_base64 || null;
    const expiraEm = resposta?.date_of_expiration || input.expirationDate;

    if (!orderId || !copiaECola) {
      throw new Error("MERCADOPAGO_RESPOSTA_INCOMPLETA");
    }

    return {
      orderId,
      copiaECola,
      qrCodeBase64,
      status: "WAITING",
      expiraEm,
      rawResponse: resposta,
    };
  }

  /**
   * Consulta o estado atual da transação no Mercado Pago.
   *
   * @param {string} orderId - Identificador numérico do pedido no gateway.
   * @returns {Promise<CriarCobrancaProviderOutput | null>}
   */
  async consultarCobranca(orderId: string): Promise<CriarCobrancaProviderOutput | null> {
    const pedido = await MercadoPagoPixClient.consultarPedido(orderId);
    if (!pedido) return null;

    const qrCodeData = pedido.point_of_interaction?.transaction_data;
    let status: "WAITING" | "PAID" | "EXPIRED" | "CANCELLED" = "WAITING";

    if (pedido.status === "approved") {
      status = "PAID";
    } else if (pedido.status === "cancelled" || pedido.status === "rejected") {
      status = "CANCELLED";
    }

    return {
      orderId: String(pedido.id),
      copiaECola: String(qrCodeData?.qr_code || ""),
      qrCodeBase64: qrCodeData?.qr_code_base64 || null,
      status,
      expiraEm: pedido.date_of_expiration || null,
      rawResponse: pedido,
    };
  }

  /**
   * Consulta o pedido no Mercado Pago e o traduz para o evento canônico de status.
   *
   * @param {string} orderId - Identificador do pedido no Mercado Pago.
   * @returns {Promise<EventoStatusPagamento | null>} Evento canônico ou `null` se não encontrado.
   */
  async consultarEventoStatus(orderId: string): Promise<EventoStatusPagamento | null> {
    const pedido = await MercadoPagoPixClient.consultarPedido(orderId);
    if (!pedido || !pedido.id) {
      return null;
    }

    return MercadoPagoPaymentProvider.traduzirPayloadParaEvento(pedido);
  }

  /**
   * Cancela a cobrança pendente no Mercado Pago.
   *
   * @param {string} orderId - Identificador do pedido a cancelar.
   * @returns {Promise<void>}
   */
  async cancelarCobranca(orderId: string): Promise<void> {
    await MercadoPagoPixClient.cancelarPedidoPix(orderId);
  }
}
