import * as yup from "yup";

import {
  validarDocumentoPix,
  validarEmailPix,
} from "../../../shared/utils/validadoresDocumentos";

export const checkoutPixSchema = yup
  .object({
    nome: yup.string().trim().required("Nome do comprador é obrigatório."),
    telefone: yup
      .string()
      .trim()
      .matches(/^\d{10,11}$/, "Telefone inválido (deve conter 10 ou 11 dígitos).")
      .required("Telefone do comprador é obrigatório."),
    email: yup
      .string()
      .trim()
      .email("E-mail inválido.")
      .test(
        "email-pix-valido",
        "E-mail inválido. Informe um domínio completo (ex: nome@email.com).",
        (value) => !value || validarEmailPix(value),
      )
      .optional(),
    documento: yup
      .string()
      .trim()
      .test(
        "cpf-cnpj-formato-valido",
        "CPF ou CNPJ inválido (deve conter 11 ou 14 dígitos numéricos).",
        (value) => !value || /^(\d{11}|\d{14})$/.test(value),
      )
      .test(
        "cpf-cnpj-digitos-validos",
        "CPF ou CNPJ inválido. Verifique os números digitados.",
        (value) => !value || validarDocumentoPix(value),
      )
      .optional(),
    numerosRifas: yup
      .array()
      .of(yup.string().trim().required())
      .min(1, "Selecione ao menos uma rifa.")
      .required("Selecione ao menos uma rifa."),
    sessaoCheckoutId: yup.string().optional(),
  })
  .required();
