// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/mercadopago/checkoutMercadoPagoSchema.ts
// ============================================================================
import * as yup from "yup";

import {
  validarDocumentoPix,
  validarEmailPix,
} from "@/shared/utils/sanitizadores";

/**
 * Interface dos dados do formulário de Checkout do Mercado Pago.
 * Exige todos os 4 campos cadastrais regulatórios do gateway financeiro.
 */
export interface CheckoutMercadoPagoFormData {
  nome: string;
  telefone: string;
  email: string;
  documento: string;
}

/**
 * Schema de validação Yup para o Checkout via Gateway Mercado Pago.
 * - Nome: obrigatório.
 * - Telefone: obrigatório.
 * - E-mail: obrigatório para recebimento do comprovante do gateway.
 * - Documento (CPF/CNPJ): estritamente obrigatório para emissão de Pix pelo gateway.
 */
export const checkoutMercadoPagoSchema = yup
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
      .required("O e-mail é obrigatório para emissão via Mercado Pago.")
      .email("Formato de e-mail inválido.")
      .test(
        "email-dominio-valido",
        "Formato de e-mail inválido. Informe um domínio completo (ex: nome@email.com).",
        (value) => !value || validarEmailPix(value),
      ),

    documento: yup
      .string()
      .trim()
      .required("Informe o CPF ou CNPJ do pagador.")
      .test(
        "cpf-cnpj-tamanho",
        "Documento incompleto. Use 11 dígitos (CPF) ou 14 dígitos (CNPJ).",
        (value) => {
          const apenasNumeros = String(value || "").replace(/\D/g, "");
          return apenasNumeros.length === 11 || apenasNumeros.length === 14;
        },
      )
      .test(
        "cpf-cnpj-valido",
        "CPF ou CNPJ inválido. Verifique os dígitos informados.",
        (value) => {
          const apenasNumeros = String(value || "").replace(/\D/g, "");
          if (apenasNumeros.length !== 11 && apenasNumeros.length !== 14) {
            return true;
          }
          return validarDocumentoPix(apenasNumeros);
        },
      ),
  })
  .required();
