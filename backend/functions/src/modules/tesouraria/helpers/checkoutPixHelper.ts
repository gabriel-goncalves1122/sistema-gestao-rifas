// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/helpers/checkoutPixHelper.ts
// ============================================================================
import crypto from "crypto";

import {
  CheckoutPixResposta,
  CheckoutPixStatus,
  CriarCheckoutPixPayload,
} from "../types/checkoutPixTypes";
import { Bilhete } from "../../types/models";
import { somenteNumeros } from "../../../shared/utils/formatadores";
import { mapearStatusMercadoPagoParaCanonico } from "./statusPagamentoPixHelper";

export const VALOR_RIFA_REAIS = 10;

export interface CheckoutPixDadosNormalizados {
  nome: string;
  telefone: string;
  email?: string;
  documento?: string;
  numerosRifas: string[];
  sessaoCheckoutId?: string;
}

export interface QrCodeCheckoutNormalizado {
  id: string;
  copiaECola: string;
  expiraEm?: string | null;
  qrCodeImagemUrl?: string | null;
  qrCodeBase64?: string | null;
}

export const CHECKOUT_PIX_IDEMPOTENCIA_JANELA_MS = 5 * 60 * 1000;
export const LOCK_CRIANDO_TIMEOUT_MS = 45 * 1000;

/**
 * Verifica se um bilhete atualmente em status 'reservado' já teve sua reserva Pix expirada
 * sem confirmação bancária e sem comprovante anexado, podendo ser considerado disponível novamente.
 *
 * @param {Partial<Bilhete>} dados - Dados do bilhete avaliado.
 * @param {number} [agoraMs=Date.now()] - Timestamp atual em milissegundos.
 * @returns {boolean} `true` se for uma reserva Pix expirada ou órfã sem pagamento.
 */
export function isReservaBilheteExpirada(
  dados: Partial<Bilhete>,
  agoraMs = Date.now(),
): boolean {
  if (dados.status !== "reservado") {
    return false;
  }

  if (dados.comprovante_url) {
    return false;
  }

  const statusBanco = String(dados.status_pagamento_banco || "").toUpperCase();
  if (["PAID", "AUTHORIZED", "IN_ANALYSIS", "APPROVED"].includes(statusBanco)) {
    return false;
  }

  if (dados.data_expiracao) {
    const expiraMs = new Date(dados.data_expiracao).getTime();
    if (Number.isFinite(expiraMs) && agoraMs > expiraMs) {
      return true;
    }
  }

  if (
    dados.status_pagamento_banco === "CRIANDO" &&
    !dados.pix_order_id &&
    dados.data_reserva
  ) {
    const reservadoEmMs = new Date(dados.data_reserva).getTime();
    if (Number.isFinite(reservadoEmMs) && agoraMs - reservadoEmMs > LOCK_CRIANDO_TIMEOUT_MS) {
      return true;
    }
  }

  return false;
}

/**
 * Avalia se um bilhete de rifa está elegível para reserva no fluxo de Checkout Pix.
 * Considera elegível se o status for 'disponivel', se a reserva anterior estiver expirada,
 * se pertencer à mesma sessão de checkout ativa do comprador ou se for uma reserva órfã em 'CRIANDO',
 * desde que pertença ao vendedor esperado.
 *
 * @param {Partial<Bilhete>} dados - Dados parciais ou completos do bilhete no Firestore.
 * @param {string} [sessaoCheckoutId] - ID da sessão de checkout atual no cliente para permitir re-reserva.
 * @param {string} [vendedorIdEsperado] - UID do vendedor aderido que deve ser o dono do lote do bilhete.
 * @returns {boolean} `true` se o bilhete estiver disponível para reserva Pix; caso contrário, `false`.
 */
