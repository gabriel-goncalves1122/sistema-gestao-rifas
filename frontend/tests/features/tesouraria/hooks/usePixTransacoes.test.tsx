import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { usePixTransacoes } from "@/features/tesouraria/hooks/usePixTransacoes";
import { pixTransacoesService } from "@/features/tesouraria/services/pixTransacoesService";
import {
  PixTransacoesResumo,
  PixTransacao,
} from "@/features/tesouraria/types/pixTransacoes";
import { RESUMO_PIX_TRANSACOES_VAZIO } from "@/features/tesouraria/utils/pixTransacoesUtils";

vi.mock("@/features/tesouraria/services/pixTransacoesService", () => ({
  pixTransacoesService: {
    buscarTransacoes: vi.fn(),
    buscarResumo: vi.fn(),
    sincronizarBanco: vi.fn(),
    aceitarTransacao: vi.fn(),
    negarTransacao: vi.fn(),
  },
}));

function criarTransacao(
  parcial: Partial<PixTransacao>,
): PixTransacao {
  return {
    id: parcial.id || "tx_teste",
    referenceId: parcial.referenceId || "ref_teste",
    metodo: "PIX",
    statusPagamento: parcial.statusPagamento || "PAID",
    statusConciliacao: parcial.statusConciliacao || "conciliada",
    valorBruto: parcial.valorBruto ?? 10,
    valorPago: parcial.valorPago ?? 10,
    moeda: "BRL",
    dataCriacao: parcial.dataCriacao || "2026-10-01T10:00:00.000-03:00",
    ...parcial,
  };
}

const resumoApi: PixTransacoesResumo = {
  totalRecebido: 99,
  totalPendente: 10,
  totalCancelado: 0,
  totalDivergente: 0,
  quantidadePagas: 3,
  quantidadeAguardando: 1,
  quantidadeCanceladas: 0,
  quantidadeNaoIdentificadas: 0,
  quantidadeAguardandoValidacao: 1,
  quantidadeAceitas: 0,
  quantidadeNegadas: 0,
  quantidadeSemConfirmacaoBancaria: 0,
  quantidadeComRifas: 0,
  quantidadeSemVinculo: 1,
  ticketMedio: 33,
};

