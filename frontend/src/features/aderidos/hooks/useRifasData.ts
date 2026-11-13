// ============================================================================
// HOOK: useRifasData
//
// Busca e gerencia os dados remotos do painel do aderido:
// - Lista de rifas do usuario autenticado
// - Notificacoes do usuario autenticado
//
// Usa TanStack Query para cache, revalidacao e optimistic updates.
// Centraliza a logica de fetching, invalidacao e correcao de dados recusados.
// ============================================================================
import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthController } from "@/features/auth/hooks/useAuthController";
import { useNotificacoes } from "@/shared/hooks/useNotificacoes";

import { aderidoRifaService } from "../services/aderidoRifaService";
import {
  DadosCorrecaoRecusa,
  NotificacaoAderido,
  RifaAderido,
} from "../types/painelAderido";
import { sanitizarDadosCliente } from "@/shared/utils/sanitizadores";
import {
  filtrarApenasNotificacoesValidas,
  filtrarApenasRifasValidas,
} from "../utils/validadores";

const QUERY_STALE_TIME = 180_000; // 3 minutos
const QUERY_GC_TIME = 600_000; // 10 minutos

export function useRifasData() {
  const { buscarNotificacoes, marcarNotificacoesLidas } = useNotificacoes();
  const { usuarioAtual, loading: authCarregando } = useAuthController();
  const queryClient = useQueryClient();
  const usuarioId = usuarioAtual?.uid;
  const consultasAtivas = !authCarregando && Boolean(usuarioId);

  const rifasQueryKey = useMemo(
    () => ["aderidos", "minhas-rifas", usuarioId] as const,
    [usuarioId],
  );

  const notificacoesQueryKey = useMemo(
    () => ["aderidos", "notificacoes", usuarioId] as const,
    [usuarioId],
  );

  const rifasQuery = useQuery({
    queryKey: rifasQueryKey,
    queryFn: async () => {
      const dados = await aderidoRifaService.buscarMinhasRifas();
      const validadas = filtrarApenasRifasValidas(dados);
      if (usuarioId) {
        localStorage.setItem(`rifas_cache_${usuarioId}`, JSON.stringify(validadas));
      }
      return validadas;
    },
    enabled: consultasAtivas,
    staleTime: QUERY_STALE_TIME,
    gcTime: QUERY_GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  const notificacoesQuery = useQuery({
    queryKey: notificacoesQueryKey,
    queryFn: async () => {
      const dados = await buscarNotificacoes();
      const validadas = filtrarApenasNotificacoesValidas(dados);
      if (usuarioId) {
        localStorage.setItem(`notificacoes_cache_${usuarioId}`, JSON.stringify(validadas));
      }
      return validadas;
    },
    enabled: consultasAtivas,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
    gcTime: QUERY_GC_TIME,
    retry: 1,
  });

  const minhasRifas = useMemo(() => {
    if (!usuarioId) return [];
    if (rifasQuery.data) return rifasQuery.data;
    
    // Retorna cache inicial rápido (apenas visual) até a query finalizar
    const cache = localStorage.getItem(`rifas_cache_${usuarioId}`);
    return cache ? JSON.parse(cache) : [];
  }, [rifasQuery.data, usuarioId]);

  const notificacoes = useMemo(() => {
    if (!usuarioId) return [];
    if (notificacoesQuery.data) return notificacoesQuery.data;

    const cache = localStorage.getItem(`notificacoes_cache_${usuarioId}`);
    return cache ? JSON.parse(cache) : [];
  }, [notificacoesQuery.data, usuarioId]);

  const invalidarRifas = useCallback(async () => {
    if (!usuarioId) return;
    await queryClient.invalidateQueries({ queryKey: rifasQueryKey });
  }, [queryClient, rifasQueryKey, usuarioId]);

  const invalidarNotificacoes = useCallback(async () => {
    if (!usuarioId) return;
    await queryClient.invalidateQueries({ queryKey: notificacoesQueryKey });
  }, [notificacoesQueryKey, queryClient, usuarioId]);

  const invalidarDadosPainel = useCallback(async () => {
    await Promise.all([invalidarRifas(), invalidarNotificacoes()]);
  }, [invalidarNotificacoes, invalidarRifas]);

  // ------------------------------------------------------------------
  // Marca notificacoes como lidas (otimista)
  //
  // 1. Atualiza o cache local imediatamente (otimista)
  // 2. Envia os IDs ao backend
  // 3. Se falhar, reverte invalidando o cache para recarregar do servidor
  //
  // Verifica se os IDs pertencem ao usuario antes de enviar (defense-in-depth
  // contra IDOR, mesmo que o backend ja deva validar ownership).
  // ------------------------------------------------------------------
  const marcarNotificacoesLidasOtimista = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;

      const idsPertencemAoUsuario = ids.every((id) =>
        notificacoes.some((n) => n.id === id),
      );

      if (!idsPertencemAoUsuario) return;

      queryClient.setQueryData<NotificacaoAderido[]>(
        notificacoesQueryKey,
        (notificacoesAtuais = notificacoes) =>
          notificacoesAtuais.map((notificacao) => ({
            ...notificacao,
            lida: true,
          })),
      );

      try {
        await marcarNotificacoesLidas(ids);
      } catch {
        await queryClient.invalidateQueries({
          queryKey: notificacoesQueryKey,
        });
      }
    },
    [
      marcarNotificacoesLidas,
      notificacoes,
      notificacoesQueryKey,
      queryClient,
    ],
  );

  // ------------------------------------------------------------------
  // Corrige dados de rifas recusadas
  //
  // Sanitiza os dados antes de enviar para evitar que strings
  // malformadas ou excessivamente longas cheguem ao servidor.
  // ------------------------------------------------------------------
  const corrigirDadosRecusados = useCallback(
    async (numeros: string[], dadosAtualizados: DadosCorrecaoRecusa) => {
      const dadosSanitizados = sanitizarDadosCliente({
        nome: dadosAtualizados.nome,
        telefone: dadosAtualizados.telefone,
        email: dadosAtualizados.email,
      });
      try {
        await aderidoRifaService.corrigirDadosRifasRecusadas({
          numerosRifas: numeros,
          ...dadosSanitizados,
        });
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const desistirVendaRecusada = useCallback(async (numeros: string[]) => {
    try {
      await aderidoRifaService.desistirRifasRecusadas(numeros);
      return true;
    } catch {
      return false;
    }
  }, []);

  const carregando =
    authCarregando ||
    Boolean(
      usuarioId &&
        (rifasQuery.isLoading || notificacoesQuery.isLoading) &&
        minhasRifas.length === 0 &&
        notificacoes.length === 0,
    );

  const erroCarregamento = Boolean(
    !carregando && rifasQuery.isError && minhasRifas.length === 0,
  );

  const recarregarDados = useCallback(async () => {
    await Promise.all([rifasQuery.refetch(), notificacoesQuery.refetch()]);
  }, [notificacoesQuery, rifasQuery]);

  return {
    usuarioAtual,
    usuarioId,
    carregando,
    erroCarregamento,
    recarregarDados,
    authCarregando,
    minhasRifas,
    notificacoes,
    invalidarRifas,
    invalidarNotificacoes,
    invalidarDadosPainel,
    marcarNotificacoesLidasOtimista,
    corrigirDadosRecusados,
    desistirVendaRecusada,
  };
}
