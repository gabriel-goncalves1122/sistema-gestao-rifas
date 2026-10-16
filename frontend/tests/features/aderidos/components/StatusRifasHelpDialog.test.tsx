// ============================================================================
// ARQUIVO: frontend/tests/features/rifas/components/StatusRifasHelpDialog.test.tsx
// ============================================================================
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StatusRifasHelpDialog } from "@/features/aderidos/components/StatusRifasHelpDialog";

function renderDialogAberto(onClose = vi.fn()) {
  return render(<StatusRifasHelpDialog open onClose={onClose} />);
}

describe("Componente: StatusRifasHelpDialog", () => {
  it("Deve renderizar o diálogo quando estiver aberto", () => {
    renderDialogAberto();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Entenda os status")).toBeInTheDocument();
  });

  it("Deve explicar os principais status das rifas", () => {
    renderDialogAberto();

    expect(screen.getByText("Disponível")).toBeInTheDocument();
    expect(screen.getByText("Selecionada")).toBeInTheDocument();
    expect(screen.getByText("Em análise")).toBeInTheDocument();
    expect(screen.getByText("Paga")).toBeInTheDocument();
    expect(screen.getByText("Paga (revisão de dados)")).toBeInTheDocument();
    expect(screen.getByText("Negada")).toBeInTheDocument();

    expect(
      screen.getByText(/pode ser selecionada para uma nova venda/i),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/aguarda validação da tesouraria/i),
    ).toBeInTheDocument();

    expect(screen.getByText(/clique para ver detalhes/i)).toBeInTheDocument();

    expect(
      screen.getByText(/precisa de correção antes de seguir/i),
    ).toBeInTheDocument();
  });

  it("Deve chamar onClose ao clicar no botão de fechar", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderDialogAberto(onClose);

    await user.click(screen.getByRole("button", { name: /entendi/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
