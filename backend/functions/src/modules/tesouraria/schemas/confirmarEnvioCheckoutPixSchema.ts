// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/schemas/confirmarEnvioCheckoutPixSchema.ts
// ============================================================================
import * as yup from "yup";

/**
 * Schema de validação para o payload de confirmação de envio de comprovante no Checkout Pix.
 * Torna o comprovanteUrl obrigatório e valida que aponta para o diretório canônico 'comprovantes/'.
 */
export const confirmarEnvioCheckoutPixSchema = yup
  .object({
    comprovanteUrl: yup
      .string()
      .trim()
      .required("Comprovante de pagamento é obrigatório.")
      .matches(/^comprovantes\//, "Caminho do comprovante inválido."),
    hashComprovante: yup.string().trim().nullable().optional(),
  })
  .required();
