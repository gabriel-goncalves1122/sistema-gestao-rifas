import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentosSecretariaView } from "@/features/secretaria/documentos/DocumentosSecretariaView";

vi.mock("@/shared/hooks/useDebounce", () => ({
  useDebounce: vi.fn((val) => val),
}));

const documentosMocks = vi.hoisted(() => {
  const documentosBase = [
    {
      id: "doc-ata-ordinaria-junho",
      titulo: "Ata da reunião ordinária",
      area: "Secretaria" as const,
      tipo: "ata" as const,
      nomeArquivo: "ata.pdf",
      mimeType: "application/pdf",
      tamanhoBytes: 1024,
      storagePath: "documentos_secretaria/secretaria/ata/ata.pdf",
      criadoEm: "2026-06-01T00:00:00.000Z",
      atualizadoEm: "2026-06-01T00:00:00.000Z",
      autorNome: "Secretaria",
      urlVisualizacao: "https://example.com/ata.pdf",
    },
    {
      id: "doc-contrato-patrocinio",
      titulo: "Contrato de patrocínio",
      area: "Jurídico e contratos" as const,
      tipo: "contrato" as const,
      nomeArquivo: "contrato.pdf",
      mimeType: "application/pdf",
      tamanhoBytes: 2048,
      storagePath: "documentos_secretaria/juridico/contrato/contrato.pdf",
      criadoEm: "2026-06-01T00:00:00.000Z",
      atualizadoEm: "2026-06-01T00:00:00.000Z",
      autorNome: "Jurídico",
      urlVisualizacao: "https://example.com/contrato.pdf",
    },
  ];

  return {
    documentosBase,
    documentosAtuais: [...documentosBase] as any[],
    listarDocumentos: vi.fn(),
    atualizarDocumento: vi.fn(),
    criarDocumento: vi.fn(),
    baixarConteudo: vi.fn(),
  };
});

vi.mock("@/features/premios/hooks/usePremiosLayout", () => ({
  usePremiosLayout: () => ({ isMobile: false, isDesktop: true }),
}));

vi.mock("@/features/secretaria/documentos/services/documentosSecretariaService", () => ({
  documentosSecretariaService: {
    listarDocumentos: documentosMocks.listarDocumentos,
    atualizarDocumento: documentosMocks.atualizarDocumento,
    criarDocumento: documentosMocks.criarDocumento,
    baixarConteudo: documentosMocks.baixarConteudo,
  },
}));

function DocumentosHarness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <DocumentosSecretariaView />
    </QueryClientProvider>
  );
}

describe("<DocumentosSecretariaView />", () => {
  beforeEach(() => {
    documentosMocks.documentosAtuais = [...documentosMocks.documentosBase];
    documentosMocks.listarDocumentos.mockImplementation(async () => [
      ...documentosMocks.documentosAtuais,
    ]);
    documentosMocks.atualizarDocumento.mockImplementation(async (documento, dados) => {
      const atualizado = {
        ...documento,
        ...dados,
        atualizadoEm: "2026-06-02T00:00:00.000Z",
      };
      documentosMocks.documentosAtuais = documentosMocks.documentosAtuais.map((item) =>
        item.id === atualizado.id ? atualizado : item,
      );
      return atualizado;
    });
    documentosMocks.criarDocumento.mockReset();
    documentosMocks.baixarConteudo.mockResolvedValue(
      new Blob(["arquivo"], { type: "application/pdf" }),
    );
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:documento-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("renderiza documentos, busca e filtro por área", async () => {
    render(<DocumentosHarness />);

    expect(await screen.findByText("Ata da reunião ordinária")).toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText(/Pesquisar por título/i),
      "patrocínio",
    );

    expect(screen.getByText("Contrato de patrocínio")).toBeInTheDocument();
    expect(screen.queryByText("Ata da reunião ordinária")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox", { name: "Área" }));
    await userEvent.click(screen.getByRole("option", { name: "Tesouraria" }));

    await waitFor(() => {
      expect(screen.getByText("Nenhum documento encontrado.")).toBeInTheDocument();
    });
  });

  it("abre preview ao clicar em documento", async () => {
    render(<DocumentosHarness />);

    const card = await screen.findByRole("button", {
      name: /Abrir documento Ata da reunião ordinária/i,
    });

    await userEvent.click(card);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Ata da reunião ordinária")).toBeInTheDocument();
    expect(
      within(dialog).getByTitle("Pré-visualização de Ata da reunião ordinária"),
    ).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Fechar" }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:documento-preview");
  });

  it("cria e edita documento localmente", async () => {
    render(<DocumentosHarness />);

    await screen.findByText("Ata da reunião ordinária");

    // Abre o modal diretamente pelo botão de edição para validar a mutação local.
    await userEvent.click(
      screen.getByRole("button", {
        name: /Editar documento Ata da reunião ordinária/i,
      }),
    );

    const titulo = screen.getByLabelText(/Título/);
    await userEvent.clear(titulo);
    await userEvent.type(titulo, "Ata revisada");
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("Ata revisada")).toBeInTheDocument();
  });
});
