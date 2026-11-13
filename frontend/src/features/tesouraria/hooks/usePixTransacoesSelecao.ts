import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PixTransacao,
  ResultadoLoteValidacaoTransacoes,
} from "../types/pixTransacoes";
import {
  pixPagamentoConfirmadoBanco,
  podeValidarPixTransacao,
} from "../utils/pixTransacoesStatusUtils";

/**
 * Feedback exibido após conclusão de uma ação de validação em lote.
 */
export interface FeedbackLotePix {
  /** Mensagem descritiva do resultado do lote. */
  mensagem: string;
  /** Severidade do alerta. */
  tipo: "success" | "warning";
}

/**
 * Contadores agregados exibidos nos chips de filtro de transações Pix.
 */
export interface ContagensTransacoesPix {
  /** Transações elegíveis para validação manual pela tesouraria. */
  novas: number;
  /** Transações aprovadas pela tesouraria. */
  aprovadas: number;
  /** Transações recusadas pela tesouraria. */
  recusadas: number;
  /** Transações sem confirmação bancária prévia. */
  aguardando_pagamento: number;
  /** Quantidade total de transações consideradas. */
  todas: number;
}

/**
 * Parâmetros de entrada para o hook de seleção múltipla e contagens de transações Pix.
 */
export interface UsePixTransacoesSelecaoParams {
  /** Lista de transações filtradas atualmente visível na tela. */
  transacoes: PixTransacao[];
  /** Lista completa de transações (usada no cálculo de contagens dos filtros). */
  todasTransacoes?: PixTransacao[];
}

/**
 * Retorno estruturado do hook de seleção e contagens da validação Pix.
 */
export interface UsePixTransacoesSelecaoResult {
  /** Conjunto de IDs de transações atualmente marcados. */
  selecionadosIds: Set<string>;
  /** Lista de transações correspondentes aos IDs marcados. */
  transacoesSelecionadas: PixTransacao[];
  /** Estado atual do toast de feedback em lote, ou `null` se fechado. */
  feedbackLote: FeedbackLotePix | null;
  /** Contagens agregadas para exibição nos chips de filtro. */
  contagens: ContagensTransacoesPix;
  /** Alterna seleção individual de uma transação pelo ID. */
  handleToggleSelecao: (id: string) => void;
  /** Marca ou desmarca todas as transações elegíveis de uma página. */
  handleToggleTodas: (idsPagina: string[]) => void;
  /** Limpa todas as seleções ativas. */
  handleLimparSelecao: () => void;
  /** Processa o retorno de validação em lote gerando o feedback visual apropriado. */
  handleConcluidoLote: (resultado: ResultadoLoteValidacaoTransacoes) => void;
  /** Fecha o toast de feedback em lote. */
  fecharFeedbackLote: () => void;
}

/**
 * Centraliza a seleção múltipla, sincronização com transações elegíveis,
 * cálculo de contagens por status e feedback de validação em lote entre desktop e mobile.
 *
 * @param {UsePixTransacoesSelecaoParams} params - Listas filtrada e completa de transações.
 * @returns {UsePixTransacoesSelecaoResult} Estado e manipuladores de seleção e feedback.
 */
export function usePixTransacoesSelecao({
  transacoes,
  todasTransacoes,
}: UsePixTransacoesSelecaoParams): UsePixTransacoesSelecaoResult {
  const [selecionadosIds, setSelecionadosIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [feedbackLote, setFeedbackLote] = useState<FeedbackLotePix | null>(
    null,
  );

  useEffect(() => {
    const idsElegiveis = new Set(
      transacoes.filter(podeValidarPixTransacao).map((t) => t.id),
    );
    setSelecionadosIds((anterior) => {
      if (anterior.size === 0) return anterior;
      const proximo = new Set<string>();
      anterior.forEach((id) => {
        if (idsElegiveis.has(id)) proximo.add(id);
      });
      return proximo.size === anterior.size ? anterior : proximo;
    });
  }, [transacoes]);

  const handleToggleSelecao = useCallback((id: string) => {
    setSelecionadosIds((anterior) => {
      const proximo = new Set(anterior);
      if (proximo.has(id)) {
        proximo.delete(id);
      } else {
        proximo.add(id);
      }
      return proximo;
    });
  }, []);

  const handleToggleTodas = useCallback((idsPagina: string[]) => {
    setSelecionadosIds((anterior) => {
      const proximo = new Set(anterior);
      const todasMarcadas =
        idsPagina.length > 0 && idsPagina.every((id) => proximo.has(id));
      if (todasMarcadas) {
        idsPagina.forEach((id) => proximo.delete(id));
      } else {
        idsPagina.forEach((id) => proximo.add(id));
      }
      return proximo;
    });
  }, []);

  const handleLimparSelecao = useCallback(() => {
    setSelecionadosIds(new Set());
  }, []);

  const handleConcluidoLote = useCallback(
    (resultado: ResultadoLoteValidacaoTransacoes) => {
      const erros = resultado.erros?.length || 0;
      if (erros > 0) {
        setFeedbackLote({
          tipo: "warning",
          mensagem: `${resultado.processadas} processada(s), ${erros} com erro.`,
        });
        return;
      }
      setFeedbackLote({
        tipo: "success",
        mensagem: `${resultado.processadas} ${
          resultado.processadas === 1
            ? "transação validada com sucesso."
            : "transações validadas com sucesso."
        }`,
      });
    },
    [],
  );

  const fecharFeedbackLote = useCallback(() => {
    setFeedbackLote(null);
  }, []);

  const transacoesSelecionadas = useMemo(
    () => transacoes.filter((t) => selecionadosIds.has(t.id)),
    [transacoes, selecionadosIds],
  );

  const fonte = todasTransacoes || transacoes;

  const contagens = useMemo<ContagensTransacoesPix>(
    () => ({
      novas: fonte.filter(podeValidarPixTransacao).length,
      aprovadas: fonte.filter((t) => t.statusValidacao === "aceita").length,
      recusadas: fonte.filter((t) => t.statusValidacao === "negada").length,
      aguardando_pagamento: fonte.filter(
        (t) => !pixPagamentoConfirmadoBanco(t),
      ).length,
      todas: fonte.length,
    }),
    [fonte],
  );

  return {
    selecionadosIds,
    transacoesSelecionadas,
    feedbackLote,
    contagens,
    handleToggleSelecao,
    handleToggleTodas,
    handleLimparSelecao,
    handleConcluidoLote,
    fecharFeedbackLote,
  };
}
