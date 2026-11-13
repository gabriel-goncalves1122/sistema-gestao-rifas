// ============================================================================
// ARQUIVO: backend/functions/src/shared/payments/providers/emvOfflinePaymentProvider.ts
// ============================================================================

import QRCode from "qrcode";

import {
  CriarCobrancaProviderInput,
  CriarCobrancaProviderOutput,
  EventoStatusPagamento,
  IPaymentProvider,
  ModoProvedorPagamento,
} from "../types/paymentProviderTypes";
import { gerarPayloadPixEmv } from "../utils/emvPixUtils";

/**
 * Provedor de Pagamentos Pix EMV Offline (Contingência e Chave Direta).
 *
 * Gera códigos BR Code Copia-e-Cola e QR Code 100% locais sem depender de requisições de rede.
 * Insere a chave Pix da InfinitePay (ou outra chave configurada), valor exato e txid único por venda.
 */
export class EmvOfflinePaymentProvider implements IPaymentProvider {
  readonly modo: ModoProvedorPagamento = "EMV_OFFLINE";
  private readonly chavePix: string;
  private readonly nomeBeneficiario: string;
  private readonly cidadeBeneficiario: string;

  constructor() {
    this.chavePix =
      process.env.PIX_CHAVE_ESTATICA ||
      process.env.CHAVE_PIX_INFINITEPAY ||
      "d23badb8-4e1c-480b-ae3d-064a58bfe174";
    this.nomeBeneficiario = process.env.PIX_NOME_BENEFICIARIO || "COMISSAO FORMATURA UNIFEI";
    this.cidadeBeneficiario = process.env.PIX_CIDADE_BENEFICIARIO || "ITAJUBA";
  }

  /**
   * Gera o identificador único txid da transação para conciliação bancária no extrato.
   *
   * @param {string} referenceId - Identificador de referência do comprador / sessão.
   * @returns {string} Código alfanumérico curto de identificação (máximo 25 caracteres).
   */
  private gerarTxId(referenceId: string): string {
    const limpo = referenceId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const sufixo = limpo.slice(-10) || Date.now().toString(36).toUpperCase();
    return `RIFA${sufixo}`.substring(0, 25);
  }

  /**
   * Gera o Pix Copia-e-Cola e imagem do QR Code em Base64 offline.
   *
   * @param {CriarCobrancaProviderInput} input - Dados do pagador e das rifas.
   * @returns {Promise<CriarCobrancaProviderOutput>} Cobrança com QR Code gerado em memória.
   */
  async criarCobranca(input: CriarCobrancaProviderInput): Promise<CriarCobrancaProviderOutput> {
    const txid = this.gerarTxId(input.referenceId);

    const copiaECola = gerarPayloadPixEmv({
      chavePix: this.chavePix,
      nomeBeneficiario: this.nomeBeneficiario,
      cidadeBeneficiario: this.cidadeBeneficiario,
      valorCentavos: input.valorCentavos,
      txid,
    });

    // Gera a imagem do QR Code em Base64 PNG de alta qualidade
    const qrCodeDataUrl = await QRCode.toDataURL(copiaECola, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
    });

    // Remove o prefixo data:image/png;base64, para compatibilidade com o formato esperado pelo frontend
    const base64Puro = qrCodeDataUrl.replace(/^data:image\/[a-z]+;base64,/, "");

    return {
      orderId: txid,
      copiaECola,
      qrCodeBase64: base64Puro,
      qrCodeImagemUrl: qrCodeDataUrl,
      expiraEm: input.expirationDate,
      status: "WAITING",
      rawResponse: {
        txid,
        chave: this.chavePix,
        beneficiario: this.nomeBeneficiario,
        provedor: this.modo,
        geradoOffline: true,
      },
    };
  }

  /**
   * No modo offline sem conexão com API bancária em tempo real,
   * não há evento externo para consultar.
   *
   * @param {string} _orderId - Identificador txid.
   * @returns {Promise<EventoStatusPagamento | null>} Sempre `null`.
   */
  async consultarEventoStatus(_orderId: string): Promise<EventoStatusPagamento | null> {
    return null;
  }

  /**
   * No modo offline sem conexão com API bancária em tempo real,
   * a consulta pontual externa não se aplica.
   *
   * @param {string} orderId - Identificador txid.
   * @returns {Promise<CriarCobrancaProviderOutput | null>}
   */
  async consultarCobranca(orderId: string): Promise<CriarCobrancaProviderOutput | null> {
    return {
      orderId,
      copiaECola: "",
      status: "WAITING",
      rawResponse: { geradoOffline: true },
    };
  }

  /**
   * No modo offline, a invalidação é gerenciada unicamente pelo Firestore local.
   *
   * @param {string} _orderId - Identificador txid.
   * @returns {Promise<void>}
   */
  async cancelarCobranca(_orderId: string): Promise<void> {
    // No-op para provedores estáticos offline
  }
}
