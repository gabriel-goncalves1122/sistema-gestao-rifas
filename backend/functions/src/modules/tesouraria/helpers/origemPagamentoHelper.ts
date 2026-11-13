import { GatewayMetaPagamento, ProvedorPagamento } from "../../types/models";

/** Taxa percentual cobrada pelo gateway Mercado Pago sobre o valor bruto (1%). */
export const TAXA_GATEWAY_MERCADOPAGO = 0.01;

/**
 * Campos mínimos aceitos para identificar o provedor de pagamento de um registro
 * (`pagamentos_pix` ou `bilhetes`) com retrocompatibilidade para documentos legados.
 */
export interface RegistroOrigemPagamentoInput {
  provedor_pagamento?: ProvedorPagamento | string | null;
  pix_order_id?: string | null;
  raw_mercadopago?: Record<string, unknown> | null;
  gateway_meta?: GatewayMetaPagamento | null;
  dados_conciliacao?: unknown;
  comprovante_url?: string | null;
}

/**
 * Resolve de forma determinística o provedor responsável por um pagamento ou bilhete.
 *
 * Prioriza o campo explícito `provedor_pagamento` gravado pelos fluxos novos e aplica
 * heurísticas controladas apenas como fallback para documentos históricos no Firestore.
 *
 * @param {RegistroOrigemPagamentoInput | null | undefined} registro - Documento de pagamento ou bilhete.
 * @returns {ProvedorPagamento} Provedor identificado (`MERCADOPAGO_API`, `EMV_OFFLINE` ou `COMPROVANTE_PURO`).
 */
export function resolverProvedorRegistro(
  registro?: RegistroOrigemPagamentoInput | null,
): ProvedorPagamento {
  if (!registro) {
    return "COMPROVANTE_PURO";
  }

  const provedorExplicito = String(registro.provedor_pagamento || "")
    .trim()
    .toUpperCase();

  if (provedorExplicito === "MERCADOPAGO_API" || provedorExplicito === "MERCADOPAGO") {
    return "MERCADOPAGO_API";
  }

  if (provedorExplicito === "EMV_OFFLINE") {
    return "EMV_OFFLINE";
  }

  if (provedorExplicito === "COMPROVANTE_PURO" || provedorExplicito === "COMPROVANTE") {
    return "COMPROVANTE_PURO";
  }

  const rawOffline = Boolean(
    (registro.raw_mercadopago as { geradoOffline?: unknown } | null | undefined)?.geradoOffline,
  );
  const metaOffline = Boolean(registro.gateway_meta?.geradoOffline);
  const pixOrderId = String(registro.pix_order_id || "").trim();

  if (rawOffline || metaOffline || Boolean(registro.dados_conciliacao) || pixOrderId.startsWith("RIFA")) {
    return "EMV_OFFLINE";
  }

  if (registro.comprovante_url) {
    return pixOrderId ? "EMV_OFFLINE" : "COMPROVANTE_PURO";
  }

  if (pixOrderId) {
    return "MERCADOPAGO_API";
  }

  return "COMPROVANTE_PURO";
}

/**
 * Indica se o registro pertence ao gateway automatizado do Mercado Pago.
 *
 * @param {RegistroOrigemPagamentoInput | null | undefined} registro - Documento de pagamento ou bilhete.
 * @returns {boolean} `true` exclusivamente quando o provedor for `MERCADOPAGO_API`.
 */
export function ehPagamentoGatewayMercadoPago(
  registro?: RegistroOrigemPagamentoInput | null,
): boolean {
  return resolverProvedorRegistro(registro) === "MERCADOPAGO_API";
}

/**
 * Calcula o valor líquido após deduzir taxas operacionais de gateway.
 * Apenas cobranças emitidas via `MERCADOPAGO_API` sofrem retenção de 1%;
 * pagamentos via Pix Normal (`EMV_OFFLINE`) ou Comprovante Manual permanecem integrais.
 *
 * @param {number} valorBruto - Valor bruto em reais (R$).
 * @param {ProvedorPagamento | RegistroOrigemPagamentoInput | null | undefined} origem - Provedor explícito ou documento para resolução.
 * @returns {number} Valor líquido arredondado em duas casas decimais.
 */
export function calcularValorLiquido(
  valorBruto: number,
  origem?: ProvedorPagamento | RegistroOrigemPagamentoInput | null,
): number {
  const bruto = Number.isFinite(Number(valorBruto)) ? Number(valorBruto) : 0;
  const provedor: ProvedorPagamento =
    typeof origem === "string" ? origem : resolverProvedorRegistro(origem);

  if (provedor === "MERCADOPAGO_API") {
    return Math.round(bruto * (1 - TAXA_GATEWAY_MERCADOPAGO) * 100) / 100;
  }

  return Math.round(bruto * 100) / 100;
}

/**
 * Extrai apenas os metadados essenciais de rastreio do gateway para persistência enxuta em Firestore,
 * evitando armazenar o payload bruto completo (`raw_mercadopago`).
 *
 * @param {unknown} payload - Resposta bruta do provedor ou webhook.
 * @param {ProvedorPagamento} [provedor] - Provedor associado ao registro.
 * @returns {GatewayMetaPagamento | null} Objeto reduzido de metadados ou `null` se vazio.
 */
export function construirGatewayMetaEnxuto(
  payload: unknown,
  provedor?: ProvedorPagamento,
): GatewayMetaPagamento | null {
  if (!payload || typeof payload !== "object") {
    return provedor === "EMV_OFFLINE" ? { geradoOffline: true } : null;
  }

  const dados = payload as Record<string, unknown>;
  const meta: GatewayMetaPagamento = {};

  if (dados.id !== undefined && dados.id !== null && String(dados.id).trim()) {
    meta.id = String(dados.id).trim();
  } else if (dados.txid !== undefined && dados.txid !== null && String(dados.txid).trim()) {
    meta.id = String(dados.txid).trim();
  }

  if (typeof dados.status_detail === "string" && dados.status_detail.trim()) {
    meta.status_detail = dados.status_detail.trim();
  }

  if (typeof dados.date_approved === "string" && dados.date_approved.trim()) {
    meta.date_approved = dados.date_approved.trim();
  }

  if (dados.geradoOffline === true || provedor === "EMV_OFFLINE") {
    meta.geradoOffline = true;
  }

  return Object.keys(meta).length > 0 ? meta : null;
}
