import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ModalDetalhesAderido } from "@/features/secretaria/membros/components/shared/ModalDetalhesAderido";
import type { AderidoSecretaria } from "@/shared/types/secretaria";

const aderido: AderidoSecretaria = {
  id: "ADERIDO_001",
  id_aderido: "ADERIDO_001",
  nome: "Gabriel Sampaio",
  email: "gabriel@teste.com",
  telefone: "35999999999",
  cpf: "12345678900",
  curso: "ENGENHARIA DA COMPUTAÇÃO",
  cargo: "admin",
  status_cadastro: "ativo",
  modalidade_adesao: "completo",
  rifas_vendidas: 10,
  total_arrecadado: 250,
  faixa_rifas: {
    inicio: "0001",
    fim: "0120",
  },
};

describe("Componente <ModalDetalhesAderido />", () => {
  const mockOnSalvar = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSalvar.mockResolvedValue(undefined);
  });

  it("Deve exibir os dados principais do aderido", () => {
    render(
      <ModalDetalhesAderido
        open={true}
        aderido={aderido}
        onClose={mockOnClose}
        onSalvar={mockOnSalvar}
      />,
    );

    const modal = screen.getByRole("dialog", { name: /Dados do Aderido/i });

    expect(within(modal).getAllByText("Gabriel Sampaio").length).toBeGreaterThan(0);
    expect(within(modal).getAllByText("gabriel@teste.com").length).toBeGreaterThan(0);

    const informacoes = within(modal).getByTestId("informacoes-aderido-card");

    expect(within(informacoes).getByText("Contato")).toBeInTheDocument();
    expect(within(informacoes).getByText("Dados pessoais")).toBeInTheDocument();
    expect(within(informacoes).getByText("Vínculo")).toBeInTheDocument();
    expect(within(informacoes).getByText("123.456.789-00")).toBeInTheDocument();
    expect(within(informacoes).getByText("(35) 99999-9999")).toBeInTheDocument();
  });

  it("Deve exibir nomes longos sem juntar nome e e-mail na mesma linha", () => {
    render(
      <ModalDetalhesAderido
        open={true}
        aderido={{
          ...aderido,
          nome: "Gabriel Sampaio de Almeida Pereira dos Santos",
        }}
        onClose={mockOnClose}
        onSalvar={mockOnSalvar}
      />,
    );

    expect(
      screen.getAllByText("Gabriel Sampaio de Almeida Pereira dos Santos").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("gabriel@teste.com").length).toBeGreaterThan(0);
  });

  it("Deve entrar em modo edição ao clicar em Editar Dados", () => {
    render(
      <ModalDetalhesAderido
        open={true}
        aderido={aderido}
        onClose={mockOnClose}
        onSalvar={mockOnSalvar}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Editar Dados/i }));

    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar dados/i })).toBeInTheDocument();
  });

  it("Deve mostrar apenas Cancelar e Salvar dados durante edição", () => {
    render(
      <ModalDetalhesAderido
        open={true}
        aderido={aderido}
        onClose={mockOnClose}
        onSalvar={mockOnSalvar}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Editar Dados/i }));

    expect(screen.queryByRole("button", { name: /Fechar/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar dados/i })).toBeInTheDocument();
    expect(screen.getByText("Status: Ativo")).toBeInTheDocument();
    expect(screen.getByText("Modalidade: Aderido completo")).toBeInTheDocument();
  });

  it("Deve formatar CPF e telefone durante a edição", () => {
    render(
      <ModalDetalhesAderido
        open={true}
        aderido={{ ...aderido, cpf: "", telefone: "" }}
        onClose={mockOnClose}
        onSalvar={mockOnSalvar}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Editar Dados/i }));

    const cpfInput = screen.getByLabelText("CPF");
    const telefoneInput = screen.getByLabelText("Telefone");

    fireEvent.change(cpfInput, { target: { value: "39977937869" } });
    fireEvent.change(telefoneInput, { target: { value: "19997115858" } });

    expect(cpfInput).toHaveValue("399.779.378-69");
    expect(telefoneInput).toHaveValue("(19) 99711-5858");
  });

  it("Deve normalizar o nome antes de salvar", async () => {
    render(
      <ModalDetalhesAderido
        open={true}
        aderido={{ ...aderido, nome: "gABRIEL sAMPAIO" }}
        onClose={mockOnClose}
        onSalvar={mockOnSalvar}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Editar Dados/i }));
    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "  gABRIEL   da SILVA  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /Salvar dados/i }));

    await waitFor(() => {
      expect(mockOnSalvar).toHaveBeenCalledWith(
        "ADERIDO_001",
        expect.objectContaining({ nome: "Gabriel da Silva" }),
      );
    });
  });

  it("Deve fechar o modal ao clicar em Fechar", () => {
    render(
      <ModalDetalhesAderido
        open={true}
        aderido={aderido}
        onClose={mockOnClose}
        onSalvar={mockOnSalvar}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Fechar/i }));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
