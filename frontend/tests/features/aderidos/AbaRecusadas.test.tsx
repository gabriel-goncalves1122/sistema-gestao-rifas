// ============================================================================
// ARQUIVO: frontend/tests/aderidos/AbaRecusadas.test.tsx
// ============================================================================
import { render, screen, fireEvent, act } from "@testing-library/react";
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

  it("Não deve exibir botão de desistir da venda quando apenasCorrecaoCadastro for true", () => {
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
        onDesistirVenda={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: /Desistir da venda \/ Liberar rifas/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("Deve abrir diálogo de confirmação e chamar onDesistirVenda com os números das rifas ao confirmar", async () => {
    const mockDesistir = vi.fn().mockResolvedValue(true);
    render(
      <AbaRecusadas
        gruposRecusados={mockGrupos}
        onVoltar={vi.fn()}
        onAbrirCorrecao={vi.fn()}
        onDesistirVenda={mockDesistir}
      />,
    );

    const btnDesistir = screen.getByRole("button", {
      name: /Desistir da venda \/ Liberar rifas/i,
    });
    expect(btnDesistir).toBeInTheDocument();

    fireEvent.click(btnDesistir);

    expect(
      screen.getByText(/Liberar rifas para nova venda\?/i),
    ).toBeInTheDocument();

    const btnConfirmar = screen.getByRole("button", {
      name: /Confirmar e liberar/i,
    });
    await act(async () => {
      fireEvent.click(btnConfirmar);
    });

    expect(mockDesistir).toHaveBeenCalledTimes(1);
    expect(mockDesistir).toHaveBeenCalledWith(["015", "016"]);
  });
});
