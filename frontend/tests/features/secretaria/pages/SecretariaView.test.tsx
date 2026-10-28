import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const secretariaMocks = vi.hoisted(() => {
  const aderidos = [
    {
      id: "1",
      nome: "Aderido User",
      email: "aderido@teste.com",
      cargo: "aderido",
      status_cadastro: "ativo" as const,
      modalidade_adesao: "completo" as const,
    },
    {
      id: "2",
      nome: "Admin User",
      email: "admin@teste.com",
      cargo: "secretaria",
      status_cadastro: "ativo" as const,
      modalidade_adesao: "completo" as const,
    },
  ];

  return {
    aderidos,
    controllerReturn: {
      aderidos,
      loading: false,
      notificacao: { open: false, mensagem: "", severidade: "success" as const },
      busca: "",
      aderidoSelecionado: null,
      modalAberto: false,
      selectedIds: new Set<string>(),
      setBusca: vi.fn(),
      setAderidoSelecionado: vi.fn(),
      setModalAberto: vi.fn(),
      toggleSelectId: vi.fn(),
      toggleSelectAll: vi.fn(),
      limparSelecao: vi.fn(),
      carregarAderidos: vi.fn().mockResolvedValue(aderidos),
      adicionarAderidoIndividual: vi.fn(),
      atualizarAderidoSecretaria: vi.fn(),
      fecharNotificacao: vi.fn(),
    },
    sortReturn: {
      sorted: aderidos,
      sortBy: null,
      sortDir: "asc" as const,
      toggleSort: vi.fn(),
    },
  };
});

vi.mock("@/features/premios/hooks/usePremiosLayout", () => ({
  usePremiosLayout: vi.fn(() => ({ isMobile: false, isDesktop: true })),
}));

vi.mock("@/features/secretaria/membros/hooks/useSecretariaController", () => ({
  useSecretariaController: vi.fn(() => secretariaMocks.controllerReturn),
}));

vi.mock("@/features/secretaria/membros/hooks/useSecretariaSort", () => ({
  useSecretariaSort: vi.fn(() => secretariaMocks.sortReturn),
}));

vi.mock("@/features/secretaria/membros/hooks/useSecretariaKeyboard", () => ({
  useSecretariaKeyboard: vi.fn(),
}));

vi.mock("@/features/secretaria/documentos/services/documentosSecretariaService", () => ({
  documentosSecretariaService: {
    listarDocumentos: vi.fn().mockResolvedValue([]),
    criarDocumento: vi.fn(),
    atualizarDocumento: vi.fn(),
    baixarConteudo: vi.fn(),
  },
}));

import { SecretariaView } from "@/features/secretaria";
import { MembrosSecretariaView } from "@/features/secretaria/membros/MembrosSecretariaView";

vi.mock("@/shared/hooks/useDebounce", () => ({
  useDebounce: vi.fn((val) => val),
}));

describe("Página <SecretariaView />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Deve renderizar o header e os cards de resumo", () => {
    render(<MembrosSecretariaView />);

    expect(screen.getByText("Secretaria")).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Resumo Total" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Resumo Aderidos" })).toBeInTheDocument();
  });

  it("Deve renderizar a view desktop sem duplicar as tabs do Dashboard", () => {
    render(<MembrosSecretariaView />);

    expect(
      screen.queryByRole("tablist", { name: "Áreas da secretaria" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Resultados (1)")).toBeInTheDocument();
  });

  it("Deve delegar a aba ativa para a subfeature correta", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <SecretariaView abaAtual={0} />
      </QueryClientProvider>
    );

    expect(screen.getByRole("heading", { name: "Secretaria" })).toBeInTheDocument();

    rerender(
      <QueryClientProvider client={queryClient}>
        <SecretariaView abaAtual={1} />
      </QueryClientProvider>
    );

    expect(
      await screen.findByText("Atas, contratos e arquivos organizados por área."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Secretaria" })).not.toBeInTheDocument();
  });

  it("Deve iniciar na aba Aderidos e alternar para Comissão", async () => {
    render(<MembrosSecretariaView />);

    const abasTipoUsuario = screen.getByRole("tablist", {
      name: "Seções da secretaria",
    });

    expect(within(abasTipoUsuario).getByRole("tab", { name: "Aderidos" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Aderido User")).toBeInTheDocument();
    expect(screen.queryByText("Admin User")).not.toBeInTheDocument();

    await userEvent.click(within(abasTipoUsuario).getByRole("tab", { name: "Comissão" }));

    expect(within(abasTipoUsuario).getByRole("tab", { name: "Comissão" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.queryByText("Aderido User")).not.toBeInTheDocument();
  });

  it("Deve posicionar as abas abaixo dos cards de resumo", () => {
    render(<MembrosSecretariaView />);

    const resumoComissao = screen.getByRole("article", { name: "Resumo Comissão" });
    const abasTipoUsuario = screen.getByRole("tablist", {
      name: "Seções da secretaria",
    });
    const tabAderidos = within(abasTipoUsuario).getByRole("tab", { name: "Aderidos" });

    expect(
      resumoComissao.compareDocumentPosition(tabAderidos) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("Deve mostrar somente pesquisa como filtro visual", () => {
    render(<MembrosSecretariaView />);

    expect(screen.getByPlaceholderText(/Pesquisar por nome ou e-mail/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Filtrar por modalidade")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Filtrar por status")).not.toBeInTheDocument();
  });

  it("Deve renderizar com notificacao fechada", () => {
    render(<MembrosSecretariaView />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
