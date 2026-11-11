// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/checkoutSchema.ts
// ============================================================================

export interface CheckoutFormData {
  nome: string;
  telefone: string;
  email?: string;
  documento?: string;
}

export {
  type CheckoutMercadoPagoFormData,
  checkoutMercadoPagoSchema as checkoutSchema,
} from "./mercadopago/checkoutMercadoPagoSchema";
export {
  type CheckoutNovaApiFormData,
  checkoutNovaApiSchema,
} from "./novaApi/checkoutNovaApiSchema";


