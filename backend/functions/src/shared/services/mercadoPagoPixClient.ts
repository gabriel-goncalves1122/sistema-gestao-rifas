// ============================================================================
// ARQUIVO: backend/functions/src/shared/services/mercadoPagoPixClient.ts
// ============================================================================
import axios from "axios";
import { randomUUID } from "crypto";
import { somenteNumeros } from "../utils/formatadores";

interface CriarPedidoPixParams {
  referenceId: string;
  nome: string;
  telefone: string;
  email: string;
  documento: string;
  numerosRifas: string[];
  valorCentavos: number;
  expirationDate: string;
}

export interface MercadoPagoPaymentResponse {
  id: number | string;
  status: string;
  status_detail?: string;
  external_reference?: string;
  date_of_expiration?: string;
  date_approved?: string;
  last_updated?: string;
  transaction_amount?: number;
  transaction_details?: {
    total_paid_amount?: number;
  };
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
}



function obterTokenApi() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!token) {
    throw new Error("MERCADOPAGO_NOT_CONFIGURED");
  }

  return token;
}

function obterNotificationUrl() {
  const baseUrl = process.env.API_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  return baseUrl ? `${baseUrl}/tesouraria/checkout/pix/webhook` : undefined;
}

export class MercadoPagoPixClient {
  static async criarPedidoPix(params: CriarPedidoPixParams): Promise<MercadoPagoPaymentResponse> {
    // Mercado Pago aceita valores em ponto flutuante (reais) em vez de centavos
    const transactionAmount = params.valorCentavos / 100;

    const partesNome = (params.nome || "").trim().split(" ");
    const firstName = partesNome[0] || "";
    const lastName = partesNome.length > 1 ? partesNome.slice(1).join(" ") : undefined;

    const payload: Record<string, any> = {
      transaction_amount: transactionAmount,
      description: `Rifas ${params.numerosRifas.join(", ")}`,
      payment_method_id: "pix",
      payer: {
        email: params.email,
        first_name: firstName,
        ...(lastName ? { last_name: lastName } : {}),
      },
      date_of_expiration: params.expirationDate,
      notification_url: obterNotificationUrl(),
      external_reference: params.referenceId,
    };

    const docNumeros = somenteNumeros(params.documento);
    if (docNumeros.length === 11) {
      payload.payer.identification = {
        type: "CPF",
        number: docNumeros,
      };
    } else if (docNumeros.length === 14) {
      payload.payer.identification = {
        type: "CNPJ",
        number: docNumeros,
      };
    }

    const idempotencyKey = randomUUID();

    try {
      const resposta = await axios.post("https://api.mercadopago.com/v1/payments", payload, {
        headers: {
          Authorization: `Bearer ${obterTokenApi()}`,
          "X-Idempotency-Key": idempotencyKey,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      return resposta.data;
    } catch (error: any) {
      if (
        error.response?.status === 400 &&
        error.response?.data?.message === "Invalid user identification number"
      ) {
        throw new Error("MERCADOPAGO_DOCUMENTO_INVALIDO");
      }
      throw error;
    }
  }

  static async consultarPedido(orderId: string): Promise<MercadoPagoPaymentResponse | null> {
    try {
      const resposta = await axios.get(`https://api.mercadopago.com/v1/payments/${orderId}`, {
        headers: {
          Authorization: `Bearer ${obterTokenApi()}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      return resposta.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  static async cancelarPedidoPix(orderId: string): Promise<MercadoPagoPaymentResponse | null> {
    try {
      const resposta = await axios.put(
        `https://api.mercadopago.com/v1/payments/${orderId}`,
        { status: "cancelled" },
        {
          headers: {
            Authorization: `Bearer ${obterTokenApi()}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      return resposta.data;
    } catch (error: any) {
      if (error.response) {
        console.warn(`[MercadoPagoPixClient] Erro ao cancelar pedido ${orderId}. Status: ${error.response.status}`, error.response.data);
        return null; // O pedido pode não existir ou já estar cancelado, ignorar
      }
      throw error;
    }
  }
}
