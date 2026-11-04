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
 * Reutiliza os dados já em cache de relatório consolidado (["tesouraria", "relatorio"])
 * e histórico (["tesouraria", "auditoria-historico"]), evitando requisições duplicadas.
 *
 * @returns {UseDesempenhoControllerRetorno} Dados processados e controladores de filtro.
 */
export function useDesempenhoController(): UseDesempenhoControllerRetorno {
  const queryClient = useQueryClient();
  const [buscaRanking, setBuscaRanking] = useState("");

  const {
    data: relatorioData,
    isLoading: carregandoRelatorio,
    error: errorRelatorio,
  } = useQuery({
    queryKey: ["tesouraria", "relatorio"],
    queryFn: async () => {
      return await desempenhoService.buscarRelatorio();
    },
    staleTime: 180_000,
    refetchOnMount: false,
  });

  const {
    data: historicoTransacoes = [],
    isLoading: carregandoHistorico,
    error: errorHistorico,
  } = useQuery({
    queryKey: ["tesouraria", "auditoria-historico"],
    queryFn: async () => {
      return await desempenhoService.buscarHistoricoDetalhado();
    },
    staleTime: 180_000,
    refetchOnMount: false,
  });

  const carregando = carregandoRelatorio || carregandoHistorico;

  const erro = useMemo(() => {
    if (errorRelatorio && errorHistorico) {
      return "Erro ao carregar dados de desempenho.";
    }
    if (errorRelatorio instanceof Error) return errorRelatorio.message;
    if (errorHistorico instanceof Error) return errorHistorico.message;
    return null;
  }, [errorHistorico, errorRelatorio]);

  const resumoGeral = relatorioData?.resumoGeral || RESUMO_GERAL_DESEMPENHO_VAZIO;
  const aderidos = relatorioData?.aderidos || [];

  const carregarDados = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tesouraria", "relatorio"] }),
      queryClient.invalidateQueries({
        queryKey: ["tesouraria", "auditoria-historico"],
      }),
    ]);
  }, [queryClient]);

  const dados = useMemo(
    () =>
      montarDadosDesempenho({
        resumoGeral,
        aderidos,
        historicoTransacoes: Array.isArray(historicoTransacoes)
          ? historicoTransacoes
          : [],
      }),
    [aderidos, historicoTransacoes, resumoGeral],
  );

  const rankingFiltrado = useMemo(() => {
    const termo = buscaRanking.trim().toLowerCase();
    if (!termo) return dados.rankingAderidos;

    return dados.rankingAderidos.filter((item) => {
      const campos = [item.nome, item.cpf, item.curso, item.cargo];
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
