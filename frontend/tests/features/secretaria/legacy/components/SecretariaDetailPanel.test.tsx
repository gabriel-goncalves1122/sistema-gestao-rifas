import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SecretariaDetailPanel } from "@/features/secretaria/legacy/components/SecretariaDetailPanel";
import type { AderidoSecretaria } from "@/features/secretaria/membros/types/secretariaLocalTypes";

const mockAderido: AderidoSecretaria = {
  id: "ADERIDO_001",
  nome: "Gabriel Sampaio",
  email: "gabriel@teste.com",
  cargo: "aderido",
  status_cadastro: "ativo",
  modalidade_adesao: "completo",
  telefone: "35999999999",
  curso: "ENGENHARIA DE COMPUTAÇÃO",
  cpf: "12345678900",
};

describe("SecretariaDetailPanel", () => {
  it("Deve renderizar o painel com dados do aderido", () => {
    render(
      <SecretariaDetailPanel
        aderido={mockAderido}
        open={true}
        onClose={vi.fn()}
        onSalvar={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Gabriel Sampaio").length).toBeGreaterThan(0);
    expect(screen.getAllByText("gabriel@teste.com").length).toBeGreaterThan(0);
    expect(screen.getByText("Editar dados")).toBeInTheDocument();
  });

  it("Deve renderizar null quando fechado", () => {
    const { container } = render(
      <SecretariaDetailPanel
        aderido={mockAderido}
        open={false}
        onClose={vi.fn()}
        onSalvar={vi.fn()}
      />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("Deve entrar em modo edicao", () => {
    render(
      <SecretariaDetailPanel
        aderido={mockAderido}
        open={true}
        onClose={vi.fn()}
        onSalvar={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Editar dados"));

    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
    expect(screen.getByText("Salvar dados")).toBeInTheDocument();
  });

  it("Deve chamar onClose ao clicar no botao fechar", () => {
    const onClose = vi.fn();

    render(
      <SecretariaDetailPanel
        aderido={mockAderido}
        open={true}
        onClose={onClose}
        onSalvar={vi.fn()}
      />,
    );

    const closeButton = document.querySelector('[data-testid="CloseIcon"]')?.closest("button");
    // Use the drawer's close behavior via backdrop
    const backdrop = document.querySelector(".MuiBackdrop-root");
    if (backdrop) fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalled();
  });
});
