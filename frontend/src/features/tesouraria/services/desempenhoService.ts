import { fetchAPI } from "@/shared/services/api";

import {
  AderidoMetricaDesempenho,
  ResumoGeralDesempenho,
  TransacaoDesempenho,
} from "../types/desempenho";
import { RESUMO_GERAL_DESEMPENHO_VAZIO } from "../utils/desempenhoDataUtils";

import { relatorioTesourariaService } from "./relatorioTesourariaService";

export type { RelatorioDesempenho } from "../types/desempenho";

function normalizarHistorico(resposta: unknown): TransacaoDesempenho[] {
  if (!resposta || typeof resposta !== "object") return [];

  const { historico } = resposta as { historico?: unknown };

  return Array.isArray(historico) ? (historico as TransacaoDesempenho[]) : [];
}

export const desempenhoService = {
  async buscarRelatorio() {
    return relatorioTesourariaService.obterRelatorioTesouraria();
  },

  async buscarHistoricoDetalhado() {
    const resposta = await fetchAPI("/tesouraria/historico");

    return normalizarHistorico(resposta);
  },
};
