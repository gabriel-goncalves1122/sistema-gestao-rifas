import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ModalManutencaoAdmin } from "@/shared/components/ModalManutencaoAdmin";

describe("ModalManutencaoAdmin", () => {
  const statusPadrao = {
    emManutencao: false,
    mensagem: "Manutenção programada",
    previsaoRetorno: "20:00",
    atualizadoEm: null,
    atualizadoPor: null,
  };

  it("não deve renderizar quando open for falso", () => {
    render(
      <ModalManutencaoAdmin
        open={false}
        onClose={vi.fn()}
        statusAtual={statusPadrao}
        onSalvar={vi.fn()}
        salvando={false}
      />,
    );

    expect(
      screen.queryByText("Controle do Modo de Manutenção"),
    ).not.toBeInTheDocument();
  });

  it("deve carregar dados atuais e chamar onSalvar ao confirmar", async () => {
    const handleSalvar = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <ModalManutencaoAdmin
        open={true}
        onClose={handleClose}
        statusAtual={statusPadrao}
        onSalvar={handleSalvar}
        salvando={false}
      />,
    );

    expect(
      screen.getByText("Controle do Modo de Manutenção"),
    ).toBeInTheDocument();

    // Alterna o switch
    const switchInput = screen.getByRole("switch");
    fireEvent.click(switchInput);

    // Clica em salvar
    const botaoSalvar = screen.getByRole("button", {
      name: /Salvar Alterações/i,
    });
    fireEvent.click(botaoSalvar);

    expect(handleSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        emManutencao: true,
        mensagem: "Manutenção programada",
        previsaoRetorno: "20:00",
      }),
    );
  });
});
