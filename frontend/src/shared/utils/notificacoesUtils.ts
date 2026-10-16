import { TipoNotificacaoRifa } from "../types/notificacoes";

/**
 * Normaliza o tipo de notificação de rifas garantindo um dos literais válidos (`rifa_liberada`, `informativo`, ou fallback `correcao_dados`).
 *
 * @param {string | null} [tipo] - Tipo informado no payload do Firestore.
 * @returns {TipoNotificacaoRifa} Tipo tipado de notificação de rifa.
 */
export function normalizarTipoNotificacaoRifa(
  tipo?: string | null,
): TipoNotificacaoRifa {
  if (tipo === "rifa_liberada") return "rifa_liberada";
  if (tipo === "informativo") return "informativo";

  return "correcao_dados";
}

/**
 * Formata o timestamp de uma notificação para o padrão de data curta brasileiro (`DD/MM/AAAA`).
 *
 * @param {string | null} [data] - String ISO de data de criação.
 * @returns {string} Data formatada ou string vazia se ausente/inválida.
 */
export function formatarDataNotificacao(data?: string | null) {
  if (!data) return "";

  const dataConvertida = new Date(data);

  if (Number.isNaN(dataConvertida.getTime())) return "";

  return dataConvertida.toLocaleDateString("pt-BR");
}
