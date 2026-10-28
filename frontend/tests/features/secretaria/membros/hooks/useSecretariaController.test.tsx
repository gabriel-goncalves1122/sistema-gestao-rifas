import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/features/secretaria/membros/services/secretariaService", () => ({
  secretariaService: {
    buscarAderidos: vi.fn(),
    adicionarAderidoIndividual: vi.fn(),
    atualizarAderidoSecretaria: vi.fn(),
  },
}));

import { useSecretariaController } from "@/features/secretaria/membros/hooks/useSecretariaController";
import { secretariaService } from "@/features/secretaria/membros/services/secretariaService";

const mockAderidos = [
  { id: "1", email: "teste@teste.com", cargo: "aderido", status_cadastro: "ativo" as const },
  { id: "2", email: "outro@teste.com", cargo: "admin", status_cadastro: "ativo" as const },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useSecretariaController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Deve iniciar com estado vazio", () => {
    const { result } = renderHook(() => useSecretariaController(), {
      wrapper: createWrapper(),
    });

    expect(result.current.aderidos).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.notificacao.open).toBe(false);
  });

  it("Deve carregar aderidos", async () => {
    (secretariaService.buscarAderidos as any).mockResolvedValue(mockAderidos);

    const { result } = renderHook(() => useSecretariaController(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.carregarAderidos();
    });

    expect(result.current.aderidos).toEqual(mockAderidos);
    expect(result.current.loading).toBe(false);
  });

  it("Deve notificar sucesso ao adicionar aderido", async () => {
    (secretariaService.buscarAderidos as any).mockResolvedValue([]);
    (secretariaService.adicionarAderidoIndividual as any).mockResolvedValue({ idAderido: "3" });

    const { result } = renderHook(() => useSecretariaController(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.adicionarAderidoIndividual({
        email: "novo@teste.com",
        nome: "Novo",
        curso: "",
        telefone: "",
        dataNascimento: "",
        cargo: "aderido",
        modalidade_adesao: "completo",
      });
    });

    expect(result.current.notificacao.open).toBe(true);
    expect(result.current.notificacao.mensagem).toContain("sucesso");
    expect(result.current.notificacao.severidade).toBe("success");
  });

  it("Deve notificar erro ao falhar adicao", async () => {
    (secretariaService.buscarAderidos as any).mockResolvedValue([]);
    (secretariaService.adicionarAderidoIndividual as any).mockRejectedValue(new Error("Falha na API"));

    const { result } = renderHook(() => useSecretariaController(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.adicionarAderidoIndividual({
          email: "erro@teste.com",
          nome: "",
          curso: "",
          telefone: "",
          dataNascimento: "",
          cargo: "aderido",
          modalidade_adesao: "completo",
        });
      } catch {
        // esperado
      }
    });

    expect(result.current.notificacao.open).toBe(true);
    expect(result.current.notificacao.severidade).toBe("error");
  });

  it("Deve fechar notificacao", () => {
    const { result } = renderHook(() => useSecretariaController(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mostrarNotificacao("teste", "info");
    });

    expect(result.current.notificacao.open).toBe(true);

    act(() => {
      result.current.fecharNotificacao();
    });

    expect(result.current.notificacao.open).toBe(false);
  });
});
