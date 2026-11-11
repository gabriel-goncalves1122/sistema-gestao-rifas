// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/novaApi/checkoutNovaApiSchema.ts
// ============================================================================
import * as yup from "yup";

import { validarEmailPix } from "@/shared/utils/sanitizadores";

/**
 * Interface dos dados do formulário de Checkout da Nova API (Pix Direto / Chave Oficial).
 * Não exige CPF nem E-mail obrigatório, agilizando a venda rápida.
 */
export interface CheckoutNovaApiFormData {
  nome: string;
  telefone: string;
  email?: string;
}

/**
 * Schema de validação Yup para o Checkout da Nova API.
 * - Nome: obrigatório.
 * - Telefone (WhatsApp): obrigatório com DDD.
 * - E-mail: opcional (se informado, valida o formato).
 */
export const checkoutNovaApiSchema = yup
  .object({
    nome: yup.string().trim().required("Informe o nome completo do comprador."),

    telefone: yup
      .string()
      .trim()
      .required("Informe o WhatsApp do comprador.")
      .min(14, "Telefone incompleto. Use o formato (35) 99999-9999."),

    email: yup
      .string()
      .trim()
      .transform((val) => (val === "" ? undefined : val))
      .email("Formato de e-mail inválido.")
      .test(
        "email-dominio-valido",
        "Formato de e-mail inválido. Informe um domínio completo (ex: nome@email.com).",
        (value) => !value || validarEmailPix(value),
      )
      .optional(),
  })
  .required();
