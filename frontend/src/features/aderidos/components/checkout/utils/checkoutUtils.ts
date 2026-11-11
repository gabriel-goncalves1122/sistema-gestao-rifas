// ============================================================================
// UTILS DE CHECKOUT
//
// Utilitarios de formatacao e calculo usados pelos componentes de checkout.
// ============================================================================
import { VALOR_RIFA } from "../../../utils/constants";
import { formatarCpf } from "@/shared/utils/formatadores";

export { formatarTelefone as aplicarMascaraTelefone } from "@/shared/utils/formatadores";

/**
 * Calcula o valor total monetário de uma seleção de rifas com base no preço unitário configurado.
 *
 * @param {string[]} numerosRifas - Lista de números de rifas selecionados.
 * @returns {number} Valor total da compra em reais.
 */
export function calcularValorTotalRifas(numerosRifas: string[]) {
  return numerosRifas.length * VALOR_RIFA;
}

/**
 * Aplica máscara progressiva de CPF (até 11 dígitos) ou CNPJ (12 a 14 dígitos).
 * Delega a formatação de CPF para `@/shared/utils/formatadores` evitando duplicação.
 *
 * @param {string} valor - String bruta contendo dígitos de CPF ou CNPJ.
 * @returns {string} Documento formatado com pontuação parcial ou completa.
 */
export function aplicarMascaraCpfCnpj(valor: string) {
  const apenasNumeros = valor.replace(/\D/g, "").slice(0, 14);

  if (apenasNumeros.length <= 11) {
    return formatarCpf(apenasNumeros);
  } else {
    // CNPJ: 99.999.999/9999-99
    if (apenasNumeros.length <= 12) {
      return `${apenasNumeros.slice(0, 2)}.${apenasNumeros.slice(
        2,
        5,
      )}.${apenasNumeros.slice(5, 8)}/${apenasNumeros.slice(8)}`;
    }
    return `${apenasNumeros.slice(0, 2)}.${apenasNumeros.slice(
      2,
      5,
    )}.${apenasNumeros.slice(5, 8)}/${apenasNumeros.slice(
      8,
      12,
    )}-${apenasNumeros.slice(12, 14)}`;
  }
}

export function formatarExpiracaoPix(data?: string | null) {
  if (!data) return "Expiração não informada";

  const dataConvertida = new Date(data);

  if (Number.isNaN(dataConvertida.getTime())) {
    return "Expiração inválida";
  }

  return dataConvertida.toLocaleString("pt-BR");
}