export function isRifaDisponivelParaPix(
  dados: Partial<Bilhete>,
  sessaoCheckoutId?: string,
  vendedorIdEsperado?: string,
): boolean {
  if (vendedorIdEsperado && dados.vendedor_id && dados.vendedor_id !== vendedorIdEsperado) {
    return false;
  }

  let disponivel = dados.status === "disponivel" || isReservaBilheteExpirada(dados);

  if (!disponivel && dados.data_expiracao) {
    if (new Date() > new Date(dados.data_expiracao)) {
      disponivel = true;
    }
  }

  if (
    !disponivel &&
    sessaoCheckoutId &&
    dados.sessao_checkout_id === sessaoCheckoutId
  ) {
    disponivel = true;
  }

  return disponivel;
}

/**
 * Sanitiza e deduplica uma lista de números de rifas informada na requisição.
 * Remove espaços em branco nas pontas e descarta strings vazias.
 *
 * @param {unknown} valor - Entrada bruta enviada no payload (espera-se um array de strings/números).
 * @returns {string[]} Lista de números de rifa únicos e sanitizados.
 */
export function normalizarNumerosRifas(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];

  return Array.from(
    new Set(
      valor
        .map((numero) => String(numero || "").trim())
        .filter((numero) => numero.length > 0),
    ),
  );
}

/**
 * Normaliza e valida os dados de entrada de um comprador para criação de cobrança Pix.
 * Limpa máscaras de telefone e documento e garante que campos obrigatórios (nome, telefone, rifas) estejam presentes.
 * Email e documento são opcionais no modelo EMV / Nova API, mas validados quando presentes.
 *
 * @param {CriarCheckoutPixPayload} payload - Payload bruto recebido na rota de checkout Pix.
 * @returns {CheckoutPixDadosNormalizados} Estrutura sanitizada com campos prontos para processamento.
 * @throws {Error} Dispara exceção com mensagem "INVALID_DATA" se algum campo obrigatório for nulo ou vazio.
 */
export function normalizarDadosCheckoutPix(
  payload: CriarCheckoutPixPayload,
): CheckoutPixDadosNormalizados {
  const nome = String(payload?.nome || "").trim();
  const telefone = somenteNumeros(payload?.telefone);
  const email = payload?.email ? String(payload.email).trim().toLowerCase() : undefined;
  const documento = payload?.documento ? somenteNumeros(payload.documento) : undefined;
  const numerosRifas = normalizarNumerosRifas(payload?.numerosRifas);

  if (!nome || !telefone || numerosRifas.length === 0) {
    throw new Error("INVALID_DATA");
  }

  return {
    nome,
    telefone,
    email,
    documento,
    numerosRifas,
    sessaoCheckoutId: payload?.sessaoCheckoutId || undefined,
  };
}

/**
 * Calcula o valor total em reais (R$) para um lote de números de rifas.
 *
 * @param {string[]} numerosRifas - Lista de números de rifas selecionados.
 * @returns {number} Valor monetário total em reais (R$).
 */
export function calcularValorPixReais(numerosRifas: string[]): number {
  return numerosRifas.length * VALOR_RIFA_REAIS;
}

/**
 * Calcula o valor total em centavos para processamento em gateways financeiros.
 *
 * @param {string[]} numerosRifas - Lista de números de rifas selecionados.
 * @returns {number} Valor total em centavos (inteiro).
 */
export function calcularValorPixCentavos(numerosRifas: string[]): number {
  return calcularValorPixReais(numerosRifas) * 100;
}

/**
 * Calcula o timestamp ISO 8601 de expiração de uma cobrança Pix (15 minutos por padrão).
 *
 * @param {Date} [dataBase=new Date()] - Data/hora de início para cálculo do tempo limite.
 * @returns {string} Timestamp no padrão ISO 8601 em UTC (sufixo 'Z').
 */
export function dataExpiracaoPix(dataBase = new Date()): string {
  const expiraEm = new Date(dataBase);
  expiraEm.setMinutes(expiraEm.getMinutes() + 15);

  // Format to UTC with 'Z' as recommended by Mercado Pago to avoid offset parsing bugs
  return expiraEm.toISOString();
}

