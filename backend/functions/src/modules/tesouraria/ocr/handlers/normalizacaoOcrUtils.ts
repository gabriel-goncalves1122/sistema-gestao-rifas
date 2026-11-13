// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/handlers/normalizacaoOcrUtils.ts
// ============================================================================

import { ContextoAnaliseComprovante } from "../contracts/ocrContracts";

/**
 * Remove acentos e converte o texto para caixa alta para extração determinística.
 *
 * @param {string} texto - Texto bruto de entrada.
 * @returns {string} Texto normalizado sem diacríticos em maiúsculas.
 */
export function normalizarTextoSemAcentosUpper(texto: string): string {
  return (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

/**
 * Normaliza caracteres visualmente ambíguos produzidos por OCR em identificadores
 * alfanuméricos (`O -> 0`, `I/L -> 1`, `£/€ -> E`) para comparação tolerante.
 *
 * @param {string} identificador - Código lido ou esperado (`txid` / `E2E ID`).
 * @returns {string} Identificador padronizado em caixa alta apenas com alfanuméricos.
 */
export function normalizarIdentificadorConfusaoOcr(identificador: string): string {
  if (!identificador) return "";

  return normalizarTextoSemAcentosUpper(identificador)
    .replace(/[^A-Z0-9£€]/g, "")
    .replace(/[£€]/g, "E")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

/**
 * Cria o contexto inicial vazio para percorrer a Chain of Responsibility.
 *
 * @param {string} textoBruto - Texto extraído pela estratégia PDF/OCR.
 * @returns {ContextoAnaliseComprovante} Contexto inicializado.
 */
export function criarContextoAnaliseInicial(textoBruto: string): ContextoAnaliseComprovante {
  return {
    textoBruto,
    textoUpper: normalizarTextoSemAcentosUpper(textoBruto),
    bancoDetectado: "DESCONHECIDO",
    txidLido: null,
    txidCandidatos: [],
    e2eId: null,
    valorCentavos: null,
    valoresCandidatosCentavos: [],
    dataTransacaoIso: null,
    recebedorDetectado: null,
    cnpjRecebedorDetectado: null,
    alertasTexto: [],
  };
}
