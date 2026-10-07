export type StatusPixCanonico = "pago" | "cancelado" | "aguardando_pagamento";

export function normalizarStatusMercadoPago(statusMP: string | null | undefined): string {
  if (!statusMP) return "pending";
  return String(statusMP).toLowerCase().trim();
}

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

export function ehStatusAprovado(statusMP: string | null | undefined): boolean {
  return mapearStatusMercadoPagoParaCanonico(statusMP) === "pago";
}

export function ehStatusRejeitadoOuCancelado(statusMP: string | null | undefined): boolean {
  return mapearStatusMercadoPagoParaCanonico(statusMP) === "cancelado";
}
