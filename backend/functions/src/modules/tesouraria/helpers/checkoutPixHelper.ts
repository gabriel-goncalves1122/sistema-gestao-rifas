// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/helpers/checkoutPixHelper.ts
// ============================================================================
import crypto from "crypto";

import {
  CheckoutPixResposta,
  CheckoutPixStatus,
  CriarCheckoutPixPayload,
} from "../types/checkoutPixTypes";
import { Bilhete, Comprador, PagamentoPix } from "../../types/models";
import { somenteNumeros } from "../../../shared/utils/formatadores";
import { mapearStatusMercadoPagoParaCanonico } from "./statusPagamentoPixHelper";

export const VALOR_RIFA_REAIS = 10;

export interface CheckoutPixDadosNormalizados {
  nome: string;
  telefone: string;
  email: string;
  documento: string;
  numerosRifas: string[];
  sessaoCheckoutId?: string;
}

export interface MercadoPagoQrCodeNormalizado {
  id: string;
  copiaECola: string;
  expiraEm?: string | null;
  qrCodeImagemUrl?: string | null;
  qrCodeBase64?: string | null;
}

export const CHECKOUT_PIX_IDEMPOTENCIA_JANELA_MS = 5 * 60 * 1000;

/**
 * Avalia se um bilhete de rifa está elegível para reserva no fluxo de Checkout Pix.
 * Considera elegível se o status for 'disponivel', se a reserva anterior estiver expirada
 * ou se pertencer à mesma sessão de checkout ativa do comprador, desde que pertença ao vendedor esperado.
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

  let disponivel = dados.status === "disponivel";

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
 * Limpa máscaras de telefone e documento e garante que campos obrigatórios estejam presentes.
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
  const email = String(payload?.email || "").trim();
  const documento = somenteNumeros(payload?.documento);
  const numerosRifas = normalizarNumerosRifas(payload?.numerosRifas);

  if (!nome || !telefone || !email || !documento || numerosRifas.length === 0) {
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
 * Calcula o timestamp ISO 8601 de expiração de uma cobrança Pix (30 minutos por padrão).
 *
 * @param {Date} [dataBase=new Date()] - Data/hora de início para cálculo do tempo limite.
 * @returns {string} Timestamp no padrão ISO 8601 em UTC (sufixo 'Z').
 */
