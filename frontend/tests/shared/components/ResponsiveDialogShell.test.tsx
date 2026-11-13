import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ResponsiveDialogShell } from "@/shared/components/ResponsiveDialogShell";

describe("Componente: ResponsiveDialogShell", () => {
  it("renderiza Dialog no desktop com título, subtítulo, conteúdo e ação de fechar", () => {
    const onClose = vi.fn();

    render(
      <ResponsiveDialogShell
        open
        onClose={onClose}
        isMobile={false}
        title="Detalhes no Desktop"
        subtitle="Subtítulo informativo"
        closeAriaLabel="Fechar janela"
        actions={<button type="button">Ação</button>}
      >
        <div>Conteúdo interno</div>
      </ResponsiveDialogShell>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Detalhes no Desktop")).toBeInTheDocument();
    expect(screen.getByText("Subtítulo informativo")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo interno")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ação" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fechar janela" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renderiza Drawer inferior no mobile e encaminha submit quando encapsula formulário", () => {
    const onSubmit = vi.fn((e) => e.preventDefault());

    render(
      <ResponsiveDialogShell
        open
        onClose={vi.fn()}
        isMobile
        title="Edição Mobile"
        formId="form-mobile-teste"
        onSubmit={onSubmit}
        actions={<button type="submit">Salvar</button>}
      >
        <input aria-label="Campo teste" />
      </ResponsiveDialogShell>,
    );

    expect(screen.getByText("Edição Mobile")).toBeInTheDocument();
    fireEvent.submit(document.getElementById("form-mobile-teste")!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
