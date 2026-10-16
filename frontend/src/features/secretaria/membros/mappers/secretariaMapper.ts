// ============================================================================
// ARQUIVO: frontend/src/features/secretaria/membros/mappers/secretariaMapper.ts
// ============================================================================
import {
  AderidoSecretaria,
  FaixaRifasSecretaria,
  ModalidadeAdesao,
  StatusCadastro,
} from "../../../../shared/types/secretaria";
import { formatarNomeMembro } from "../utils/formatadoresSecretaria";

type RegistroSecretaria = Record<string, unknown>;

/**
 * Garante que o payload recebido seja um objeto de dicionário seguro.
 *
 * @param {unknown} data - Dado bruto.
 * @returns {RegistroSecretaria} Dicionário seguro ou objeto vazio.
 */
function normalizarRegistro(data: unknown): RegistroSecretaria {
  if (!data || typeof data !== "object") return {};

  return data as RegistroSecretaria;
}

/**
 * Normaliza um valor para string e remove espaços das extremidades.
 *
 * @param {unknown} valor - Valor a ser convertido.
 * @returns {string} String limpa ou vazia.
 */
function normalizarTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";

  return String(valor).trim();
}

/**
 * Retorna o primeiro valor não vazio de uma lista de candidatos, útil para fallbacks de campos legados do Firestore.
 *
 * @param {...unknown[]} valores - Valores potenciais em ordem decrescente de prioridade.
 * @returns {string} Primeiro texto válido encontrado.
 */
function obterPrimeiroTextoValido(...valores: unknown[]): string {
  // Centraliza fallback de campos legados do Firestore, como Nome, E-mail e Cargo.
  const valorEncontrado = valores.find(
    (valor) => normalizarTexto(valor).length > 0,
  );

  return normalizarTexto(valorEncontrado);
}

/**
 * Converte variações legadas de status ("Aderido", "ativo", "pendente") no tipo union canônico `StatusCadastro`.
 *
 * @param {RegistroSecretaria} data - Dicionário bruto do documento.
 * @returns {StatusCadastro} "ativo", "pendente" ou "inativo".
 */
function normalizarStatus(data: RegistroSecretaria): StatusCadastro {
  const statusCadastro = normalizarTexto(data.status_cadastro).toLowerCase();
  const statusLegado = normalizarTexto(data.status).toLowerCase();

  if (statusCadastro === "ativo") return "ativo";
  if (statusCadastro === "pendente") return "pendente";
  if (statusCadastro === "inativo") return "inativo";

  // Documentos antigos podem usar status: "Aderido" no lugar de status_cadastro.
  if (statusLegado === "aderido" || statusLegado === "ativo") return "ativo";
  if (statusLegado === "inativo") return "inativo";
  if (statusLegado === "pendente") return "pendente";

  return data.uid ? "ativo" : "pendente";
}

/**
 * Normaliza a modalidade de adesão garantindo o valor "meio" ou fallback padrão "completo".
 *
 * @param {RegistroSecretaria} data - Dados do aderido.
 * @returns {ModalidadeAdesao} "completo" ou "meio".
 */
function normalizarModalidade(data: RegistroSecretaria): ModalidadeAdesao {
  return data.modalidade_adesao === "meio" ? "meio" : "completo";
}

/**
 * Converte com segurança valores variados para number finito, retornando 0 como fallback.
 *
 * @param {unknown} valor - Valor numérico ou string.
 * @returns {number} Número finito ou zero.
 */
function normalizarNumero(valor: unknown): number {
  const numero = Number(valor || 0);

  return Number.isFinite(numero) ? numero : 0;
}

/**
 * Normaliza o objeto estrutural de faixa de rifas (início e fim) caso presente.
 *
 * @param {unknown} valor - Objeto ou indefinido.
 * @returns {FaixaRifasSecretaria | undefined} Estrutura tipada da faixa ou undefined.
 */
function normalizarFaixaRifas(
  valor: unknown,
): FaixaRifasSecretaria | undefined {
  if (!valor || typeof valor !== "object") return undefined;

  return valor as FaixaRifasSecretaria;
}

/**
 * Mapeia e normaliza um documento bruto de aderido do Firestore para a tipagem canônica `AderidoSecretaria`.
 * Trata inconsistências de chaves em maiúsculas (ex: "Nome", "E-mail"), status legados e campos opcionais.
 *
 * @param {string} idDocumento - Identificador único do documento no Firestore.
 * @param {unknown} dataBruta - Conteúdo bruto obtido via snapshot ou resposta da API.
 * @returns {AderidoSecretaria} Objeto de domínio com propriedades normalizadas e tipadas.
 */
export function normalizarAderidoSecretaria(
  idDocumento: string,
  dataBruta: unknown,
): AderidoSecretaria {
  const data = normalizarRegistro(dataBruta);

  const nome = formatarNomeMembro(
    obterPrimeiroTextoValido(data.nome, data.Nome, data["Nome Completo"]),
  );

  const email = obterPrimeiroTextoValido(
    data.email,
    data.Email,
    data["E-mail"],
    idDocumento,
  );

  const telefone = obterPrimeiroTextoValido(data.telefone, data.Telefone);

  const cpf = obterPrimeiroTextoValido(data.cpf, data.CPF);

  const curso = obterPrimeiroTextoValido(data.curso, data.Curso);

  const genero = obterPrimeiroTextoValido(
    data.genero,
    data.Genero,
    data.Gênero,
  );

  const dataNascimento = obterPrimeiroTextoValido(
    data.dataNascimento,
    data.data_nascimento,
    data["Data de Nascimento"],
  );

  return {
    ...data,

    // ID do documento é o identificador seguro para edição no Firestore.
    id: idDocumento,

    // Mantém compatibilidade com documentos antigos e novos.
    id_aderido: obterPrimeiroTextoValido(data.id_aderido, data.id, idDocumento),

    nome,
    email,
    telefone,
    cpf,
    curso,
    genero,

    // O banco tem registros com os dois formatos.
    data_nascimento: dataNascimento,
    dataNascimento,

    cargo: obterPrimeiroTextoValido(data.cargo, data.Cargo) || "aderido",
    modalidade_adesao: normalizarModalidade(data),

    status_cadastro: normalizarStatus(data),
    status: obterPrimeiroTextoValido(data.status) || undefined,

    posicao_adesao:
      data.posicao_adesao === undefined
        ? undefined
        : normalizarNumero(data.posicao_adesao),
    faixa_rifas: normalizarFaixaRifas(data.faixa_rifas),

    meta_vendas: normalizarNumero(data.meta_vendas),
    total_arrecadado: normalizarNumero(data.total_arrecadado),
    rifas_vendidas: normalizarNumero(data.rifas_vendidas),

    uid: obterPrimeiroTextoValido(data.uid) || null,
    criado_em: obterPrimeiroTextoValido(data.criado_em) || undefined,
    cadastrado_em: obterPrimeiroTextoValido(data.cadastrado_em) || undefined,
  };
}
