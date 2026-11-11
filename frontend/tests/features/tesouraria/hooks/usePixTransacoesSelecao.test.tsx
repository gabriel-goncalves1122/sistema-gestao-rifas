import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { usePixTransacoesSelecao } from "@/features/tesouraria/hooks/usePixTransacoesSelecao";
import type { PixTransacao } from "@/features/tesouraria/types/pixTransacoes";

function criarTransacao(
  id: string,
  overrides: Partial<PixTransacao> = {},
): PixTransacao {
  return {
    id,
    metodo: "PIX",
    statusPagamento: "PAID",
    valorBruto: 20,
    valorPago: 20,
    moeda: "BRL",
    dataCriacao: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("Hook: usePixTransacoesSelecao", () => {
  const txPendente1 = criarTransacao("tx-1", { statusPagamento: "PAID" });
  const txPendente2 = criarTransacao("tx-2", {
    statusPagamento: "IN_ANALYSIS",
    origem: "COMPROVANTE",
  });
  const txAceita = criarTransacao("tx-3", {
    statusPagamento: "PAID",
    statusValidacao: "aceita",
  });
  const txAguardando = criarTransacao("tx-4", {
    statusPagamento: "WAITING",
  });

  it("Deve calcular contagens corretas e gerenciar seleção individual e em página", () => {
    const todas = [txPendente1, txPendente2, txAceita, txAguardando];
    const filtradas = [txPendente1, txPendente2];

    const { result } = renderHook(() =>
      usePixTransacoesSelecao({
        transacoes: filtradas,
        todasTransacoes: todas,
      }),
    );

    expect(result.current.contagens).toEqual({
      novas: 2,
      aprovadas: 1,
      recusadas: 0,
      aguardando_pagamento: 2,
      todas: 4,
    });

    act(() => {
      result.current.handleToggleSelecao("tx-1");
    });
    expect(result.current.selecionadosIds.has("tx-1")).toBe(true);
    expect(result.current.transacoesSelecionadas).toHaveLength(1);

    act(() => {
      result.current.handleToggleTodas(["tx-1", "tx-2"]);
    });
    expect(result.current.selecionadosIds.size).toBe(2);

    act(() => {
      result.current.handleToggleTodas(["tx-1", "tx-2"]);
    });
    expect(result.current.selecionadosIds.size).toBe(0);
  });

  it("Deve remover IDs que deixam de ser elegíveis e gerar feedback ao concluir lote", () => {
    const { result, rerender } = renderHook(
      ({ transacoes }) => usePixTransacoesSelecao({ transacoes }),
      { initialProps: { transacoes: [txPendente1, txPendente2] } },
    );

    act(() => {
      result.current.handleToggleTodas(["tx-1", "tx-2"]);
    });
    expect(result.current.selecionadosIds.size).toBe(2);

    rerender({
      transacoes: [
        criarTransacao("tx-1", { statusValidacao: "aceita" }),
        txPendente2,
      ],
    });
    expect(result.current.selecionadosIds.has("tx-1")).toBe(false);
    expect(result.current.selecionadosIds.has("tx-2")).toBe(true);

    act(() => {
      result.current.handleConcluidoLote({
        sucesso: true,
        processadas: 1,
        ignoradas: 0,
        erros: [],
      });
    });
    expect(result.current.feedbackLote).toEqual({
      tipo: "success",
      mensagem: "1 transação validada com sucesso.",
    });

    act(() => {
      result.current.handleConcluidoLote({
        sucesso: false,
        processadas: 2,
        ignoradas: 0,
        erros: [{ id: "tx-x", erro: "Falhou" }],
      });
    });
    expect(result.current.feedbackLote).toEqual({
      tipo: "warning",
      mensagem: "2 processada(s), 1 com erro.",
    });

    act(() => {
      result.current.fecharFeedbackLote();
    });
    expect(result.current.feedbackLote).toBeNull();
  });
});
