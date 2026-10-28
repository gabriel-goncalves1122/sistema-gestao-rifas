// ============================================================================
// ARQUIVO: frontend/tests/features/rifas/components/GrelhaRifas.test.tsx
// ============================================================================
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { GrelhaRifas } from "@/features/aderidos/components/GrelhaRifas";
import { painelAderidoStyles } from "@/features/aderidos/styles/painelAderidoStyles";

const rifas = [
  {
    numero: "001",
    status: "disponivel",
  },
  {
    numero: "002",
    status: "pago",
    comprador_nome: "Ana Beatriz",
  },
  {
    numero: "003",
    status: "pendente",
  },
  {
    numero: "004",
    status: "recusado",
  },
];

describe("Componente <GrelhaRifas />", () => {
  it("Deve mostrar estado vazio quando não houver rifas", () => {
    render(
      <GrelhaRifas
        rifas={[]}
        selecionadas={[]}
        onToggleSelecao={vi.fn()}
        onAbrirDetalhes={vi.fn()}
      />,
    );

    expect(screen.getByText(/Nenhuma rifa encontrada/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Ajuste o filtro para visualizar outras categorias/i),
    ).toBeInTheDocument();
  });

  it("Deve renderizar os números das rifas", () => {
    render(
      <GrelhaRifas
        rifas={rifas}
        selecionadas={[]}
        onToggleSelecao={vi.fn()}
        onAbrirDetalhes={vi.fn()}
      />,
    );

    expect(screen.getByText("001")).toBeInTheDocument();
    expect(screen.getByText("002")).toBeInTheDocument();
    expect(screen.getByText("003")).toBeInTheDocument();
    expect(screen.getByText("004")).toBeInTheDocument();
  });

  it("Deve usar grid XS respirado e cards com affordance forte", () => {
    expect(painelAderidoStyles.gridRifasWrapper).toMatchObject({
      overflow: "visible",
    });
    expect(painelAderidoStyles.gridRifasWrapper).not.toHaveProperty("maxHeight");
    expect(painelAderidoStyles.gridRifasWrapper).not.toHaveProperty("overflowY");
    expect(painelAderidoStyles.gridRifas).toMatchObject({
      gridTemplateColumns: {
        xs: "repeat(3, minmax(76px, 1fr))",
      },
      gap: 1.5,
    });
    expect(painelAderidoStyles.rifaButton).toMatchObject({
      minHeight: {
        xs: 56,
      },
      border: "2px solid",
    });
  });

  it("Deve permitir selecionar apenas rifas disponíveis", () => {
    const mockToggle = vi.fn();

    render(
      <GrelhaRifas
        rifas={rifas}
        selecionadas={[]}
        onToggleSelecao={mockToggle}
        onAbrirDetalhes={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("001"));
    fireEvent.click(screen.getByText("003"));
    fireEvent.click(screen.getByText("004"));

    expect(mockToggle).toHaveBeenCalledTimes(1);
    expect(mockToggle).toHaveBeenCalledWith("001", "disponivel");
  });

  it("Deve identificar rifas pendentes como Em análise", () => {
    render(
      <GrelhaRifas
        rifas={rifas}
        selecionadas={[]}
        onToggleSelecao={vi.fn()}
        onAbrirDetalhes={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Rifa 003 - Em análise/i }),
    ).toBeDisabled();
  });

  it("Deve diferenciar rifa disponível como ação de venda", async () => {
    const user = userEvent.setup();

    render(
      <GrelhaRifas
        rifas={rifas}
        selecionadas={[]}
        onToggleSelecao={vi.fn()}
        onAbrirDetalhes={vi.fn()}
      />,
    );

    const rifaDisponivel = screen.getByRole("button", {
      name: /Rifa 001 disponível para vender/i,
    });

    expect(rifaDisponivel).toHaveStyle({ cursor: "pointer" });

    await user.hover(rifaDisponivel);

    expect(await screen.findByText(/Clique para vender/i)).toBeInTheDocument();
  });

  it("Deve diferenciar rifa paga como ação de detalhes", async () => {
    const user = userEvent.setup();

    render(
      <GrelhaRifas
        rifas={rifas}
        selecionadas={[]}
        onToggleSelecao={vi.fn()}
        onAbrirDetalhes={vi.fn()}
      />,
    );

    const rifaPaga = screen.getByRole("button", {
      name: /Rifa 002 paga, clique para ver detalhes/i,
    });

    expect(rifaPaga).toHaveStyle({ cursor: "help" });
    expect(screen.getByTestId("rifa-002-detalhes-icon")).toBeInTheDocument();

    await user.hover(rifaPaga);

    expect(
      await screen.findByText(/Clique para ver detalhes/i),
    ).toBeInTheDocument();
  });

  it("Deve abrir detalhes apenas ao clicar em rifa paga", () => {
    const mockDetalhes = vi.fn();

    render(
      <GrelhaRifas
        rifas={rifas}
        selecionadas={[]}
        onToggleSelecao={mockDetalhes}
        onAbrirDetalhes={mockDetalhes}
      />,
    );

    fireEvent.click(screen.getByText("002"));
    fireEvent.click(screen.getByText("003"));

    expect(mockDetalhes).toHaveBeenCalledTimes(1);
    expect(mockDetalhes).toHaveBeenCalledWith(
      expect.objectContaining({
        numero: "002",
        status: "pago",
      }),
    );
  });

  it("Deve exibir indicador de alerta âmbar quando rifa paga possuir correcao_pendente", () => {
    render(
      <GrelhaRifas
        rifas={[
          {
            numero: "005",
            status: "pago",
            correcao_pendente: true,
            motivo_recusa: "Telefone incorreto",
          },
        ]}
        selecionadas={[]}
        onToggleSelecao={vi.fn()}
        onAbrirDetalhes={vi.fn()}
      />,
    );

    expect(screen.getByTestId("rifa-005-alerta-correcao")).toBeInTheDocument();
    expect(screen.getByTestId("rifa-005-detalhes-icon")).toBeInTheDocument();
  });

  it("Deve permitir desmarcar rifa selecionada diretamente ao clicar nela", () => {
    const mockToggle = vi.fn();

    render(
      <GrelhaRifas
        rifas={rifas}
        selecionadas={["001"]}
        onToggleSelecao={mockToggle}
        onAbrirDetalhes={vi.fn()}
      />,
    );

    const rifaSelecionada = screen.getByRole("button", {
      name: /Rifa 001 selecionada, clique para desmarcar/i,
    });
    expect(rifaSelecionada).toBeInTheDocument();

    fireEvent.click(rifaSelecionada);

    expect(mockToggle).toHaveBeenCalledTimes(1);
    expect(mockToggle).toHaveBeenCalledWith("001", "disponivel");
  });
});
