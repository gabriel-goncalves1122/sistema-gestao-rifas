import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { useAuditoriaComprasController } from "@/features/tesouraria/hooks/useAuditoriaComprasController";
import { auditoriaComprasService } from "@/features/tesouraria/services/auditoriaComprasService";

vi.mock("@/shared/hooks/useDebounce", () => ({
  useDebounce: vi.fn((val) => val),
}));

vi.mock("@/features/tesouraria/services/auditoriaComprasService", () => ({
  auditoriaComprasService: {
    buscarHistoricoDetalhado: vi.fn(),
    reenviarEmailComprovante: vi.fn(),
  },
}));

function criarWrapper() {
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
}

const historicoMock = [
  {
    id: "comprador_maria",
    vendedorId: "aderido_ana",
    vendedorNome: "Ana Vendedora",
    vendedorCpf: "11122233344",
    compradorId: "comprador_maria",
    compradorNome: "Maria Souza",
    compradorEmail: "maria@teste.com",
    compradorTelefone: "35999990000",
    dataReserva: "2026-05-01T10:00:00.000-03:00",
    dataPagamento: "2026-05-02T10:00:00.000-03:00",
    status: "pago",
    comprovanteUrl: "https://storage.mock/comprovante-maria.png",
    bilhetes: ["001", "002"],
    valorTotal: 20,
  },
  {
    id: "comprador_joao",
    vendedorId: "aderido_bruno",
    vendedorNome: "Bruno Vendedor",
    vendedorCpf: "55566677788",
    compradorId: "comprador_joao",
    compradorNome: "João Lima",
    compradorEmail: "joao@teste.com",
    compradorTelefone: "35988887777",
    dataReserva: "2026-05-10T10:00:00.000-03:00",
    dataPagamento: "-",
    status: "pendente",
    comprovanteUrl: null,
    bilhetes: ["003"],
    valorTotal: 10,
  },
];

describe("Hook-controller: useAuditoriaComprasController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(
      auditoriaComprasService.buscarHistoricoDetalhado,
    ).mockResolvedValue(historicoMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Deve carregar histórico e montar compras agrupadas e resumo", async () => {
    const { result } = renderHook(() => useAuditoriaComprasController(), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    expect(
      auditoriaComprasService.buscarHistoricoDetalhado,
    ).toHaveBeenCalledTimes(1);
    expect(result.current.comprasFiltradas).toHaveLength(2);
    expect(result.current.resumo.totalCompras).toBe(2);
    expect(result.current.resumo.totalRifas).toBe(3);
    expect(result.current.resumo.valorTotal).toBe(30);
  });

  it("Deve aplicar filtros e limpar o estado de filtros", async () => {
    const { result } = renderHook(() => useAuditoriaComprasController(), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    act(() => {
      result.current.setFiltros({
        ...result.current.filtros,
        busca: "003",
      });
    });

    expect(result.current.filtrosAtivos).toBe(true);
    expect(result.current.comprasFiltradas).toHaveLength(1);
    expect(result.current.comprasFiltradas[0].compradorNome).toBe("João Lima");

    act(() => {
      result.current.limparFiltros();
    });

    expect(result.current.filtrosAtivos).toBe(false);
    expect(result.current.comprasFiltradas).toHaveLength(2);
  });

  it("Deve controlar detalhes, edição e comprovante selecionado", async () => {
    const { result } = renderHook(() => useAuditoriaComprasController(), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    const compraComComprovante = result.current.comprasFiltradas.find(
      (compra) => Boolean(compra.comprovanteUrl),
    );

    expect(compraComComprovante).toBeDefined();

    act(() => {
      result.current.abrirDetalhes(compraComComprovante!);
      result.current.abrirEdicao(compraComComprovante!);
      result.current.abrirComprovante(compraComComprovante!);
    });

    expect(result.current.compraSelecionada).toBe(compraComComprovante);
    expect(result.current.compraEdicao).toBe(compraComComprovante);
    expect(result.current.comprovanteUrl).toBe(
      "https://storage.mock/comprovante-maria.png",
    );

    act(() => {
      result.current.fecharDetalhes();
      result.current.fecharEdicao();
      result.current.fecharComprovante();
    });

    expect(result.current.compraSelecionada).toBeNull();
    expect(result.current.compraEdicao).toBeNull();
    expect(result.current.comprovanteUrl).toBeNull();
  });

  it("Deve exportar CSV quando houver resultado filtrado", async () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:auditoria");
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    const { result } = renderHook(() => useAuditoriaComprasController(), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    act(() => {
      result.current.baixarCSV();
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("Deve usar estado vazio quando o service falhar", async () => {
    vi.mocked(
      auditoriaComprasService.buscarHistoricoDetalhado,
    ).mockRejectedValueOnce(new Error("Histórico indisponível"));

    const { result } = renderHook(() => useAuditoriaComprasController(), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    expect(result.current.comprasFiltradas).toEqual([]);
    expect(result.current.resumo.totalCompras).toBe(0);
  });

  it("Deve tratar falhas (catch) ao reenviar e-mail do comprovante", async () => {
    vi.mocked(
      auditoriaComprasService.reenviarEmailComprovante,
    ).mockRejectedValueOnce(new Error("Erro SMTP"));

    const { result } = renderHook(() => useAuditoriaComprasController(), {
      wrapper: criarWrapper(),
    });
    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    const compra = historicoMock[0]; // status: pago

    await act(async () => {
      const sucesso = await result.current.reenviarEmailComprovante(compra);
      expect(sucesso).toBe(false);
    });

    expect(result.current.feedbackEmailComprovante).toEqual({
      tipo: "error",
      mensagem: "Erro SMTP",
    });

    act(() => {
      result.current.fecharFeedbackEmailComprovante();
    });

    expect(result.current.feedbackEmailComprovante).toBeNull();
  });
});
