import { fetchAPI } from "@/shared/services/api";

/**
 * Hook utilitário para consumo e leitura de notificações do usuário logado via API REST.
 *
 * @returns {{ buscarNotificacoes: () => Promise<any[]>; marcarNotificacoesLidas: (ids: string[]) => Promise<void> }}
 *          Funções de busca e marcação em lote.
 */
export function useNotificacoes() {
  const buscarNotificacoes = async () => {
    try {
      const result = await fetchAPI("/notificacoes");
      return result.notificacoes || [];
    } catch (error) {
      return [];
    }
  };

  const marcarNotificacoesLidas = async (ids: string[]) => {
    await fetchAPI("/notificacoes/ler", "PUT", { ids });
  };

  return { buscarNotificacoes, marcarNotificacoesLidas };
}
