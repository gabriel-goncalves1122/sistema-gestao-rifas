// ============================================================================
// ARQUIVO: frontend/src/views/components/__tests__/CarrinhoFlutuante.test.tsx
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
  const mockOnVenderClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useKeyboardHeight.mockReturnValue(0);
  });

  it("Não deve renderizar ABSOLUTAMENTE NADA se a quantidade for 0", () => {
    render(
      <CarrinhoFlutuante
        quantidade={0}
        valorTotal={0}
        onVenderClick={mockOnVenderClick}
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
        onVenderClick={mockOnVenderClick}
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

  it("Deve disparar a função de Vender ao clicar no botão", () => {
    render(
      <CarrinhoFlutuante
        quantidade={2}
        valorTotal={20}
        onVenderClick={mockOnVenderClick}
      />,
    );

    const btnVender = screen.getByRole("button", { name: /vender/i });
    fireEvent.click(btnVender);

    expect(mockOnVenderClick).toHaveBeenCalledTimes(1);
  });

  it("Deve deslocar o carrinho quando houver teclado virtual", () => {
    mocks.useKeyboardHeight.mockReturnValue(180);

    render(
      <CarrinhoFlutuante
        quantidade={2}
        valorTotal={20}
        onVenderClick={mockOnVenderClick}
      />,
    );

    expect(screen.getByTestId("carrinho-vender").closest("[data-keyboard-height]"))
      .toHaveAttribute("data-keyboard-height", "180");
  });

  it("Deve exibir o resumo dos números selecionados e acionar onLimparClick", () => {
    const mockOnLimpar = vi.fn();

    render(
      <CarrinhoFlutuante
        quantidade={5}
        valorTotal={50}
        onVenderClick={mockOnVenderClick}
        numerosSelecionados={["001", "002", "003", "004", "005"]}
        onLimparClick={mockOnLimpar}
      />,
    );

    expect(screen.getByTestId("carrinho-resumo-numeros")).toHaveTextContent(
      "#001, #002, #003, #004 +1",
    );

    const btnLimpar = screen.getByTestId("carrinho-limpar");
    fireEvent.click(btnLimpar);

    expect(mockOnLimpar).toHaveBeenCalledTimes(1);
  });
});
