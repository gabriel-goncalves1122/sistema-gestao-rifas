import * as yup from "yup";

export const aceitarPixSchema = yup.object({
  chaveAcao: yup.string().trim().optional(),
});

export const negarPixSchema = yup.object({
  motivo: yup
    .string()
    .trim()
    .required("O motivo da recusa é obrigatório.")
    .min(3, "O motivo deve ter pelo menos 3 caracteres.")
    .max(500, "O motivo deve ter no máximo 500 caracteres."),
  chaveAcao: yup.string().trim().optional(),
});

export const itemLoteValidacaoSchema = yup.object({
  id: yup.string().trim().required("ID da transação é obrigatório."),
  chaveAcao: yup.string().trim().optional(),
});

export const aceitarLotePixSchema = yup.object({
  transacoes: yup
    .array()
    .of(itemLoteValidacaoSchema)
    .required("A lista de transações é obrigatória.")
    .min(1, "Selecione ao menos uma transação para aceitar."),
});

export const negarLotePixSchema = yup.object({
  transacoes: yup
    .array()
    .of(itemLoteValidacaoSchema)
    .required("A lista de transações é obrigatória.")
    .min(1, "Selecione ao menos uma transação para negar."),
  motivo: yup
    .string()
    .trim()
    .required("O motivo da recusa é obrigatório.")
    .min(3, "O motivo deve ter pelo menos 3 caracteres.")
    .max(500, "O motivo deve ter no máximo 500 caracteres."),
});