describe("Hook: usePixTransacoes", () => {
  const criarWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(pixTransacoesService.buscarTransacoes).mockResolvedValue([]);
    vi.mocked(pixTransacoesService.buscarResumo).mockResolvedValue(
      RESUMO_PIX_TRANSACOES_VAZIO,
    );
    vi.mocked(pixTransacoesService.sincronizarBanco).mockResolvedValue({
      sucesso: true,
    });
    vi.mocked(pixTransacoesService.aceitarTransacao).mockResolvedValue({
      sucesso: true,
    });
    vi.mocked(pixTransacoesService.negarTransacao).mockResolvedValue({
      sucesso: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("Deve carregar transações e resumo reais quando a API responder", async () => {
    const transacoes = [criarTransacao({ id: "tx_real", valorPago: 45 })];
    vi.mocked(pixTransacoesService.buscarTransacoes).mockResolvedValueOnce(
      transacoes,
    );
    vi.mocked(pixTransacoesService.buscarResumo).mockResolvedValueOnce(
      resumoApi,
    );

    const { result } = renderHook(() => usePixTransacoes(), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    expect(result.current.transacoes).toEqual(transacoes);
    expect(result.current.resumo).toEqual(resumoApi);
  });

  it("Deve calcular resumo local quando o resumo da API falhar", async () => {
    const transacoes = [
      criarTransacao({ id: "tx_paga", valorPago: 50, valorBruto: 50 }),
      criarTransacao({
        id: "tx_pendente",
        statusPagamento: "WAITING",
        valorBruto: 40,
        valorPago: 0,
      }),
    ];

    vi.mocked(pixTransacoesService.buscarTransacoes).mockResolvedValueOnce(
      transacoes,
    );
    vi.mocked(pixTransacoesService.buscarResumo).mockRejectedValueOnce(
      new Error("Resumo indisponível"),
    );

    const { result } = renderHook(() => usePixTransacoes(), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    expect(result.current.transacoes).toEqual(transacoes);
    expect(result.current.resumo.totalRecebido).toBe(49.5);
    expect(result.current.resumo.totalPendente).toBe(40);
    expect(result.current.resumo.quantidadePagas).toBe(1);
    expect(result.current.resumo.quantidadeAguardando).toBe(1);
  });

  it("Deve calcular resumo local quando a API retornar resumo vazio", async () => {
    const transacoes = [
      criarTransacao({ id: "tx_paga", valorPago: 25, valorBruto: 25 }),
    ];

    vi.mocked(pixTransacoesService.buscarTransacoes).mockResolvedValueOnce(
      transacoes,
    );
    vi.mocked(pixTransacoesService.buscarResumo).mockResolvedValueOnce(
      RESUMO_PIX_TRANSACOES_VAZIO,
    );

    const { result } = renderHook(() => usePixTransacoes(), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    expect(result.current.resumo.totalRecebido).toBe(24.75);
    expect(result.current.resumo.ticketMedio).toBe(24.75);
  });

  it("Não deve usar mock local em DEV quando transações reais não existirem", async () => {
    vi.stubEnv("DEV", true);
    vi.mocked(pixTransacoesService.buscarTransacoes).mockResolvedValueOnce(
      [],
    );
    vi.mocked(pixTransacoesService.buscarResumo).mockResolvedValueOnce(
      resumoApi,
    );

    const { result } = renderHook(() => usePixTransacoes(), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    expect(result.current.transacoes).toEqual([]);
    expect(result.current.resumo.totalRecebido).toBe(resumoApi.totalRecebido);
    expect(result.current.resumo.ticketMedio).toBe(resumoApi.ticketMedio);
  });

  it("Deve filtrar transações usando CPF, documento do comprador e rifas", async () => {
    const transacoes = [
      criarTransacao({
        id: "tx_cpf",
        referenceId: "ref_cpf",
        aderido: { nome: "Ana Costa", cpf: "11122233344" },
        compradorDocumento: "00000000000",
        rifas: [{ numero: "010" }],
      }),
      criarTransacao({
        id: "tx_rifa",
        referenceId: "ref_rifa",
        aderido: { nome: "Bruno Lima", cpf: "55566677788" },
        compradorDocumento: "12345678900",
        rifas: [{ numero: "099" }],
      }),
    ];

    vi.mocked(pixTransacoesService.buscarTransacoes).mockResolvedValueOnce(
      transacoes,
    );
    vi.mocked(pixTransacoesService.buscarResumo).mockResolvedValueOnce(
      resumoApi,
    );

    const { result } = renderHook(() => usePixTransacoes(), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    act(() => {
      result.current.setFiltros({ status: "todas", busca: "111.222.333-44" });
    });

    expect(result.current.transacoesFiltradas).toEqual([transacoes[0]]);

    act(() => {
      result.current.setFiltros({ status: "todas", busca: "12345678900" });
    });

    expect(result.current.transacoesFiltradas).toEqual([transacoes[1]]);

    act(() => {
      result.current.setFiltros({ status: "todas", busca: "099" });
    });

    expect(result.current.transacoesFiltradas).toEqual([transacoes[1]]);
  });

  it("Deve tratar falhas (catch) na busca de transações", async () => {
    // Simula falha ao buscar transações
    vi.mocked(pixTransacoesService.buscarTransacoes).mockRejectedValueOnce(
      new Error("Erro de rede")
    );

    const { result } = renderHook(() => usePixTransacoes(), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    // O hook deve lidar com o catch silenciosamente e manter o array vazio
    expect(result.current.transacoes).toEqual([]);
    expect(result.current.transacoesFiltradas).toEqual([]);
    // O resumo vazio ou local
    expect(result.current.resumo.totalRecebido).toBe(0);
  });
});
