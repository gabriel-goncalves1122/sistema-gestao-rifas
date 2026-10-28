// ============================================================================
// ARQUIVO: frontend/tests/features/aderidos/CarrinhoFlutuante.test.tsx
// ============================================================================
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useKeyboardHeight: vi.fn(() => 0),
}));

vi.mock("@/shared/hooks/useKeyboardHeight", () => ({
  useKeyboardHeight: mocks.useKeyboardHeight,
}));

import { CarrinhoFlutuante } from "@/features/aderidos/CarrinhoFlutuante";
import { painelAderidoStyles } from "@/features/aderidos/styles/painelAderidoStyles";

describe("Componente <CarrinhoFlutuante />", () => {
  const mockOnPagarClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useKeyboardHeight.mockReturnValue(0);
  });

  it("Não deve renderizar ABSOLUTAMENTE NADA se a quantidade for 0", () => {
    render(
      <CarrinhoFlutuante
        quantidade={0}
        valorTotal={0}
        onPagarClick={mockOnPagarClick}
      />,
    );

    // Procura por qualquer texto do carrinho, não deve existir
    expect(
      screen.queryByText(/rifa\(s\) selecionada\(s\)/i),
    ).not.toBeInTheDocument();
  });

  it("Deve aparecer com a quantidade e o valor corretos quando houver rifas", () => {
    render(
      <CarrinhoFlutuante
        quantidade={3}
        valorTotal={30}
        onPagarClick={mockOnPagarClick}
      />,
    );

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/rifas selecionadas/i)).toBeInTheDocument();
    expect(screen.getByText("R$ 30,00")).toBeInTheDocument();
  });

  it("Deve flutuar sem faixa branca full-width", () => {
    expect(painelAderidoStyles.carrinhoFixoArea).toMatchObject({
      bgcolor: "transparent",
      maxHeight: "100dvh",
      pointerEvents: "none",
    });
    expect(painelAderidoStyles.carrinhoFixoCard).toMatchObject({
      bgcolor: "#FFFFFF",
      border: "2px solid rgba(6,61,49,0.16)",
      pointerEvents: "auto",
    });
    expect(painelAderidoStyles.carrinhoAnimado).toMatchObject({
      opacity: 1,
      transform: "translateY(0)",
    });
  });

  it("Deve disparar a função de Pagar ao clicar no botão 'Pagar'", () => {
    render(
      <CarrinhoFlutuante
        quantidade={2}
        valorTotal={20}
        onPagarClick={mockOnPagarClick}
      />,
    );

    const btnPagar = screen.getByRole("button", { name: /pagar/i });
    expect(btnPagar).toBeInTheDocument();
    expect(screen.getByTestId("carrinho-pagar")).toBe(btnPagar);

    fireEvent.click(btnPagar);

    expect(mockOnPagarClick).toHaveBeenCalledTimes(1);
  });

  it("Deve manter compatibilidade retroativa com onVenderClick caso fornecido", () => {
    const mockOnVender = vi.fn();
    render(
      <CarrinhoFlutuante
        quantidade={2}
        valorTotal={20}
        onVenderClick={mockOnVender}
      />,
    );

    const btnPagar = screen.getByRole("button", { name: /pagar/i });
    fireEvent.click(btnPagar);

    expect(mockOnVender).toHaveBeenCalledTimes(1);
  });

  it("Não deve renderizar o botão de Limpar dentro do carrinho flutuante", () => {
    render(
      <CarrinhoFlutuante
        quantidade={4}
        valorTotal={40}
        onPagarClick={mockOnPagarClick}
        numerosSelecionados={["001", "002", "003", "004"]}
      />,
    );

    expect(screen.queryByTestId("carrinho-limpar")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /limpar/i })).not.toBeInTheDocument();
  });

  it("Deve deslocar o carrinho quando houver teclado virtual", () => {
    mocks.useKeyboardHeight.mockReturnValue(180);

    render(
      <CarrinhoFlutuante
        quantidade={2}
        valorTotal={20}
        onPagarClick={mockOnPagarClick}
      />,
    );

    expect(screen.getByTestId("carrinho-pagar").closest("[data-keyboard-height]"))
      .toHaveAttribute("data-keyboard-height", "180");
  });

  it("Deve exibir o resumo dos números selecionados sem botão limpar", () => {
    render(
      <CarrinhoFlutuante
        quantidade={5}
        valorTotal={50}
        onPagarClick={mockOnPagarClick}
        numerosSelecionados={["001", "002", "003", "004", "005"]}
      />,
    );

    expect(screen.getByTestId("carrinho-resumo-numeros")).toHaveTextContent(
      "#001, #002, #003, #004 +1",
    );
    expect(screen.queryByTestId("carrinho-limpar")).not.toBeInTheDocument();
  });
});
