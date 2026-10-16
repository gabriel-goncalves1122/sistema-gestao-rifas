/**
 * Extrai exclusivamente os dígitos numéricos de uma string, removendo formatações (pontos, traços, etc.).
 *
 * @param {string | null} [valor] - Valor bruto a ser sanitizado (ex: CPF formatado "123.456.789-00").
 * @returns {string} String contendo apenas os caracteres de 0 a 9.
 */
export function somenteNumeros(valor?: string | null): string {
  return String(valor || "").replace(/\D/g, "");
}
