// ============================================================================
// ARQUIVO: backend/functions/src/shared/utils/validadoresDocumentos.ts
// ============================================================================

import { somenteNumeros } from "./formatadores";

/**
 * Valida matematicamente os dígitos verificadores de um CPF (11 dígitos).
 * Rejeita sequências de dígitos repetidos (ex: `'11111111111'`) e aplica o módulo 11 oficial.
 *
 * @param {string | null} [cpf] - CPF com ou sem pontuação.
 * @returns {boolean} `true` se o CPF for matematicamente válido.
 */
export function validarCpf(cpf?: string | null): boolean {
  const numeros = somenteNumeros(cpf);
  if (numeros.length !== 11 || /^(\d)\1{10}$/.test(numeros)) {
    return false;
  }

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += Number(numeros[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== Number(numeros[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += Number(numeros[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === Number(numeros[10]);
}

/**
 * Valida matematicamente os dígitos verificadores de um CNPJ (14 dígitos).
 * Rejeita sequências repetidas e aplica os pesos oficiais de módulo 11.
 *
 * @param {string | null} [cnpj] - CNPJ com ou sem pontuação.
 * @returns {boolean} `true` se o CNPJ for matematicamente válido.
 */
export function validarCnpj(cnpj?: string | null): boolean {
  const numeros = somenteNumeros(cnpj);
  if (numeros.length !== 14 || /^(\d)\1{13}$/.test(numeros)) {
    return false;
  }

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += Number(numeros[i]) * pesos1[i];
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (digito1 !== Number(numeros[12])) return false;

  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += Number(numeros[i]) * pesos2[i];
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  return digito2 === Number(numeros[13]);
}

/**
 * Valida se o documento informado corresponde a um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.
 *
 * @param {string | null} [documento] - Documento com ou sem máscara.
 * @returns {boolean} `true` se for um CPF ou CNPJ válido.
 */
export function validarDocumentoPix(documento?: string | null): boolean {
  const numeros = somenteNumeros(documento);
  if (numeros.length === 11) return validarCpf(numeros);
  if (numeros.length === 14) return validarCnpj(numeros);
  return false;
}

/**
 * Valida se o e-mail possui formato compatível com o gateway de pagamentos (com TLD alfabético de ao menos 2 letras).
 *
 * @param {string | null} [email] - Endereço de e-mail a validar.
 * @returns {boolean} `true` se o formato do e-mail for válido.
 */
export function validarEmailPix(email?: string | null): boolean {
  const limpo = String(email || "").trim();
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(limpo);
}
