import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useDebounce } from "@/shared/hooks/useDebounce";

import { pixTransacoesService } from "../services/pixTransacoesService";
import {
  PixTransacoesFiltros,
  PixTransacoesResumo,
  PixTransacao,
} from "../types/pixTransacoes";
import {
  calcularResumoPixTransacoes,
  filtrarPixTransacoes,
  RESUMO_PIX_TRANSACOES_VAZIO,
} from "../utils/pixTransacoesUtils";

function resumoPossuiDados(resumo: PixTransacoesResumo | null) {
  if (!resumo) return false;
  return Object.values(resumo).some((valor) => valor > 0);
}

export function usePixTransacoes() {
  const queryClient = useQueryClient();
  const [sincronizando, setSincronizando] = useState(false);
  const [filtros, setFiltros] = useState<PixTransacoesFiltros>({
    status: "novas",
    busca: "",
  });

  const { data, isLoading: carregando } = useQuery({
    queryKey: ["tesouraria", "pix"],
    queryFn: async () => {
      const [resultadoTransacoes, resultadoResumo] = await Promise.allSettled([
        pixTransacoesService.buscarTransacoes(),
        pixTransacoesService.buscarResumo(),
      ]);

      const transacoes =
        resultadoTransacoes.status === "fulfilled"
          ? resultadoTransacoes.value
          : [];
      const resumo =
        resultadoResumo.status === "fulfilled" ? resultadoResumo.value : null;

      return { transacoes, resumo };
    },
    staleTime: 180_000,
  });

  const transacoes = data?.transacoes || [];
  const resumoAPI = data?.resumo || null;
  const resumo = resumoPossuiDados(resumoAPI)
    ? resumoAPI!
    : calcularResumoPixTransacoes(transacoes);

  const carregarDados = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["tesouraria", "pix"] });
  }, [queryClient]);

  const sincronizarBanco = async () => {
    setSincronizando(true);
    try {
      await pixTransacoesService.sincronizarBanco();
      await carregarDados();
    } finally {
      setSincronizando(false);
    }
  };

  const debouncedBusca = useDebounce(filtros.busca, 250);

  const transacoesFiltradas = useMemo(() => {
    return filtrarPixTransacoes(transacoes, {
      ...filtros,
      busca: debouncedBusca,
    });
  }, [transacoes, filtros, debouncedBusca]);

  const atualizarTransacaoLocal = useCallback(
    (transacaoId: string, atualizacao: Partial<PixTransacao>) => {
      queryClient.setQueryData(["tesouraria", "pix"], (oldData: any) => {
        if (!oldData) return oldData;
        const novasTransacoes = oldData.transacoes.map((t: PixTransacao) =>
          t.id === transacaoId ? { ...t, ...atualizacao } : t,
        );
        return {
          ...oldData,
          transacoes: novasTransacoes,
          resumo: calcularResumoPixTransacoes(novasTransacoes),
        };
      });
    },
    [queryClient],
  );

  const aceitarTransacao = useCallback(
    async (transacaoId: string) => {
      const previousData = queryClient.getQueryData(["tesouraria", "pix"]);
      atualizarTransacaoLocal(transacaoId, { statusValidacao: "aceita" });

      try {
        await pixTransacoesService.aceitarTransacao(transacaoId);
        queryClient.invalidateQueries({ queryKey: ["tesouraria"] });
      } catch (error) {
        queryClient.setQueryData(["tesouraria", "pix"], previousData);
        console.error("Erro ao aceitar transação:", error);
        throw error;
      }
    },
    [queryClient, atualizarTransacaoLocal],
  );

  const negarTransacao = useCallback(
    async (transacaoId: string, motivo: string) => {
      const previousData = queryClient.getQueryData(["tesouraria", "pix"]);
      atualizarTransacaoLocal(transacaoId, {
        statusValidacao: "negada",
        statusPagamento: "DECLINED",
        observacao: motivo,
      });

      try {
        await pixTransacoesService.negarTransacao(transacaoId, motivo);
        queryClient.invalidateQueries({ queryKey: ["tesouraria"] });
      } catch (error) {
        queryClient.setQueryData(["tesouraria", "pix"], previousData);
        console.error("Erro ao negar transação:", error);
        throw error;
      }
    },
    [queryClient, atualizarTransacaoLocal],
  );

  return {
    transacoes,
    transacoesFiltradas,
    resumo,
    filtros,
    carregando,
    sincronizando,

    setFiltros,
    carregarDados,
    sincronizarBanco,
    aceitarTransacao,
    negarTransacao,
  };
}
