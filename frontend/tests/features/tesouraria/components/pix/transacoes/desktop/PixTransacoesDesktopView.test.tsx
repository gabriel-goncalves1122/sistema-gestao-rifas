import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PixTransacoesDesktopView } from "@/features/tesouraria/components/pix/transacoes/desktop/PixTransacoesDesktopView";
import { pixTransacoesMock } from "@/features/tesouraria/mocks/pixTransacoesMock";

describe("Componente: PixTransacoesDesktopView", () => {
  it("Deve renderizar a visão desktop com filtros, tabela e seleção em lote", () => {
    render(
      <PixTransacoesDesktopView
        filtros={{ status: "todas", busca: "" }}
        transacoes={pixTransacoesMock}
        onChangeFiltros={vi.fn()}
        onAceitar={vi.fn()}
        onNegar={vi.fn()}
        onAceitarLote={vi.fn()}
        onNegarLote={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("Buscar Pix")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Pagador" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Engenheiro Rico")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Selecionar transação Pagador Não Identificado",
      }),
    );

    expect(screen.getByText(/1 selecionada \(R\$\s*20,00\)/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /aceitar selecionadas/i }),
    ).toBeInTheDocument();
  });

  it("Deve renderizar empty state quando não houver transações", () => {
    render(
      <PixTransacoesDesktopView
        filtros={{ status: "todas", busca: "" }}
        transacoes={[]}
        onChangeFiltros={vi.fn()}
        onAceitar={vi.fn()}
        onNegar={vi.fn()}
      />,
    );

    expect(screen.getByText("Nenhuma transação encontrada")).toBeInTheDocument();
  });
});