export function dataExpiracaoPix(dataBase = new Date()): string {
  const expiraEm = new Date(dataBase);
  expiraEm.setMinutes(expiraEm.getMinutes() + 30);
  
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
 * bilhetes ordenados e uma janela temporal de 5 minutos, evitando cobranças duplicadas em cliques repetidos.
 *
 * @param {Object} params - Parâmetros da cobrança.
 * @param {string} params.vendedorId - UID do vendedor logado.
 * @param {string[]} params.numerosRifas - Lista de números de rifa envolvidos.
 * @param {Date} [params.dataBase] - Timestamp base para cálculo da janela.
 * @returns {string} Hash SHA-256 hexadecimal de idempotência.
 */
export function montarIdempotencyKeyPix(params: {
  vendedorId: string;
  numerosRifas: string[];
  dataBase?: Date;
}): string {
  const janela = Math.floor(
    (params.dataBase || new Date()).getTime() /
      CHECKOUT_PIX_IDEMPOTENCIA_JANELA_MS,
  );
  const rifasOrdenadas = [...params.numerosRifas].sort().join(",");

  return crypto
    .createHash("sha256")
    .update(`${params.vendedorId}|${rifasOrdenadas}|${janela}`)
    .digest("hex");
}

/**
 * Normaliza os dados brutos de resposta do Mercado Pago contendo QR Code e chave Pix Copia e Cola.
 *
 * @param {any} resposta - Resposta JSON da API do Mercado Pago.
 * @returns {MercadoPagoQrCodeNormalizado} Objeto tipado com QR Code, payload copia-e-cola e expiração.
 * @throws {Error} Dispara "MERCADOPAGO_QR_CODE_INVALIDO" se ID ou string copia-e-cola estiverem ausentes.
 */
export function normalizarQrCodeMercadoPago(resposta: any): MercadoPagoQrCodeNormalizado {
  const transactionData = resposta?.point_of_interaction?.transaction_data;
  const id = String(resposta?.id || "").trim();
  const copiaECola = String(transactionData?.qr_code || "").trim();

  if (!id || !copiaECola) {
    throw new Error("MERCADOPAGO_QR_CODE_INVALIDO");
  }

  return {
    id,
    copiaECola,
    expiraEm: resposta?.date_of_expiration || null,
    qrCodeImagemUrl: null, // MP usually gives base64
    qrCodeBase64: transactionData?.qr_code_base64 || null,
  };
}

/**
 * Mapeia o status retornado pelo Mercado Pago para os status canônicos do Checkout Pix na UI.
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
 * @param {string} params.id - ID da cobrança no gateway.
 * @param {string} params.status - Status da cobrança.
 * @param {MercadoPagoQrCodeNormalizado} params.qrCode - Dados normalizados do QR Code.
 * @param {string[]} params.numerosRifas - Lista de rifas associadas.
 * @returns {CheckoutPixResposta} DTO em camelCase para consumo no React.
 */
export function montarRespostaCheckoutPix(params: {
  id: string;
  status: string;
  qrCode: MercadoPagoQrCodeNormalizado;
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

/**
 * Extrai e normaliza com segurança o status de pagamento de um payload bruto do Mercado Pago.
 *
 * @param {any} payload - Payload webhook ou resposta do endpoint de pagamentos.
 * @returns {string} Status em string minúscula (padrão: "pending").
 */
export function extrairStatusPagamentoMercadoPago(payload: any): string {
  const status = String(payload?.status || "pending").trim();
  return status || "pending";
}

/**
 * Extrai o valor monetário pago em reais (R$) de um payload do Mercado Pago.
 *
 * @param {any} payload - Payload bruto do gateway.
 * @returns {number} Valor numérico pago em reais.
 */
export function extrairValorPagoReaisMercadoPago(payload: any): number {
  const valor = payload?.transaction_details?.total_paid_amount ?? payload?.transaction_amount;
  return Number.isFinite(Number(valor)) ? Number(valor) : 0;
}

/**
 * Extrai a data/hora em que o pagamento foi aprovado pelo gateway financeiro.
 *
 * @param {any} payload - Payload bruto do gateway.
 * @returns {string | null} Timestamp ISO ou null se não aprovado.
 */
export function extrairPagoEmMercadoPago(payload: any): string | null {
  return payload?.date_approved || payload?.last_updated || null;
}

/**
 * Libera ou reverte atômica e transacionalmente bilhetes de rifa reservados no Firestore.
 * Implementa guardas de segurança para evitar concorrência (TOCTOU):
 * 1. Guarda de posse: não altera bilhetes que foram reatribuídos a outra transação/carrinho.
 * 2. Guarda de pagamento: nunca sobrescreve bilhetes já marcados como pagos/validados a menos
 *    que o novo status bancário seja de aprovação.
 *
 * @param {FirebaseFirestore.Transaction} transaction - Transação Firestore ativa onde as operações de leitura e escrita ocorrem.
 * @param {FirebaseFirestore.Firestore} db - Instância do Firestore.
 * @param {FirebaseFirestore.FieldValue} FieldValueDelete - Valor sentinela FieldValue.delete() para limpar campos.
 * @param {string[]} numerosRifas - Lista de números dos bilhetes a serem liberados/atualizados.
 * @param {string} statusBanco - Status de pagamento recebido do banco (ex: 'cancelled', 'expired', 'approved').
 * @param {string | null} motivo - Motivo do cancelamento ou recusa, se aplicável.
 * @param {boolean} [reterReserva=false] - Se `true`, preserva os dados da reserva alterando apenas metadados; se `false`, retorna para 'disponivel'.
 * @param {string} [sessaoCheckoutId] - ID da sessão para preservação caso reterReserva seja true.
 * @param {string} [referenciaParaValidar] - ID de referência da cobrança Pix original para garantir posse do bilhete.
 * @returns {Promise<void>}
 * @transactional Esta função opera estritamente dentro da transação Firestore fornecida.
 * @sideEffects Atualiza os documentos dos bilhetes na coleção 'bilhetes'.
 */
export async function liberarBilhetesNaTransacao(
  transaction: any,
  db: any, // admin.firestore.Firestore
  FieldValueDelete: any, // admin.firestore.FieldValue.delete()
  numerosRifas: string[],
  statusBanco: string,
  motivo: string | null,
  reterReserva = false,
  sessaoCheckoutId?: string,
  referenciaParaValidar?: string // Optional reference_id from the pagamento
): Promise<void> {
  if (!numerosRifas || numerosRifas.length === 0) return;

  const refs = numerosRifas.map((numero) => db.collection("bilhetes").doc(numero));
  const bilhetesSnaps = await transaction.getAll(...refs);

  bilhetesSnaps.forEach((snap: any) => {
    if (!snap.exists) return;
    
    const bilhete = snap.data();
    
    // GUARDA DE POSSE: Se tivermos uma referência para validar, só libera o bilhete
    // se ele ainda pertencer àquela transação/carrinho original.
    if (referenciaParaValidar && bilhete.pix_reference_id && bilhete.pix_reference_id !== referenciaParaValidar) {
      return; // Este bilhete pertence a outro checkout! Não mexa!
    }
    
    // GUARDA ADICIONAL: Nunca sobrescreva um bilhete que já foi "pago" no banco 
    // ou validado pela tesouraria, a menos que o novo status do banco seja aprovado.
    if (bilhete.status === "pago" && statusBanco !== "approved" && statusBanco !== "authorized" && statusBanco !== "paid") {
      return; 
    }

    const atualizacao: any = {
      pix_order_id: FieldValueDelete,
      pix_qr_code_id: FieldValueDelete,
      pix_reference_id: FieldValueDelete,
      status_pagamento_banco: statusBanco,
      valor_pago: 0,
    };

    if (!reterReserva) {
      atualizacao.status = "disponivel";
      atualizacao.comprador_id = FieldValueDelete;
      atualizacao.comprador_nome = FieldValueDelete;
      atualizacao.comprador_email = FieldValueDelete;
      atualizacao.comprador_telefone = FieldValueDelete;
      atualizacao.data_reserva = FieldValueDelete;
      atualizacao.data_expiracao = FieldValueDelete;
      atualizacao.status_validacao = FieldValueDelete;
      atualizacao.valor_bruto = FieldValueDelete;
      atualizacao.motivo_recusa = motivo || FieldValueDelete;
      atualizacao.sessao_checkout_id = FieldValueDelete;
    } else {
      if (sessaoCheckoutId) {
        atualizacao.sessao_checkout_id = sessaoCheckoutId;
      }
      atualizacao.motivo_recusa = motivo || FieldValueDelete;
    }

    transaction.set(snap.ref, atualizacao, { merge: true });
  });
}

/**
 * Constrói o objeto do modelo `Comprador` para persistência na coleção 'compradores'.
 *
 * @param {string} compradorId - Identificador único gerado para o comprador.
 * @param {CheckoutPixDadosNormalizados} dados - Dados cadastrais sanitizados do comprador.
 * @param {string} agora - Timestamp ISO da criação.
 * @returns {Comprador} Entidade de domínio Comprador pronta para gravação.
 */
export function montarCompradorPix(
  compradorId: string,
  dados: CheckoutPixDadosNormalizados,
  agora: string,
): Comprador {
  return {
    id: compradorId,
    nome: dados.nome,
    telefone: dados.telefone,
    email: dados.email || null,
    criado_em: agora,
  };
}

/**
 * Constrói o objeto do modelo `PagamentoPix` para persistência na coleção 'pagamentos_pix'.
 *
 * @param {Object} params - Metadados da transação e do contexto.
 * @returns {PagamentoPix} Entidade de domínio do pagamento Pix pronta para gravação no Firestore.
 */
export function montarPagamentoPix(params: {
  pagamentoId: string;
  compradorId: string;
  referenceId: string;
  idempotencyKey: string;
  contextoAderido: any;
  dados: CheckoutPixDadosNormalizados;
  valorBruto: number;
  agora: string;
  expiraEm: string;
}): PagamentoPix {
  return {
    id: params.pagamentoId,
    reference_id: params.referenceId,
    comprador_id: params.compradorId,
    vendedor_id: params.contextoAderido.idAderido,
    vendedor_nome: params.contextoAderido.vendedorNome,
    comprador_nome: params.dados.nome,
    comprador_email: params.dados.email || null,
    comprador_telefone: params.dados.telefone,
    comprador_documento: params.dados.documento || null,
    numeros_rifas: params.dados.numerosRifas,
    valor_bruto: params.valorBruto,
    valor_pago: 0,
    status_pagamento_banco: "CRIANDO",
    status_validacao: null,
    pix_order_id: null,
    pix_qr_code_id: null,
    copia_e_cola: null,
    qr_code_imagem_url: null,
    qr_code_base64: null,
    sessao_checkout_id: params.dados.sessaoCheckoutId || null,
    data_criacao: params.agora,
    data_expiracao: params.expiraEm,
    raw_mercadopago: null,
    idempotency_key: params.idempotencyKey,
  };
}

/**
 * Constrói a carga parcial de um `Bilhete` com status 'reservado' para a transação Pix.
 * Desnormaliza dados essenciais do vendedor e do comprador para facilitar leituras rápidas na UI.
 *
 * @param {Object} params - Parâmetros do bilhete reservado.
 * @returns {Partial<Bilhete>} Objeto parcial do Bilhete para mesclagem no Firestore.
 */
export function montarBilheteReservadoPix(params: {
  numero: string;
  compradorId: string;
  referenceId: string;
  contextoAderido: any;
  dados: CheckoutPixDadosNormalizados;
  valorRifa: number;
  agora: string;
  expiraEm: string;
}): Partial<Bilhete> {
  return {
    numero: params.numero,
    status: "reservado",
    comprador_id: params.compradorId,
    comprador_nome: params.dados.nome,
    comprador_email: params.dados.email || null,
    comprador_telefone: params.dados.telefone || null,
    vendedor_nome: params.contextoAderido.vendedorNome,
    vendedor_cpf: params.contextoAderido.vendedorCpf,
    vendedor_id: params.contextoAderido.idAderido,
    data_reserva: params.agora,
    data_expiracao: params.expiraEm,
    pix_order_id: null,
    pix_qr_code_id: null,
    pix_reference_id: params.referenceId,
    status_pagamento_banco: "CRIANDO",
    status_validacao: null,
    valor_bruto: params.valorRifa,
    valor_pago: 0,
    sessao_checkout_id: params.dados.sessaoCheckoutId || null,
  };
}

