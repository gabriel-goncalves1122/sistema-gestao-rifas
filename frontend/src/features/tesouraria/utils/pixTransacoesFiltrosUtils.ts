// ============================================================================
// ARQUIVO: frontend/src/features/tesouraria/utils/pixTransacoesFiltrosUtils.ts
// ============================================================================
import { somenteNumeros } from "@/shared/utils/formatadores";
import { PixTransacao, PixTransacoesFiltros } from "../types/pixTransacoes";
import {
  obterStatusValidacaoPix,
  podeValidarPixTransacao,
} from "./pixTransacoesStatusUtils";

/**
 * Auxiliar interno de busca textual que avalia termos comuns e numéricos sanitizados (CPF, telefone, rifas).
 *
 * @param {string | undefined | null} valor - Conteúdo do campo a verificar.
 * @param {string} termo - Termo textual em minúsculas.
 * @param {string} termoNumerico - Termo contendo apenas dígitos numéricos.
 * @returns {boolean} `true` se o campo corresponder ao termo.
 */
function campoContemTermo(
  valor: string | undefined | null,
  termo: string,
  termoNumerico: string,
): boolean {
  const texto = String(valor || "").toLowerCase();

  return (
    texto.includes(termo) ||
    (termoNumerico.length > 0 && somenteNumeros(texto).includes(termoNumerico))
  );
}

/**
 * Avalia se uma transação atende aos filtros rápidos pré-selecionados na toolbar ('novas', 'recusadas', 'aguardando_pagamento').
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @param {PixTransacoesFiltros["status"]} status - Filtro rápido ativo.
 * @returns {boolean} `true` se atender ao filtro.
 */
function atendeFiltroRapido(
  transacao: PixTransacao,
  status: PixTransacoesFiltros["status"],
): boolean {
  if (status === "novas") return podeValidarPixTransacao(transacao);
  if (status === "aprovadas") {
    return (
      transacao.statusValidacao === "aceita" ||
      obterStatusValidacaoPix(transacao) === "aceita"
    );
  }
  if (status === "recusadas") {
    return (
      transacao.statusValidacao === "negada" ||
      obterStatusValidacaoPix(transacao) === "negada"
    );
  }
  if (status === "aguardando_pagamento") {
    return (
      !podeValidarPixTransacao(transacao) &&
      !["aceita", "negada"].includes(transacao.statusValidacao || "")
    );
  }

  return true;
}

/**
 * Formata os números dos bilhetes de rifa da transação em uma string separada por vírgula.
 *
 * @param {PixTransacao} transacao - Transação contendo a lista de rifas.
 * @returns {string} String legível dos números ou "Sem rifas".
 */
export function formatarRifasPix(transacao: PixTransacao): string {
  const numeros = (transacao.rifas || [])
    .map((rifa) => rifa.numero)
    .filter(Boolean);

  return numeros.length > 0 ? numeros.join(", ") : "Sem rifas";
}

/**
 * Filtra a lista de transações Pix com base no termo de busca textual (comprador, email, CPF, telefone, aderido, rifas)
 * e nos filtros rápidos de status selecionados pelo usuário.
 *
 * @param {PixTransacao[]} transacoes - Lista de transações brutas.
 * @param {PixTransacoesFiltros} filtros - Critérios de filtro informados na barra de ferramentas.
 * @returns {PixTransacao[]} Lista filtrada de transações.
 */
export function filtrarPixTransacoes(
  transacoes: PixTransacao[],
  filtros: PixTransacoesFiltros,
): PixTransacao[] {
  const termo = filtros.busca.trim().toLowerCase();
  const termoNumerico = somenteNumeros(termo);

  return transacoes.filter((transacao) => {
    if (
      filtros.origem &&
      filtros.origem !== "todas" &&
      transacao.origem !== filtros.origem
    ) {
      return false;
    }

    const camposBusca = [
      transacao.descricao,
      transacao.compradorNome,
      transacao.compradorEmail,
      transacao.compradorDocumento,
      transacao.compradorTelefone,
      transacao.aderido?.nome,
      transacao.aderido?.cpf,
      ...(transacao.rifas || []).map((rifa) => rifa.numero),
    ];

    const buscaValida =
      !termo ||
      camposBusca.some((campo) => campoContemTermo(campo, termo, termoNumerico));

    return buscaValida && atendeFiltroRapido(transacao, filtros.status);
  });
}
