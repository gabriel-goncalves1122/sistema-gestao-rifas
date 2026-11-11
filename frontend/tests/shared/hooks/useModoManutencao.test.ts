import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  obterStatusManutencao: vi.fn(),
  atualizarStatusManutencao: vi.fn(),
  onSnapshot: vi.fn().mockReturnValue(() => {}),
  doc: vi.fn().mockReturnValue({}),
}));

vi.mock("@/shared/services/sistemaService", () => ({
  sistemaService: {
    obterStatusManutencao: mocks.obterStatusManutencao,
    atualizarStatusManutencao: mocks.atualizarStatusManutencao,
  },
}));

vi.mock("firebase/firestore", () => ({
  doc: mocks.doc,
  onSnapshot: mocks.onSnapshot,
}));

vi.mock("@/shared/config/firebase", () => ({
  db: {},
}));

import { useModoManutencao } from "@/shared/hooks/useModoManutencao";

describe("useModoManutencao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.obterStatusManutencao.mockResolvedValue({
      emManutencao: false,
      mensagem: "Sistema operacional",
      previsaoRetorno: null,
      atualizadoEm: null,
      atualizadoPor: null,
    });
  });

  it("deve carregar o status inicial a partir do serviço", async () => {
    const { result } = renderHook(() => useModoManutencao(null));

    expect(result.current.carregandoManutencao).toBe(true);

    await waitFor(() => {
      expect(result.current.carregandoManutencao).toBe(false);
    });

    expect(result.current.emManutencao).toBe(false);
    expect(result.current.statusManutencao?.mensagem).toBe("Sistema operacional");
    expect(result.current.isAdminBypass).toBe(false);
  });

  it("deve identificar isAdminBypass para usuários com cargo de admin ou presidencia", async () => {
    const usuarioAderido = { uid: "1", cargo: "aderido" } as any;
    const { result: resAderido } = renderHook(() =>
      useModoManutencao(usuarioAderido),
    );
    expect(resAderido.current.isAdminBypass).toBe(false);

    const usuarioAdmin = { uid: "2", cargo: "admin" } as any;
    const { result: resAdmin } = renderHook(() =>
      useModoManutencao(usuarioAdmin),
    );
    expect(resAdmin.current.isAdminBypass).toBe(true);

    const usuarioPresidencia = { uid: "3", cargo: "presidencia" } as any;
    const { result: resPresidencia } = renderHook(() =>
      useModoManutencao(usuarioPresidencia),
    );
    expect(resPresidencia.current.isAdminBypass).toBe(true);
  });

  it("deve chamar atualizarStatusManutencao e atualizar o estado local", async () => {
    mocks.atualizarStatusManutencao.mockResolvedValueOnce({
      emManutencao: true,
      mensagem: "Nova manutenção",
      previsaoRetorno: "10 min",
      atualizadoEm: null,
      atualizadoPor: "admin@unifei.edu.br",
    });

    const { result } = renderHook(() => useModoManutencao(null));

    await waitFor(() => {
      expect(result.current.carregandoManutencao).toBe(false);
    });

    await act(async () => {
      await result.current.atualizarManutencao({
        emManutencao: true,
        mensagem: "Nova manutenção",
      });
    });

    expect(mocks.atualizarStatusManutencao).toHaveBeenCalledWith({
      emManutencao: true,
      mensagem: "Nova manutenção",
    });
    expect(result.current.emManutencao).toBe(true);
    expect(result.current.statusManutencao?.mensagem).toBe("Nova manutenção");
  });
});
