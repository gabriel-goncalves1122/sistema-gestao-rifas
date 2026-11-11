// ============================================================================
// ARQUIVO: frontend/tests/app/routes.test.tsx
// ============================================================================
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockObterStatusManutencao } = vi.hoisted(() => ({
  mockObterStatusManutencao: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback?.(null);
    return vi.fn();
  }),
}));

vi.mock("@/shared/config/firebase", () => ({
  auth: {
    signOut: vi.fn(),
  },
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn().mockReturnValue({}),
  onSnapshot: vi.fn().mockReturnValue(() => {}),
}));

vi.mock("@/shared/services/sistemaService", () => ({
  sistemaService: {
    obterStatusManutencao: mockObterStatusManutencao,
  },
}));

vi.mock("@/features/auth/pages/LoginPage", () => ({
  LoginPage: () => <div>Pagina de Login</div>,
}));

vi.mock("@/features/auth/pages/RegisterPage", () => ({
  RegisterPage: () => <div>Pagina de Registro</div>,
}));

vi.mock("@/views/pages/DashboardPage", () => ({
  DashboardPage: () => <div>Dashboard</div>,
}));

import { AppRoutes } from "@/app/routes";

describe("Rotas da aplicação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Deve renderizar LoginPage em /login quando sistema estiver normal", async () => {
    mockObterStatusManutencao.mockResolvedValueOnce({
      emManutencao: false,
      mensagem: "Normal",
      previsaoRetorno: null,
      atualizadoEm: null,
      atualizadoPor: null,
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Pagina de Login")).toBeInTheDocument();
    });
  });

  it("Deve renderizar PaginaManutencao quando em manutenção ativa para usuário deslogado", async () => {
    mockObterStatusManutencao.mockResolvedValueOnce({
      emManutencao: true,
      mensagem: "Estamos em manutenção programada",
      previsaoRetorno: "22h00",
      atualizadoEm: null,
      atualizadoPor: null,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Manutenção Programada")).toBeInTheDocument();
      expect(
        screen.getByText("Estamos em manutenção programada"),
      ).toBeInTheDocument();
    });
  });

  it("Deve permitir acesso a LoginPage mesmo em manutenção se query ?admin=1 estiver presente", async () => {
    mockObterStatusManutencao.mockResolvedValueOnce({
      emManutencao: true,
      mensagem: "Estamos em manutenção programada",
      previsaoRetorno: null,
      atualizadoEm: null,
      atualizadoPor: null,
    });

    render(
      <MemoryRouter initialEntries={["/login?admin=1"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Pagina de Login")).toBeInTheDocument();
    });
  });
});
