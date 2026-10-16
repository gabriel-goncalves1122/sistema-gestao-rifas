// ============================================================================
// ARQUIVO: backend/functions/src/modules/admin/secretaria/secretariaMapper.ts
// ============================================================================
import { DadosAtualizacaoAderido, DadosNovoAderido } from "./secretariaTypes";

/**
 * Normaliza um endereço de e-mail convertendo para letras minúsculas e removendo espaços excedentes.
 *
 * @param {string} email - E-mail recebido em formulários ou payloads.
 * @returns {string} E-mail normalizado em minúsculas e sem espaços nas bordas.
 */
export function normalizarEmail(email: string): string {
  return String(email).toLowerCase().trim();
}

/**
 * Normaliza texto genérico removendo espaços em branco das extremidades.
 *
 * @param {string} [valor] - Texto a ser sanitizado.
 * @returns {string} String limpa ou string vazia se nulo/indefinido.
 */
export function normalizarTexto(valor?: string): string {
  return valor ? String(valor).trim() : "";
}

/**
 * Normaliza texto convertendo todas as letras para caixa alta (maiúsculas) e removendo espaços extras.
 *
 * @param {string} [valor] - Texto a ser convertido (ex: nome, curso).
 * @returns {string} Texto em caixa alta ou string vazia se nulo/indefinido.
 */
export function normalizarTextoMaiusculo(valor?: string): string {
  return valor ? String(valor).trim().toUpperCase() : "";
}

/**
 * Mapeia e sanitiza os campos parciais enviados para atualização de um aderido no Firestore.
 * Preserva campos antigos ao incluir apenas chaves estritamente fornecidas no payload.
 *
 * @param {DadosAtualizacaoAderido} dados - Payload parcial com os campos editados pelo operador.
 * @returns {Record<string, unknown>} Dicionário com chaves formatadas para persistência no Firestore.
 */
export function montarCamposAtualizacaoAderido(dados: DadosAtualizacaoAderido) {
  const campos: Record<string, unknown> = {
    atualizado_em: new Date().toISOString(),
  };

  // Atualiza somente campos recebidos para preservar documentos antigos do Firestore.
  if (dados.nome !== undefined)
    campos.nome = normalizarTextoMaiusculo(dados.nome);
  if (dados.email !== undefined) campos.email = normalizarEmail(dados.email);
  if (dados.telefone !== undefined)
    campos.telefone = normalizarTexto(dados.telefone);
  if (dados.cpf !== undefined) campos.cpf = normalizarTexto(dados.cpf);
  if (dados.curso !== undefined)
    campos.curso = normalizarTextoMaiusculo(dados.curso);
  if (dados.genero !== undefined) campos.genero = normalizarTexto(dados.genero);
  if (dados.data_nascimento !== undefined) {
    campos.data_nascimento = normalizarTexto(dados.data_nascimento);
  }
  if (dados.cargo !== undefined) campos.cargo = dados.cargo;

  if (dados.status_cadastro !== undefined) {
    campos.status_cadastro = dados.status_cadastro;

    // Mantém compatibilidade com documentos antigos que usam apenas "status".
    campos.status = dados.status_cadastro;
  }

  return campos;
}

/**
 * Normaliza e define os valores padrão obrigatórios para a criação de um novo aderido.
 *
 * @param {DadosNovoAderido} dados - Payload de cadastro do aderido.
 * @returns {object} Objeto normalizado com valores saneados prontos para gravação.
 */
export function normalizarDadosNovoAderido(dados: DadosNovoAderido) {
  return {
    email: normalizarEmail(dados.email),
    nome: normalizarTextoMaiusculo(dados.nome),
    curso: normalizarTextoMaiusculo(dados.curso),
    data_nascimento: normalizarTexto(dados.data_nascimento),
    telefone: normalizarTexto(dados.telefone),
    cargo: dados.cargo || "aderido",
    modalidade_adesao: dados.modalidade_adesao || "completo",
  };
}
