// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/services/relatorioRifasService.ts
// ============================================================================
import { TesourariaRelatorioService } from "../../tesouraria/services/tesourariaRelatorioService";

export class RelatorioRifasService {
  /**
   * Encaminha a solicitação de relatório financeiro consolidado para o serviço canônico da Tesouraria.
   *
   * @returns {Promise<any>} Relatório financeiro com estatísticas de rifas pagas, reservadas e canceladas.
   */
  static async obterRelatorioTesouraria() {
    return TesourariaRelatorioService.obterRelatorioTesouraria();
  }

  /**
   * Encaminha a solicitação de histórico detalhado para o serviço canônico da Tesouraria.
   *
   * @returns {Promise<any[]>} Lista detalhada de transações agrupadas por comprador.
   */
  static async obterHistoricoDetalhado() {
    return TesourariaRelatorioService.obterHistoricoDetalhado();
  }
}
