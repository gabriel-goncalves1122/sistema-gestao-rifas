export type CheckoutPixStatus =
  | "aguardando_pagamento"
  | "pago"
  | "expirado"
  | "cancelado";

export interface CriarCheckoutPixPayload {
  nome: string;
  telefone: string;
  email?: string;
  documento?: string;
  numerosRifas: string[];
  sessaoCheckoutId?: string;
}

export interface CheckoutPixResposta {
  id: string;
  status: CheckoutPixStatus;
  qrCodeImagemUrl?: string | null;
  qrCodeBase64?: string | null;
  copiaECola: string;
  expiraEm?: string | null;
  numerosRifas?: string[];
}
