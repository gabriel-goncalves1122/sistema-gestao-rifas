// ============================================================================
// ARQUIVO: backend/functions/src/shared/payments/types/paymentProviderTypes.ts
// ============================================================================

/**
 * Modos de operação suportados pela camada desacoplada de pagamentos.
 */
export type ModoProvedorPagamento =
  | "MERCADOPAGO_API"
  | "EMV_OFFLINE"
  | "COMPROVANTE_PURO";

/**
 * Parâmetros de entrada padronizados para criação de cobrança em qualquer provedor.
 */
export interface CriarCobrancaProviderInput {
  /** Identificador de referência externa no sistema (ex: referenceId com UID do comprador) */
  referenceId: string;
  /** Nome completo do comprador */
  nome: string;
  /** Telefone com DDD do comprador */
  telefone: string;
  /** E-mail do comprador (opcional para provedores locais/offline) */
  email?: string;
  /** Documento de identificação CPF/CNPJ (opcional para provedores locais/offline) */
  documento?: string;
  /** Lista de identificadores das rifas compradas */
  numerosRifas: string[];
  /** Valor total da transação em centavos inteiros (ex: R$ 30,00 -> 3000) */
  valorCentavos: number;
  /** Data limite de expiração da cobrança em formato ISO 8601 */
  expirationDate: string;
}

/**
 * Retorno padronizado de qualquer provedor de pagamentos.
 */
export interface CriarCobrancaProviderOutput {
  /** Identificador único do pedido no gateway ou identificador local txid */
  orderId: string;
  /** Sequência Pix Copia-e-Cola */
  copiaECola: string;
  /** Imagem do QR Code codificada em Base64 (PNG ou DataURL) */
  qrCodeBase64?: string | null;
  /** URL pública direta da imagem do QR Code, se disponibilizada pelo provedor */
  qrCodeImagemUrl?: string | null;
  /** Data limite de expiração confirmada pelo provedor */
  expiraEm?: string | null;
  /** Status canônico inicial da cobrança */
  status: "WAITING" | "PAID" | "EXPIRED" | "CANCELLED";
  /** Payload bruto devolvido pelo provedor para fins de auditoria/log */
  rawResponse?: unknown;
}

/**
 * Evento canônico de mudança ou consulta de status de pagamento,
 * desacoplado do formato bruto de qualquer gateway externo.
 */
export interface EventoStatusPagamento {
  /** Identificador do pedido no gateway ou txid local */
  orderId: string;
  /** Identificador de referência externa do checkout (`reference_id`) */
  referenceId?: string | null;
  /** Status traduzido para os três estados canônicos do domínio */
  statusCanonico: "pago" | "cancelado" | "aguardando_pagamento";
  /** Status bruto retornado pelo banco/gateway */
  statusBancoBruto: string;
  /** Mensagem amigável de falha ou cancelamento quando aplicável */
  motivoFalha?: string | null;
  /** Valor efetivamente pago em reais (R$) */
  valorPagoReais: number;
  /** Data/hora ISO da liquidação bancária */
  pagoEm?: string | null;
  /** Payload original retornado pelo provedor para auditoria */
  rawPayload?: unknown;
}

/**
 * Contrato universal de provedores de pagamento da aplicação.
 * Permite alternar entre Mercado Pago, gerador EMV Offline ou outros gateways.
 */
export interface IPaymentProvider {
  /** Identificador canônico do modo operacional do provedor */
  readonly modo: ModoProvedorPagamento;

  /**
   * Cria uma nova cobrança Pix e gera o QR Code / código Copia-e-Cola.
   *
   * @param {CriarCobrancaProviderInput} input - Dados normalizados do comprador e das rifas.
   * @returns {Promise<CriarCobrancaProviderOutput>} Dados da cobrança gerada.
   */
  criarCobranca(input: CriarCobrancaProviderInput): Promise<CriarCobrancaProviderOutput>;

  /**
   * Consulta o estado atual da cobrança junto ao provedor.
   *
   * @param {string} orderId - Identificador do pedido no provedor.
   * @returns {Promise<CriarCobrancaProviderOutput | null>} Estado da cobrança ou null se não encontrada.
   */
  consultarCobranca(orderId: string): Promise<CriarCobrancaProviderOutput | null>;

  /**
   * Consulta e traduz o estado atual da cobrança em um evento canônico de domínio.
   * Provedores offline sem API de consulta retornam `null`.
   *
   * @param {string} orderId - Identificador do pedido no provedor.
   * @returns {Promise<EventoStatusPagamento | null>} Evento traduzido ou `null`.
   */
  consultarEventoStatus?(orderId: string): Promise<EventoStatusPagamento | null>;

  /**
   * Solicita o cancelamento/invalidação de uma cobrança pendente.
   *
   * @param {string} orderId - Identificador do pedido a ser cancelado.
   * @returns {Promise<void>}
   */
  cancelarCobranca(orderId: string): Promise<void>;
}
