import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePixController } from "@/features/tesouraria/hooks/usePixController";
import { usePixTransacoes } from "@/features/tesouraria/hooks/usePixTransacoes";
import { RESUMO_PIX_TRANSACOES_VAZIO } from "@/features/tesouraria/utils/pixTransacoesUtils";

vi.mock("@/features/tesouraria/hooks/usePixTransacoes", () => ({
  usePixTransacoes: vi.fn(),
}));

vi.mock("@/features/tesouraria/hooks/useRelatorioTesouraria", () => ({
  useRelatorioTesouraria: vi.fn(() => ({
    relatorio: { rankingAderidos: [] },
    carregando: false,
    erro: null,
    recarregar: vi.fn(),
  })),
}));

const setFiltros = vi.fn();
const sincronizarBanco = vi.fn();
const aceitarPixTransacao = vi.fn();
const negarPixTransacao = vi.fn();

describe("Hook-controller: usePixController", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePixTransacoes).mockReturnValue({
      transacoes: [{ id: "tx_001", referenceId: "ref_001" } as any],
      transacoesFiltradas: [{ id: "tx_filtrada", referenceId: "ref_002" } as any],
      resumo: RESUMO_PIX_TRANSACOES_VAZIO,
      filtros: { status: "todas", busca: "" },
      carregando: false,
      sincronizando: false,
      validandoPixPorId: {},
      erroValidacaoPixPorId: {},
      setFiltros,
      carregarDados: vi.fn(),
      sincronizarBanco,
      aceitarTransacao: aceitarPixTransacao,
      negarTransacao: negarPixTransacao,
      limparErroValidacaoPix: vi.fn(),
    });
  });

  it("Deve expor estado e props do contexto Pix/Pix", () => {
    const { result } = renderHook(() =>
      usePixController({ variante: "desktop" }),
    );

    expect(result.current.abaVisivel).toBe("visao-geral");
    expect(result.current.pixProps.transacoes).toEqual([
      { id: "tx_filtrada", referenceId: "ref_002" },
    ]);
    expect(result.current.pixProps.onChangeFiltros).toBe(setFiltros);
    expect(result.current.pixProps.onAceitar).toBe(aceitarPixTransacao);
    expect(result.current.pixProps.onNegar).toBe(negarPixTransacao);

    result.current.onSincronizar();

    expect(sincronizarBanco).toHaveBeenCalledTimes(1);
  });

  it("Deve permitir trocar abas no desktop", () => {
    const { result } = renderHook(() =>
      usePixController({ variante: "desktop" }),
    );

    act(() => {
      result.current.setAbaAtual("conciliacao");
    });

    expect(result.current.abaVisivel).toBe("conciliacao");
  });
});
