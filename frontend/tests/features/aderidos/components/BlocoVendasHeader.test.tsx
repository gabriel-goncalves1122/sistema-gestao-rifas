// ============================================================================
// ARQUIVO: frontend/tests/features/rifas/components/BlocoVendasHeader.test.tsx
// ============================================================================
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BlocoVendasHeader } from "@/features/aderidos/components/BlocoVendasHeader";

describe("Componente: BlocoVendasHeader", () => {
  it("Deve renderizar o título principal do bloco de vendas", () => {
    render(<BlocoVendasHeader totalRifasVisiveis={42} />);

    // O componente renderiza o título como Typography padrão, não como heading.
    expect(screen.getByText("Suas rifas")).toBeInTheDocument();
    expect(screen.getByText("42 na lista")).toBeInTheDocument();
  });

  it("Deve renderizar o botão de ajuda e abrir o diálogo de status ao clicar", () => {
    render(<BlocoVendasHeader />);

    const botaoAjuda = screen.getByRole("button", {
      name: /toque nas rifas disponíveis para selecionar/i,
    });
    expect(botaoAjuda).toBeInTheDocument();

    fireEvent.click(botaoAjuda);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Entenda os status")).toBeInTheDocument();
  });
});
