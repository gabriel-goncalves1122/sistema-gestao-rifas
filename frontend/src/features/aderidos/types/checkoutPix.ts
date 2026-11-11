export type CheckoutPixStatus =
  | "aguardando_pagamento"
  | "pago"
  | "expirado"
  | "cancelado";

export interface CriarCobrancaPixParams {
  nome: string;
  telefone: string;
  email?: string;
  documento?: string;
  numerosRifas: string[];
  sessaoCheckoutId?: string;
}

export interface CheckoutPixCobranca {
  id: string;
  status: CheckoutPixStatus;
  qrCodeImagemUrl?: string | null;
  qrCodeBase64?: string | null;
  copiaECola: string;
  expiraEm?: string | null;
  numerosRifas?: string[];
}
