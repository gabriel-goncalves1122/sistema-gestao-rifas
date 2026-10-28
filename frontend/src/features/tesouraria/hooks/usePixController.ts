import { useMemo, useState } from "react";

import { AbaPix } from "../types/pixTabs";
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
  variante = "desktop",
}: UseTesourariaPixControllerParams = {}) {
  const [abaAtual, setAbaAtual] = useState<AbaPix>("visao-geral");

  const {
    resumo,
    filtros,
    transacoes,
    transacoesFiltradas,
    carregando,
    sincronizando,
    validandoPixPorId,
    erroValidacaoPixPorId,
    setFiltros,
    sincronizarBanco,
    aceitarTransacao,
    negarTransacao,
  } = usePixTransacoes();

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
      validandoPixPorId,
      erroValidacaoPixPorId,
      onAceitar: aceitarTransacao,
      onNegar: negarTransacao,
    }),
    [
      aceitarTransacao,
      erroValidacaoPixPorId,
      filtros,
      negarTransacao,
      resumo,
      setFiltros,
      transacoes,
      transacoesFiltradas,
      validandoPixPorId,
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
    validandoPixPorId,
    erroValidacaoPixPorId,
    pixProps,
    setAbaAtual,
    setFiltros,
    sincronizarBanco,
    onSincronizar: sincronizarBanco,
    onAceitarTransacao: aceitarTransacao,
    onNegarTransacao: negarTransacao,
  };
}
