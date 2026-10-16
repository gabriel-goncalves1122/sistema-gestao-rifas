export type StatusPixCanonico = "pago" | "cancelado" | "aguardando_pagamento";

/**
 * Normaliza a string de status vinda da API do Mercado Pago para minúsculas e remove espaços.
 *
 * @param {string | null | undefined} statusMP - Status bruto retornado pelo gateway.
 * @returns {string} String normalizada (retorna "pending" caso seja nulo ou indefinido).
 */
export function normalizarStatusMercadoPago(statusMP: string | null | undefined): string {
  if (!statusMP) return "pending";
  return String(statusMP).toLowerCase().trim();
}

/**
 * Traduz o status do gateway financeiro (Mercado Pago) para os três estados canônicos do sistema:
 * - 'pago': pagamento aprovado, autorizado ou liquidado no banco.
 * - 'cancelado': pagamento rejeitado, cancelado, estornado ou devolvido.
 * - 'aguardando_pagamento': pendente, em análise ou aguardando ação do pagador.
 *
 * @param {string | null | undefined} statusMP - Status bruto do Mercado Pago.
 * @returns {StatusPixCanonico} 'pago' | 'cancelado' | 'aguardando_pagamento'.
 */
export function mapearStatusMercadoPagoParaCanonico(statusMP: string | null | undefined): StatusPixCanonico {
  const statusNormalizado = normalizarStatusMercadoPago(statusMP);
  
  if (["approved", "authorized", "paid"].includes(statusNormalizado)) {
    return "pago";
  }
  
  if (["rejected", "cancelled", "canceled", "declined", "refunded", "charged_back", "cancelado"].includes(statusNormalizado)) {
    return "cancelado";
  }

  return "aguardando_pagamento";
}

/**
 * Verifica se um determinado status do provedor corresponde a uma liquidação confirmada/paga.
 *
 * @param {string | null | undefined} statusMP - Status bruto retornado pelo gateway.
 * @returns {boolean} `true` se aprovado; caso contrário, `false`.
 */
export function ehStatusAprovado(statusMP: string | null | undefined): boolean {
  return mapearStatusMercadoPagoParaCanonico(statusMP) === "pago";
}

/**
 * Verifica se um determinado status do provedor corresponde a uma rejeição, cancelamento ou estorno definitivo.
 *
 * @param {string | null | undefined} statusMP - Status bruto retornado pelo gateway.
 * @returns {boolean} `true` se cancelado/rejeitado; caso contrário, `false`.
 */
export function ehStatusRejeitadoOuCancelado(statusMP: string | null | undefined): boolean {
  return mapearStatusMercadoPagoParaCanonico(statusMP) === "cancelado";
}
