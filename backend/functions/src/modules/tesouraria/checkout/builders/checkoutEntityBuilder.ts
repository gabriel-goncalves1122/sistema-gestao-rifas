// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/checkout/builders/checkoutEntityBuilder.ts
// ============================================================================

import QRCode from "qrcode";

import { Bilhete, Comprador, PagamentoPix } from "../../../types/models";
import { ModoProvedorPagamento } from "../../../../shared/payments/types/paymentProviderTypes";
import { CheckoutPixResposta } from "../../types/checkoutPixTypes";
import {
  CheckoutPixDadosNormalizados,
  montarRespostaCheckoutPix,
} from "../../helpers/checkoutPixHelper";

/**
 * Constrói o objeto do modelo `Comprador` para persistência na coleção `'compradores'`.
 *
 * @param {string} compradorId - Identificador único gerado para o comprador.
 * @param {CheckoutPixDadosNormalizados} dados - Dados cadastrais sanitizados do comprador.
 * @param {string} agora - Timestamp ISO da criação.
 * @returns {Comprador} Entidade de domínio `Comprador` pronta para gravação.
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
 * Constrói o objeto do modelo `PagamentoPix` para persistência na coleção `'pagamentos_pix'`.
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
  provedorPagamento?: ModoProvedorPagamento;
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
    sessao_checkout_id: params.dados.sessaoCheckoutId || null,
    data_criacao: params.agora,
    data_expiracao: params.expiraEm,
    provedor_pagamento: params.provedorPagamento || null,
    idempotency_key: params.idempotencyKey,
  };
}

/**
 * Monta os objetos base de comprador e pagamento (sem IDs gerados) para envio
 * à transação de reserva atômica no repositório.
 *
 * @param {Object} params - Parâmetros de contexto e valores normalizados do checkout.
 * @returns {{ comprador: Omit<Comprador, "id">; pagamentoBase: Omit<PagamentoPix, "id" | "comprador_id" | "reference_id"> }}
 */
export function montarPayloadReservaCheckout(params: {
  idempotencyKey: string;
  contextoAderido: any;
  dados: CheckoutPixDadosNormalizados;
  valorBruto: number;
  agora: string;
  expiraEm: string;
  provedorPagamento: ModoProvedorPagamento;
}): {
  comprador: Omit<Comprador, "id">;
  pagamentoBase: Omit<PagamentoPix, "id" | "comprador_id" | "reference_id">;
} {
  const { id: _compradorIdIgnorado, ...comprador } = montarCompradorPix(
    "",
    params.dados,
    params.agora,
  );

  const pagamentoCompleto = montarPagamentoPix({
    pagamentoId: "",
    compradorId: "",
    referenceId: "",
    idempotencyKey: params.idempotencyKey,
    contextoAderido: params.contextoAderido,
    dados: params.dados,
    valorBruto: params.valorBruto,
    agora: params.agora,
    expiraEm: params.expiraEm,
    provedorPagamento: params.provedorPagamento,
  });

  const {
    id: _pagamentoIdIgnorado,
    comprador_id: _compradorRefIgnorado,
    reference_id: _referenceRefIgnorado,
    ...pagamentoBase
  } = pagamentoCompleto;

  return { comprador, pagamentoBase };
}

/**
 * Constrói a carga parcial de um `Bilhete` com status `'reservado'` para a transação Pix.
 * Desnormaliza dados essenciais do vendedor e do comprador para facilitar leituras rápidas na UI.
 *
 * @param {Object} params - Parâmetros do bilhete reservado.
 * @returns {Partial<Bilhete> & Record<string, any>} Objeto parcial do Bilhete para mesclagem no Firestore.
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
  provedorPagamento?: ModoProvedorPagamento;
}): Partial<Bilhete> & Record<string, any> {
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
    data_pagamento: null,
    comprovante_url: null,
    provedor_pagamento: params.provedorPagamento || null,
    pix_order_id: null,
    pix_qr_code_id: null,
    pix_reference_id: params.referenceId,
    status_pagamento_banco: "CRIANDO",
    status_validacao: null,
    motivo_recusa: null,
    correcao_pendente: null,
    valor_bruto: params.valorRifa,
    valor_pago: 0,
    sessao_checkout_id: params.dados.sessaoCheckoutId || null,
  };
}

/**
 * Converte um documento de `PagamentoPix` já existente no DTO de resposta do frontend,
 * gerando `qrCodeBase64` sob demanda a partir de `copia_e_cola` quando não estiver salvo.
 *
 * @param {PagamentoPix} pagamento - Documento salvo no Firestore.
 * @returns {Promise<CheckoutPixResposta>} DTO normalizado em camelCase.
 * @throws {Error} `"PAGAMENTO_EM_CRIACAO"` se o QR Code ainda não foi persistido.
 */
export async function construirRespostaPagamentoExistente(
  pagamento: PagamentoPix,
): Promise<CheckoutPixResposta> {
  if (!pagamento.pix_qr_code_id || !pagamento.copia_e_cola) {
    throw new Error("PAGAMENTO_EM_CRIACAO");
  }

  let qrCodeBase64 = pagamento.qr_code_base64 || null;
  if (!qrCodeBase64 && pagamento.copia_e_cola) {
    try {
      const dataUrl = await QRCode.toDataURL(pagamento.copia_e_cola, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 320,
      });
      qrCodeBase64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, "");
    } catch {
      qrCodeBase64 = null;
    }
  }

  return montarRespostaCheckoutPix({
    id: pagamento.id,
    status: String(pagamento.status_pagamento_banco),
    qrCode: {
      id: pagamento.pix_qr_code_id,
      copiaECola: pagamento.copia_e_cola,
      qrCodeImagemUrl: pagamento.qr_code_imagem_url || null,
      qrCodeBase64,
      expiraEm: pagamento.data_expiracao || null,
    },
    numerosRifas: pagamento.numeros_rifas || [],
  });
}
