const STATUS_BANCO_PAGOS = new Set([
  "approved",
  "authorized",
  "paid",
  "in_analysis",
  "pendente",
]);

const STATUS_BANCO_CANCELADOS = new Set([
  "rejected",
  "cancelled",
  "canceled",
  "declined",
  "cancelado",
  "expired",
  "expirado",
]);

/**
 * Converte o status bruto retornado pelo gateway/Firestore em estado simplificado
 * consumido pela máquina de estados do checkout Pix.
 *
 * @param {string} statusBruto - Valor do campo `status_pagamento_banco`.
 * @returns {"aguardando_pagamento" | "pago" | "cancelado"} Estado normalizado da cobrança.
 */
export function mapearStatusBancoPix(
  statusBruto: string,
): "aguardando_pagamento" | "pago" | "cancelado" {
  const normalizado = String(statusBruto).toLowerCase();
  if (STATUS_BANCO_PAGOS.has(normalizado)) return "pago";
  if (STATUS_BANCO_CANCELADOS.has(normalizado)) return "cancelado";
  return "aguardando_pagamento";
}
