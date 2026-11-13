import { useMemo, useState } from "react";

import { AbaPix } from "../types/pixTabs";
import { useConciliacaoExtrato } from "./useConciliacaoExtrato";
import { usePixTransacoes } from "./usePixTransacoes";
import { useRelatorioTesouraria } from "./useRelatorioTesouraria";

/**
 * Parâmetros de configuração do controller de Tesouraria Pix.
 */
interface UseTesourariaPixControllerParams {
  /** Variante de exibição visual ('desktop' ou 'mobile') */
  variante?: "desktop" | "mobile";
}

/**
 * Hook de controlador para a página principal da Tesouraria Pix.
 * Governa a navegação entre abas, sincronização bancária, carregamento de transações
 * e recuperação das métricas consolidadas de aderidos do servidor.
 *
 * @param {UseTesourariaPixControllerParams} [params] - Parâmetros opcionais.
 * @returns {Object} Estados da página, listas filtradas, aderidos e callbacks de ação.
 */
export function usePixController({
  variante: _variante = "desktop",
}: UseTesourariaPixControllerParams = {}) {
  const [abaAtual, setAbaAtual] = useState<AbaPix>("visao-geral");

  const {
    resumo,
    filtros,
    transacoes,
    transacoesFiltradas,
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
  } = usePixTransacoes();

  const conciliacao = useConciliacaoExtrato(carregarDados);

  const { aderidos, relatorio } = useRelatorioTesouraria();
  const aderidosServidor =
    aderidos && aderidos.length > 0
      ? aderidos
      : relatorio?.rankingAderidos || [];

  const abaVisivel = abaAtual;

  const pixProps = useMemo(
    () => ({
      resumo,
      filtros,
      transacoes: transacoesFiltradas,
      todasTransacoes: transacoes,
      onChangeFiltros: setFiltros,
      onAceitar: aceitarTransacao,
      onNegar: negarTransacao,
      onAceitarLote: aceitarTransacoesEmLote,
      onNegarLote: negarTransacoesEmLote,
      onReanalisarOcr: reanalisarOcr,
      reanalisandoOcrId,
      onAbrirConciliacao: conciliacao.abrirDialog,
    }),
    [
      aceitarTransacao,
      aceitarTransacoesEmLote,
      conciliacao.abrirDialog,
      filtros,
      negarTransacao,
      negarTransacoesEmLote,
      reanalisandoOcrId,
      reanalisarOcr,
      resumo,
      setFiltros,
      transacoes,
      transacoesFiltradas,
    ],
  );

  return {
    abaAtual,
    abaVisivel,
    resumo,
    filtros,
    transacoes,
    transacoesFiltradas,
    aderidosServidor,
    carregando,
    sincronizando,
    pixProps,
    conciliacao,
    setAbaAtual,
    setFiltros,
    sincronizarBanco,
    onSincronizar: sincronizarBanco,
    onAceitarTransacao: aceitarTransacao,
    onNegarTransacao: negarTransacao,
    onAbrirConciliacao: conciliacao.abrirDialog,
  };
}
