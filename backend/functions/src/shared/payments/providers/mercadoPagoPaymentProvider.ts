// ============================================================================
// ARQUIVO: backend/functions/src/shared/payments/providers/mercadoPagoPaymentProvider.ts
// ============================================================================

import {
  CriarCobrancaProviderInput,
  CriarCobrancaProviderOutput,
  IPaymentProvider,
} from "../types/paymentProviderTypes";
import { MercadoPagoPixClient } from "../../services/mercadoPagoPixClient";

/**
 * Adaptador para o gateway de pagamentos automatizado Mercado Pago.
 * Implementa IPaymentProvider consumindo a API REST do Mercado Pago.
 */
export class MercadoPagoPaymentProvider implements IPaymentProvider {
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
   * Cancela a cobrança pendente no Mercado Pago.
   *
   * @param {string} orderId - Identificador do pedido a cancelar.
   * @returns {Promise<void>}
   */
  async cancelarCobranca(orderId: string): Promise<void> {
    await MercadoPagoPixClient.cancelarPedidoPix(orderId);
  }
}
