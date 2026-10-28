import * as yup from "yup";

import {
  validarDocumentoPix,
  validarEmailPix,
} from "../helpers/checkoutPixHelper";

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
      .matches(/^(\d{11}|\d{14})$/, "CPF ou CNPJ inválido (deve conter 11 ou 14 dígitos numéricos).")
      .test(
        "cpf-cnpj-digitos-validos",
        "CPF ou CNPJ inválido. Verifique os números digitados.",
        (value) => Boolean(value && validarDocumentoPix(value)),
      )
      .required("Documento CPF é obrigatório"),
    numerosRifas: yup
      .array()
      .of(yup.string().trim().required())
      .min(1, "Selecione ao menos uma rifa.")
      .required("Selecione ao menos uma rifa."),
    sessaoCheckoutId: yup.string().optional(),
  })
  .required();
