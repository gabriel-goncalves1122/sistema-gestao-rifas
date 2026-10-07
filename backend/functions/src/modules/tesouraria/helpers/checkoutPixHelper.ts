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

export function normalizarNumerosRifas(valor: unknown) {
  if (!Array.isArray(valor)) return [];

  return Array.from(
    new Set(
      valor
        .map((numero) => String(numero || "").trim())
        .filter((numero) => numero.length > 0),
    ),
  );
}

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

export function calcularValorPixReais(numerosRifas: string[]) {
  return numerosRifas.length * VALOR_RIFA_REAIS;
}

export function calcularValorPixCentavos(numerosRifas: string[]) {
  return calcularValorPixReais(numerosRifas) * 100;
}

export function dataExpiracaoPix(dataBase = new Date()) {
  const expiraEm = new Date(dataBase);
  expiraEm.setMinutes(expiraEm.getMinutes() + 30);
  
  // Format to UTC with 'Z' as recommended by Mercado Pago to avoid offset parsing bugs
  return expiraEm.toISOString();
}

export function montarReferenceIdPix(compradorId: string) {
  return `rifas-pix-${compradorId}`;
}

export function montarIdempotencyKeyPix(params: {
  vendedorId: string;
  numerosRifas: string[];
  dataBase?: Date;
}) {
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

export function mapearStatusCheckoutPix(status: string): CheckoutPixStatus {
  const canonico = mapearStatusMercadoPagoParaCanonico(status);
  if (canonico === "pago") return "pago";
  if (canonico === "cancelado") return "cancelado";
  return "aguardando_pagamento";
}

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

export function extrairStatusPagamentoMercadoPago(payload: any) {
  const status = String(payload?.status || "pending").trim();
  return status || "pending";
}

export function extrairValorPagoReaisMercadoPago(payload: any) {
  const valor = payload?.transaction_details?.total_paid_amount ?? payload?.transaction_amount;
  return Number.isFinite(Number(valor)) ? Number(valor) : 0;
}

export function extrairPagoEmMercadoPago(payload: any) {
  return payload?.date_approved || payload?.last_updated || null;
}

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
) {
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
