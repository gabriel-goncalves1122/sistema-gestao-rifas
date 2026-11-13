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

/**
 * Calcula a similaridade entre nomes considerando ordenação de prenome/sobrenome e
 * tolerando omissões de sobrenomes intermediários comuns em cadastros informais.
 * Se o prenome e o último sobrenome forem idênticos e os tokens do menor conjunto
 * estiverem todos contidos no maior, retorna score alto (mínimo 0.95).
 *
 * @param {string} str1 - Primeira string (ex: nome no extrato bancário).
 * @param {string} str2 - Segunda string (ex: nome do comprador no sistema).
 * @returns {number} Score de similaridade entre 0 e 1.
 */
export function calcularSimilaridadeAderente(str1: string, str2: string): number {
  const s1 = normalizarNomeParaComparacao(str1);
  const s2 = normalizarNomeParaComparacao(str2);

  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  const dice = calcularSimilaridadeDice(s1, s2);

  const tokens1 = s1.split(" ").filter(Boolean);
  const tokens2 = s2.split(" ").filter(Boolean);

  // Se o prenome e o último sobrenome forem idênticos (ex: "GABRIEL SAMPAIO" vs "GABRIEL GONCALVES SAMPAIO")
  if (
    tokens1.length >= 2 &&
    tokens2.length >= 2 &&
    tokens1[0] === tokens2[0] &&
    tokens1[tokens1.length - 1] === tokens2[tokens2.length - 1]
  ) {
    const menor = tokens1.length < tokens2.length ? tokens1 : tokens2;
    const maior = tokens1.length < tokens2.length ? tokens2 : tokens1;
    const tokensComuns = menor.filter((t) => maior.includes(t));
    if (tokensComuns.length === menor.length) {
      return Math.max(dice, 0.95);
    }
  }

  return dice;
}
