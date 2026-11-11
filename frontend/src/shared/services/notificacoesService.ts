import { fetchAPI } from "@/shared/services/api";

/**
 * Serviço compartilhado de consumo e marcação de leitura das notificações do usuário.
 */
export const notificacoesService = {
  /**
   * Busca as notificações destinadas ao usuário autenticado.
   *
   * @returns {Promise<unknown[]>} Lista bruta de notificações retornada pela API (ou vazio em falha).
   */
  async buscarNotificacoes(): Promise<unknown[]> {
    try {
      const result = await fetchAPI("/notificacoes");
      return Array.isArray(result?.notificacoes) ? result.notificacoes : [];
    } catch {
      return [];
    }
  },

  /**
   * Marca um conjunto de notificações como lidas no backend.
   *
   * @param {string[]} ids - Identificadores das notificações a marcar como lidas.
   * @returns {Promise<void>}
   */
  async marcarNotificacoesLidas(ids: string[]): Promise<void> {
    await fetchAPI("/notificacoes/ler", "PUT", { ids });
  },
};
