import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { relatorioTesourariaService } from "../services/relatorioTesourariaService";
import {
  AderidoMetricaDesempenho,
  ResumoGeralDesempenho,
} from "../types/desempenho";
import { RESUMO_GERAL_DESEMPENHO_VAZIO } from "../utils/desempenhoDataUtils";

export interface UseRelatorioTesourariaRetorno {
  resumoGeral: ResumoGeralDesempenho;
  aderidos: AderidoMetricaDesempenho[];
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
}

/**
 * Hook orquestrador do relatório financeiro consolidado da Tesouraria.
 * Compartilha o estado e cache do React Query da chave `["tesouraria", "relatorio"]`
 * entre as páginas e abas que necessitam dos indicadores gerais e da lista de aderidos.
 *
 * @returns {UseRelatorioTesourariaRetorno} Dados de resumo, aderidos e callbacks de recarga.
 */
export function useRelatorioTesouraria(): UseRelatorioTesourariaRetorno {
  const queryClient = useQueryClient();

  const { data, isLoading: carregando, error } = useQuery({
    queryKey: ["tesouraria", "relatorio"],
    queryFn: async () => {
      return relatorioTesourariaService.obterRelatorioTesouraria();
    },
    staleTime: 180_000,
  });

  const resumoGeral = data?.resumoGeral || RESUMO_GERAL_DESEMPENHO_VAZIO;
  const aderidos = data?.aderidos || [];
  const erro = error instanceof Error ? error.message : null;

  const recarregar = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["tesouraria", "relatorio"],
    });
  }, [queryClient]);

  return {
    resumoGeral,
    aderidos,
    carregando,
    erro,
    recarregar,
  };
}