/**
 * Constrói o identificador de referência externa (`reference_id`) único para o gateway de pagamento.
 *
 * @param {string} compradorId - Identificador único do comprador no Firestore.
 * @returns {string} String de referência com prefixo `rifas-pix-`.
 */
export function montarReferenceIdPix(compradorId: string): string {
  return `rifas-pix-${compradorId}`;
}

/**
 * Gera uma chave de idempotência determinística em SHA-256 baseada no vendedor,
 * bilhetes ordenados, dados do comprador (opcional) e uma janela temporal de 5 minutos,
 * evitando cobranças duplicadas em cliques repetidos sem bloquear correções cadastrais.
 *
 * @param {Object} params - Parâmetros da cobrança.
 * @param {string} params.vendedorId - UID do vendedor logado.
 * @param {string[]} params.numerosRifas - Lista de números de rifa envolvidos.
 * @param {string} [params.documento] - CPF ou CNPJ do comprador para diferenciar retentativas após correção.
 * @param {string} [params.email] - E-mail do comprador para diferenciar retentativas após correção.
 * @param {Date} [params.dataBase] - Timestamp base para cálculo da janela.
 * @returns {string} Hash SHA-256 hexadecimal de idempotência.
 */
export function montarIdempotencyKeyPix(params: {
  vendedorId: string;
  numerosRifas: string[];
  documento?: string;
  email?: string;
  dataBase?: Date;
}): string {
  const janela = Math.floor(
    (params.dataBase || new Date()).getTime() /
      CHECKOUT_PIX_IDEMPOTENCIA_JANELA_MS,
  );
  const rifasOrdenadas = [...params.numerosRifas].sort().join(",");
  const sufixoComprador =
    params.documento || params.email
      ? `|${somenteNumeros(params.documento)}|${String(params.email || "").trim().toLowerCase()}`
      : "";

  return crypto
    .createHash("sha256")
    .update(`${params.vendedorId}|${rifasOrdenadas}|${janela}${sufixoComprador}`)
    .digest("hex");
}

/**
 * Mapeia o status retornado pelo provedor financeiro para os status canônicos do Checkout Pix na UI.
 *
 * @param {string} status - Status recebido do gateway de pagamento (ex: 'approved', 'cancelled', 'in_process').
 * @returns {CheckoutPixStatus} Status canônico: 'pago', 'cancelado' ou 'aguardando_pagamento'.
 */
export function mapearStatusCheckoutPix(status: string): CheckoutPixStatus {
  const canonico = mapearStatusMercadoPagoParaCanonico(status);
  if (canonico === "pago") return "pago";
  if (canonico === "cancelado") return "cancelado";
  return "aguardando_pagamento";
}

/**
 * Monta o DTO de resposta que o frontend consome ao iniciar uma sessão de Checkout Pix.
 *
 * @param {Object} params - Dados da resposta montada.
 * @param {string} params.id - ID da cobrança no sistema.
 * @param {string} params.status - Status da cobrança.
 * @param {QrCodeCheckoutNormalizado} params.qrCode - Dados normalizados do QR Code.
 * @param {string[]} params.numerosRifas - Lista de rifas associadas.
 * @returns {CheckoutPixResposta} DTO em camelCase para consumo no React.
 */
export function montarRespostaCheckoutPix(params: {
  id: string;
  status: string;
  qrCode: QrCodeCheckoutNormalizado;
  numerosRifas: string[];
}): CheckoutPixResposta {
  return {
    id: params.id,
    status: mapearStatusCheckoutPix(params.status),
    qrCodeImagemUrl: params.qrCode.qrCodeImagemUrl,
    qrCodeBase64: params.qrCode.qrCodeBase64,
    copiaECola: params.qrCode.copiaECola,
    expiraEm: params.qrCode.expiraEm,
    numerosRifas: params.numerosRifas,
  };
}
