/**
 * Utilitários para normalização e cálculo de similaridade textual entre nomes de pagadores e compradores.
 * Utiliza a biblioteca oficial `string-similarity` instalada no projeto.
 *
 * @module stringSimilarityUtils
 */
import { compareTwoStrings } from "string-similarity";

/**
 * Remove acentuações, pontuações e espaços duplicados, retornando string em caixa alta.
 *
 * @param {string} texto - Texto bruto a ser normalizado.
 * @returns {string} Texto normalizado em caixa alta sem acentos.
 */
export function normalizarNomeParaComparacao(texto: string): string {
  if (!texto) return "";
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calcula a similaridade entre duas strings (coeficiente de Sørensen-Dice) via string-similarity.
 *
 * @param {string} str1 - Primeira string.
 * @param {string} str2 - Segunda string.
 * @returns {number} Coeficiente de similaridade entre 0 e 1.
 */
export function calcularSimilaridadeDice(str1: string, str2: string): number {
  const s1 = normalizarNomeParaComparacao(str1);
  const s2 = normalizarNomeParaComparacao(str2);

  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  return compareTwoStrings(s1, s2);
}
