/**
 * Remove todos os caracteres não numéricos de uma string, retornando apenas dígitos.
 *
 * @param {string | null} [valor] - Texto bruto (ex: telefone ou CPF formatado).
 * @returns {string} String contendo exclusivamente dígitos numéricos (0-9).
 */
export function somenteNumeros(valor?: string | null) {
  return String(valor || "").replace(/\D/g, "");
}

/**
 * Formata uma string de CPF progressivamente para exibição ou máscara de entrada (`000.000.000-00`).
 *
 * @param {string | null} [valor] - Dígitos ou CPF parcial/completo.
 * @returns {string} CPF formatado com pontos e traço.
 */
export function formatarCpf(valor?: string | null) {
  const apenasNumeros = somenteNumeros(valor).slice(0, 11);
  if (apenasNumeros.length <= 3) return apenasNumeros;
  if (apenasNumeros.length <= 6) return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3)}`;
  if (apenasNumeros.length <= 9) return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3, 6)}.${apenasNumeros.slice(6)}`;
  return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3, 6)}.${apenasNumeros.slice(6, 9)}-${apenasNumeros.slice(9)}`;
}

/**
 * Formata um valor numérico monetário para o padrão brasileiro (`R$ 1.250,00`).
 *
 * @param {number | null} [valor] - Quantia em reais.
 * @returns {string} String monetária formatada em BRL.
 */
export function formatarMoeda(valor?: number | null) {
  const valorSeguro = Number.isFinite(valor) ? Number(valor) : 0;

  return valorSeguro.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Formata um timestamp ISO ou data completa para o formato data e hora brasileiro (`DD/MM/AAAA HH:mm:ss`).
 *
 * @param {string | null} [data] - String ISO ou representação de data.
 * @returns {string} Data e hora formatadas ou aviso de indisponibilidade.
 */
export function formatarData(data?: string | null) {
  if (!data || data === "-") return "Data não informada";

  const dataConvertida = new Date(data);

  if (Number.isNaN(dataConvertida.getTime())) return "Data inválida";

  return dataConvertida.toLocaleString("pt-BR");
}

/**
 * Formata um timestamp ISO apenas com a data brasileira abreviada (`DD/MM/AAAA`).
 *
 * @param {string | null} [data] - String de data.
 * @returns {string} Data curta formatada ou aviso de indisponibilidade.
 */
export function formatarDataCurta(data?: string | null) {
  if (!data || data === "-") return "Data não informada";

  const dataConvertida = new Date(data);

  if (Number.isNaN(dataConvertida.getTime())) return "Data inválida";

  return dataConvertida.toLocaleDateString("pt-BR");
}

/**
 * Aplica máscara de telefone brasileiro com DDD, suportando telefones fixos (8 dígitos) e celulares (9 dígitos).
 *
 * @param {string | null} [valor] - Número de telefone bruto.
 * @returns {string} Telefone formatado como `(XX) XXXX-XXXX` ou `(XX) XXXXX-XXXX`.
 */
export function formatarTelefone(valor?: string | null): string {
  if (!valor) return "";
  const apenasNumeros = valor.replace(/\D/g, "").slice(0, 11);

  if (apenasNumeros.length <= 2) {
    return apenasNumeros;
  }

  if (apenasNumeros.length <= 7) {
    return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2)}`;
  }

  if (apenasNumeros.length <= 10) {
    return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(
      2,
      6,
    )}-${apenasNumeros.slice(6)}`;
  }

  return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(
    2,
    7,
  )}-${apenasNumeros.slice(7)}`;
}
