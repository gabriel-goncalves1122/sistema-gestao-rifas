import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  montarDadosDesempenho,
  RESUMO_GERAL_DESEMPENHO_VAZIO,
} from "../utils/desempenhoDataUtils";
import { desempenhoService } from "../services/desempenhoService";
import { AderidoRankingDesempenho, DesempenhoDados } from "../types/desempenho";

export interface UseDesempenhoControllerRetorno {
  dados: DesempenhoDados;
  rankingFiltrado: AderidoRankingDesempenho[];
  buscaRanking: string;
  setBuscaRanking: (termo: string) => void;
  carregando: boolean;
  erro: string | null;
  carregarDados: () => Promise<void>;
}

/**
 * Hook controlador da tela de Desempenho Financeiro da Tesouraria.
 * Orquestra o carregamento simultâneo do relatório consolidado e histórico,
 * computando métricas, séries temporais, metas e rankings de aderidos.
 *
 * @returns {UseDesempenhoControllerRetorno} Dados processados e controladores de filtro.
 */
export function useDesempenhoController(): UseDesempenhoControllerRetorno {
  const queryClient = useQueryClient();
  const [buscaRanking, setBuscaRanking] = useState("");

  const { data, isLoading: carregando, error } = useQuery({
    queryKey: ["tesouraria", "desempenho"],
    queryFn: async () => {
      const [resultadoRelatorio, resultadoHistorico] = await Promise.allSettled([
        desempenhoService.buscarRelatorio(),
        desempenhoService.buscarHistoricoDetalhado(),
      ]);

      const resumoGeral =
        resultadoRelatorio.status === "fulfilled"
          ? resultadoRelatorio.value.resumoGeral
          : RESUMO_GERAL_DESEMPENHO_VAZIO;
      const aderidos =
        resultadoRelatorio.status === "fulfilled"
          ? resultadoRelatorio.value.aderidos
          : [];
      const historicoTransacoes =
        resultadoHistorico.status === "fulfilled"
          ? resultadoHistorico.value
          : [];

      if (
        resultadoRelatorio.status === "rejected" &&
        resultadoHistorico.status === "rejected"
      ) {
        throw new Error("Erro ao carregar dados de desempenho.");
      }

      return { resumoGeral, aderidos, historicoTransacoes };
    },
    staleTime: 180_000,
  });

  const resumoGeral = data?.resumoGeral || RESUMO_GERAL_DESEMPENHO_VAZIO;
  const aderidos = data?.aderidos || [];
  const historicoTransacoes = data?.historicoTransacoes || [];
  const erro = error instanceof Error ? error.message : null;

  const carregarDados = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["tesouraria", "desempenho"] });
  }, [queryClient]);

  const dados = useMemo(
    () =>
      montarDadosDesempenho({
        resumoGeral,
        aderidos,
        historicoTransacoes,
      }),
    [aderidos, historicoTransacoes, resumoGeral],
  );

  const rankingFiltrado = useMemo(() => {
    const termo = buscaRanking.trim().toLowerCase();
    if (!termo) return dados.rankingAderidos;

    return dados.rankingAderidos.filter((item) => {
      const campos = [
        item.nome,
        item.cpf,
        item.curso,
        item.cargo,
      ];
      return campos.some((campo) =>
        String(campo || "").toLowerCase().includes(termo),
      );
    });
  }, [dados.rankingAderidos, buscaRanking]);

  return {
    dados,
    rankingFiltrado,
    buscaRanking,
    setBuscaRanking,
    carregando,
    erro,
    carregarDados,
  };
}
