// ============================================================================
// ARQUIVO: frontend/tests/aderidos/AbaRecusadas.test.tsx
// ============================================================================
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AbaRecusadas } from "@/features/aderidos/AbaRecusadas";

describe("Componente: AbaRecusadas", () => {
  const mockGrupos = [
    {
      comprador: "Gabriel Sampaio",
      email: "gabriel@email.com",
      telefone: "(35) 99999-9999",
      data: "2026-04-19T10:00:00.000Z",
      motivo: "Telefone divergente.",
      bilhetes: ["015", "016"],
    },
  ];

  it("Deve renderizar o título e as informações do grupo recusado corretamente", () => {
    render(
      <AbaRecusadas
        gruposRecusados={mockGrupos}
        onVoltar={vi.fn()}
        onAbrirCorrecao={vi.fn()}
      />,
    );

    expect(
      screen.queryByText(/Vendas recusadas - ação necessária/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Correção de dados/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Vendas recusadas/i })).toBeInTheDocument();
    expect(screen.getByText(/Rifas para revisar/i)).toBeInTheDocument();

    expect(screen.getByText("Gabriel Sampaio")).toBeInTheDocument();
    expect(screen.getByText(/Telefone divergente/i)).toBeInTheDocument();
    expect(screen.getByText("015")).toBeInTheDocument();
    expect(screen.getByText("016")).toBeInTheDocument();
  });

  it("Deve chamar a função onVoltar ao clicar no botão de voltar", () => {
    const mockVoltar = vi.fn();
    render(
      <AbaRecusadas
        gruposRecusados={mockGrupos}
        onVoltar={mockVoltar}
        onAbrirCorrecao={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Voltar às rifas/i }));

    expect(mockVoltar).toHaveBeenCalledTimes(1);
  });

  it("Deve chamar a função onAbrirCorrecao com o grupo exato ao clicar no botão", () => {
    const mockAbrirCorrecao = vi.fn();
    render(
      <AbaRecusadas
        gruposRecusados={mockGrupos}
        onVoltar={vi.fn()}
        onAbrirCorrecao={mockAbrirCorrecao}
      />,
    );

    const btnCorrigir = screen.getByRole("button", {
      name: /Corrigir dados/i,
    });
    expect(btnCorrigir).toHaveStyle({ backgroundColor: "#063D31" });

    fireEvent.click(btnCorrigir);

    expect(mockAbrirCorrecao).toHaveBeenCalledTimes(1);
    expect(mockAbrirCorrecao).toHaveBeenCalledWith(mockGrupos[0]);
  });

  it("Deve exibir o selo 'Correção de cadastro (Pagamento aprovado)' quando apenasCorrecaoCadastro for true", () => {
    render(
      <AbaRecusadas
        gruposRecusados={[
          {
            ...mockGrupos[0],
            apenasCorrecaoCadastro: true,
          },
        ]}
        onVoltar={vi.fn()}
        onAbrirCorrecao={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Correção de cadastro \(Pagamento aprovado\)/i),
    ).toBeInTheDocument();
  });
});
