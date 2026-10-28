import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PixAderidoDetalhesDrawer } from "@/features/tesouraria/components/pix/tabs/aderidos/PixAderidoDetalhesDrawer";
import { pixTransacoesMock } from "@/features/tesouraria/mocks/pixTransacoesMock";
import { agruparPixAderidos } from "@/features/tesouraria/utils/pixAderidosUtils";

describe("Componente: PixAderidoDetalhesDrawer", () => {
  it("Deve renderizar métricas e transações pagas do aderido selecionado", () => {
    const [aderido] = agruparPixAderidos(pixTransacoesMock);

    render(
      <PixAderidoDetalhesDrawer aderido={aderido} onClose={() => undefined} />,
    );

    expect(screen.getByText("Transações relacionadas")).toBeInTheDocument();
    expect(screen.getByText("Rifas restantes")).toBeInTheDocument();
    expect(screen.getByText("Engenheiro Rico")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s*30,00/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("fechar-drawer-aderido")).toBeInTheDocument();
  });

  it("Deve acionar callback onClose ao clicar no botão de fechar (X)", () => {
    const [aderido] = agruparPixAderidos(pixTransacoesMock);
    const handleClose = vi.fn();

    render(
      <PixAderidoDetalhesDrawer aderido={aderido} onClose={handleClose} />,
    );

    const botaoFechar = screen.getByTestId("fechar-drawer-aderido");
    fireEvent.click(botaoFechar);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("Deve renderizar estado sem Pix pago vinculado", () => {
    const [aderido] = agruparPixAderidos(pixTransacoesMock);

    render(
      <PixAderidoDetalhesDrawer
        aderido={{
          ...aderido,
          transacoes: aderido.transacoes.filter(
            (transacao) => transacao.statusPagamento !== "PAID",
          ),
        }}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText("Nenhum Pix pago vinculado.")).toBeInTheDocument();
  });

  it("Deve renderizar medalha especial de ranking para aderidos do top 3", () => {
    const [aderido] = agruparPixAderidos(pixTransacoesMock);

    render(
      <PixAderidoDetalhesDrawer
        aderido={{
          ...aderido,
          posicao: 1,
        }}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText("1º")).toBeInTheDocument();
  });
});
