// ============================================================================
// ARQUIVO: frontend/tests/features/aderidos/components/ErrorRifasState.test.tsx
// ============================================================================
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ErrorRifasState } from "@/features/aderidos/components/ErrorRifasState";

describe("Componente <ErrorRifasState />", () => {
  it("Deve renderizar mensagem amigável de erro e botão de tentar novamente", () => {
    const onTentarNovamente = vi.fn();

    render(<ErrorRifasState onTentarNovamente={onTentarNovamente} />);

    expect(
      screen.getByText("Não foi possível carregar suas rifas"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Houve uma instabilidade ao sincronizar seus bilhetes/i),
    ).toBeInTheDocument();

    const botao = screen.getByTestId("botao-tentar-novamente-rifas");
    expect(botao).toBeInTheDocument();
    expect(botao).not.toBeDisabled();

    fireEvent.click(botao);
    expect(onTentarNovamente).toHaveBeenCalledTimes(1);
  });

  it("Deve desabilitar o botão e exibir feedback quando carregando estiver true", () => {
    render(<ErrorRifasState onTentarNovamente={vi.fn()} carregando={true} />);

    const botao = screen.getByTestId("botao-tentar-novamente-rifas");
    expect(botao).toBeDisabled();
    expect(screen.getByText("Tentando novamente...")).toBeInTheDocument();
  });
});
