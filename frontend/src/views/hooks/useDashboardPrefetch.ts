import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { aderidoRifaService } from "@/features/aderidos/services/aderidoRifaService";
import {
  filtrarApenasNotificacoesValidas,
  filtrarApenasRifasValidas,
} from "@/features/aderidos/utils/validadores";
import { documentosSecretariaService } from "@/features/secretaria/documentos/services/documentosSecretariaService";
import { secretariaService } from "@/features/secretaria/membros/services/secretariaService";
import { auditoriaComprasService } from "@/features/tesouraria/services/auditoriaComprasService";
import { pixTransacoesService } from "@/features/tesouraria/services/pixTransacoesService";
import { relatorioTesourariaService } from "@/features/tesouraria/services/relatorioTesourariaService";
import { notificacoesService } from "@/shared/services/notificacoesService";
import type { Contexto } from "@/views/pages/DashboardPage";

interface UseDashboardPrefetchParams {
  contextoAtual: Contexto;
  usuarioUid?: string | null;
  hasTesourariaAccess: boolean;
  hasSecretariaAccess: boolean;
}

const PREFETCH_STALE_TIME = 180_000;

/**
 * Hook responsável por pré-carregar (prefetch) as queries mais prováveis de cada contexto
 * do painel (`aderido`, `tesouraria`, `secretaria`) sem expor chamadas HTTP diretas na camada de página.
 *
 * @param {UseDashboardPrefetchParams} params - Contexto ativo, UID do usuário e permissões de acesso.
 * @sideEffects Executa `queryClient.prefetchQuery` e atualiza cache visual em `localStorage` no contexto aderido.
 */
export function useDashboardPrefetch({
  contextoAtual,
  usuarioUid,
  hasTesourariaAccess,
  hasSecretariaAccess,
}: UseDashboardPrefetchParams) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (contextoAtual === "aderido" && usuarioUid) {
      queryClient.prefetchQuery({
        queryKey: ["aderidos", "minhas-rifas", usuarioUid],
        staleTime: PREFETCH_STALE_TIME,
        queryFn: async () => {
          try {
            const dados = await aderidoRifaService.buscarMinhasRifas();
            const validadas = filtrarApenasRifasValidas(dados);
            localStorage.setItem(
              `rifas_cache_${usuarioUid}`,
              JSON.stringify(validadas),
            );
            return validadas;
          } catch {
            return [];
          }
        },
      });

      queryClient.prefetchQuery({
        queryKey: ["aderidos", "notificacoes", usuarioUid],
        staleTime: PREFETCH_STALE_TIME,
        queryFn: async () => {
          try {
            const lista = await notificacoesService.buscarNotificacoes();
            const validadas = filtrarApenasNotificacoesValidas(lista);
            localStorage.setItem(
              `notificacoes_cache_${usuarioUid}`,
              JSON.stringify(validadas),
            );
            return validadas;
          } catch {
            return [];
          }
        },
      });
    }

    if (contextoAtual === "tesouraria" && hasTesourariaAccess) {
      queryClient.prefetchQuery({
        queryKey: ["tesouraria", "pix"],
        staleTime: PREFETCH_STALE_TIME,
        queryFn: async () => {
          const [resultadoTransacoes, resultadoResumo] =
            await Promise.allSettled([
              pixTransacoesService.buscarTransacoes(),
              pixTransacoesService.buscarResumo(),
            ]);
          return {
            transacoes:
              resultadoTransacoes.status === "fulfilled"
                ? resultadoTransacoes.value
                : [],
            resumo:
              resultadoResumo.status === "fulfilled"
                ? resultadoResumo.value
                : null,
          };
        },
      });

      queryClient.prefetchQuery({
        queryKey: ["tesouraria", "relatorio"],
        staleTime: PREFETCH_STALE_TIME,
        queryFn: () => relatorioTesourariaService.obterRelatorioTesouraria(),
      });

      queryClient.prefetchQuery({
        queryKey: ["tesouraria", "auditoria-historico"],
        staleTime: PREFETCH_STALE_TIME,
        queryFn: () => auditoriaComprasService.buscarHistoricoDetalhado(),
      });
    }

    if (contextoAtual === "secretaria" && hasSecretariaAccess) {
      queryClient.prefetchQuery({
        queryKey: ["secretaria", "membros"],
        staleTime: PREFETCH_STALE_TIME,
        queryFn: () => secretariaService.buscarAderidos(),
      });

      queryClient.prefetchQuery({
        queryKey: ["secretaria", "documentos"],
        staleTime: PREFETCH_STALE_TIME,
        queryFn: () => documentosSecretariaService.listarDocumentos(),
      });
    }
  }, [
    contextoAtual,
    hasTesourariaAccess,
    hasSecretariaAccess,
    queryClient,
    usuarioUid,
  ]);
}
