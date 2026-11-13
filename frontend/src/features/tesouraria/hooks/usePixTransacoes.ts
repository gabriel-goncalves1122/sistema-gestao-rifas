import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useDebounce } from "@/shared/hooks/useDebounce";

import { pixTransacoesService } from "../services/pixTransacoesService";
import {
  AnaliseOcrDTO,
  ItemLoteValidacaoTransacao,
  PixTransacoesFiltros,
  PixTransacoesResumo,
  PixTransacao,
  ResultadoLoteValidacaoTransacoes,
} from "../types/pixTransacoes";
import { calcularResumoPixTransacoes } from "../utils/pixTransacoesMetricasUtils";
import { filtrarPixTransacoes } from "../utils/pixTransacoesFiltrosUtils";

function resumoPossuiDados(resumo: PixTransacoesResumo | null) {
  if (!resumo) return false;
  return Object.values(resumo).some(
    (valor) => typeof valor === "number" && valor > 0,
  );
}

export function usePixTransacoes() {
  const queryClient = useQueryClient();
  const [sincronizando, setSincronizando] = useState(false);
  const [reanalisandoOcrId, setReanalisandoOcrId] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<PixTransacoesFiltros>({
    status: "novas",
    busca: "",
  });

  const { data, isLoading: carregando } = useQuery({
    queryKey: ["tesouraria", "pix"],
    queryFn: async () => {
      // 1. Busca as transações principais da Tesouraria
      const transacoes = await pixTransacoesService.buscarTransacoes();

      // 2. Tenta recuperar resumo agregado via endpoint dedicado ou deriva localmente sem quebrar o fluxo
      let resumo: PixTransacoesResumo | null = null;
      try {
        resumo = await pixTransacoesService.buscarResumo();
      } catch {
        resumo = null;
      }

      return { transacoes, resumo };
    },
    staleTime: 60_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const transacoes = data?.transacoes || [];
  const resumoAPI = data?.resumo || null;
  const resumo = resumoPossuiDados(resumoAPI)
    ? resumoAPI!
    : calcularResumoPixTransacoes(transacoes);

  const carregarDados = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tesouraria", "pix"] }),
      queryClient.invalidateQueries({ queryKey: ["tesouraria", "relatorio"] }),
    ]);
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

interface CachePixTransacoes {
  transacoes: PixTransacao[];
  resumo: PixTransacoesResumo | null;
}

  const atualizarTransacaoLocal = useCallback(
    (transacaoId: string, atualizacao: Partial<PixTransacao>) => {
      queryClient.setQueryData<CachePixTransacoes>(["tesouraria", "pix"], (oldData) => {
        if (!oldData) return oldData;
        const novasTransacoes = oldData.transacoes.map((t: PixTransacao) =>
          t.id === transacaoId ? { ...t, ...atualizacao } : t,
        );
        return {
          ...oldData,
          transacoes: novasTransacoes,
          resumo: oldData.resumo,
        };
      });
    },
    [queryClient],
  );

  const aceitarTransacao = useCallback(
    async (transacaoId: string, chaveAcao?: string) => {
      const previousData = queryClient.getQueryData(["tesouraria", "pix"]);
      atualizarTransacaoLocal(transacaoId, { statusValidacao: "aceita" });

      try {
        await pixTransacoesService.aceitarTransacao(transacaoId, chaveAcao);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["tesouraria", "pix"] }),
          queryClient.invalidateQueries({ queryKey: ["tesouraria", "relatorio"] }),
        ]);
      } catch (error) {
        queryClient.setQueryData(["tesouraria", "pix"], previousData);
        console.error("Erro ao aceitar transação:", error);
        throw error;
      }
    },
    [queryClient, atualizarTransacaoLocal],
  );

  const negarTransacao = useCallback(
    async (transacaoId: string, motivo: string, chaveAcao?: string) => {
      const previousData = queryClient.getQueryData(["tesouraria", "pix"]);
      atualizarTransacaoLocal(transacaoId, {
        statusValidacao: "negada",
        statusPagamento: "DECLINED",
        observacao: motivo,
      });

      try {
        await pixTransacoesService.negarTransacao(transacaoId, motivo, chaveAcao);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["tesouraria", "pix"] }),
          queryClient.invalidateQueries({ queryKey: ["tesouraria", "relatorio"] }),
        ]);
      } catch (error) {
        queryClient.setQueryData(["tesouraria", "pix"], previousData);
        console.error("Erro ao negar transação:", error);
        throw error;
      }
    },
    [queryClient, atualizarTransacaoLocal],
  );

  const aceitarTransacoesEmLote = useCallback(
    async (itens: ItemLoteValidacaoTransacao[]): Promise<ResultadoLoteValidacaoTransacoes> => {
      const previousData = queryClient.getQueryData(["tesouraria", "pix"]);
      itens.forEach((item) => {
        atualizarTransacaoLocal(item.id, { statusValidacao: "aceita" });
      });

      try {
        const resultado = await pixTransacoesService.aceitarTransacoesEmLote(itens);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["tesouraria", "pix"] }),
          queryClient.invalidateQueries({ queryKey: ["tesouraria", "relatorio"] }),
        ]);
        return resultado;
      } catch (error) {
        queryClient.setQueryData(["tesouraria", "pix"], previousData);
        console.error("Erro ao aceitar transações em lote:", error);
        throw error;
      }
    },
    [queryClient, atualizarTransacaoLocal],
  );

  const negarTransacoesEmLote = useCallback(
    async (
      itens: ItemLoteValidacaoTransacao[],
      motivo: string,
    ): Promise<ResultadoLoteValidacaoTransacoes> => {
      const previousData = queryClient.getQueryData(["tesouraria", "pix"]);
      itens.forEach((item) => {
        atualizarTransacaoLocal(item.id, {
          statusValidacao: "negada",
          statusPagamento: "DECLINED",
          observacao: motivo,
        });
      });

      try {
        const resultado = await pixTransacoesService.negarTransacoesEmLote(itens, motivo);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["tesouraria", "pix"] }),
          queryClient.invalidateQueries({ queryKey: ["tesouraria", "relatorio"] }),
        ]);
        return resultado;
      } catch (error) {
        queryClient.setQueryData(["tesouraria", "pix"], previousData);
        console.error("Erro ao negar transações em lote:", error);
        throw error;
      }
    },
    [queryClient, atualizarTransacaoLocal],
  );

  const reanalisarOcr = useCallback(
    async (transacaoId: string): Promise<AnaliseOcrDTO | null> => {
      setReanalisandoOcrId(transacaoId);
      try {
        const analiseAtualizada = await pixTransacoesService.reanalisarOcr(transacaoId);
        if (analiseAtualizada) {
          atualizarTransacaoLocal(transacaoId, { analiseOcr: analiseAtualizada });
        }
        await queryClient.invalidateQueries({ queryKey: ["tesouraria", "pix"] });
        return analiseAtualizada;
      } catch (error) {
        console.error("Erro ao reanalisar OCR da transação:", error);
        throw error;
      } finally {
        setReanalisandoOcrId(null);
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
    reanalisandoOcrId,

    setFiltros,
    carregarDados,
    sincronizarBanco,
    aceitarTransacao,
    negarTransacao,
    aceitarTransacoesEmLote,
    negarTransacoesEmLote,
    reanalisarOcr,
  };
}
