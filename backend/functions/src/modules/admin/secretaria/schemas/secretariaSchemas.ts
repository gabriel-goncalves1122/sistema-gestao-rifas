// ============================================================================
// ARQUIVO: backend/functions/src/modules/admin/secretaria/schemas/secretariaSchemas.ts
// ============================================================================
import * as yup from "yup";

const modalidadeAdesaoSchema = yup
  .string()
  .oneOf(["completo", "meio"], "A modalidade deve ser 'completo' ou 'meio'.");

const statusCadastroSchema = yup
  .string()
  .oneOf(["ativo", "pendente", "inativo"], "Status inválido.");

export const criarAderidoSchema = yup.object().shape({
  email: yup.string().email("E-mail inválido").required("E-mail é obrigatório"),
  nome: yup.string().optional().default(""),
  curso: yup.string().optional().default(""),
  telefone: yup.string().optional().default(""),
  data_nascimento: yup.string().optional().default(""),
  dataNascimento: yup.string().optional().default(""),
  cargo: yup.string().optional().nullable(),
  modalidade_adesao: modalidadeAdesaoSchema.required("Modalidade é obrigatória"),
});

export const atualizarAderidoSchema = yup.object().shape({
  nome: yup.string().optional(),
  email: yup.string().email("E-mail inválido").optional(),
  telefone: yup.string().optional(),
  cpf: yup.string().optional(),
  curso: yup.string().optional(),
  genero: yup.string().optional(),
  data_nascimento: yup.string().optional(),
  dataNascimento: yup.string().optional(),
  cargo: yup.string().optional().nullable(),
  status_cadastro: statusCadastroSchema.optional(),
});
