import { notificacoesService } from "@/shared/services/notificacoesService";

/**
 * Hook utilitário para consumo e leitura de notificações do usuário logado via API REST.
 * Delega as chamadas HTTP ao `notificacoesService` compartilhado.
 *
 * @returns {{ buscarNotificacoes: () => Promise<unknown[]>; marcarNotificacoesLidas: (ids: string[]) => Promise<void> }}
 *          Funções de busca e marcação em lote.
 */
export function useNotificacoes() {
  return {
    buscarNotificacoes: notificacoesService.buscarNotificacoes,
    marcarNotificacoesLidas: notificacoesService.marcarNotificacoesLidas,
  };
}
