import * as yup from "yup";

/**
 * Schema de validação Yup para o payload de atualização do modo de manutenção.
 */
export const atualizarManutencaoSchema = yup.object().shape({
  emManutencao: yup
    .boolean()
    .typeError("O campo 'emManutencao' deve ser booleano.")
    .required("O campo 'emManutencao' é obrigatório."),
  mensagem: yup
    .string()
    .trim()
    .max(500, "A mensagem deve ter no máximo 500 caracteres.")
    .optional(),
  previsaoRetorno: yup
    .string()
    .trim()
    .max(120, "A previsão de retorno deve ter no máximo 120 caracteres.")
    .nullable()
    .optional(),
});
