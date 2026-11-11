import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PixTransacoesMobileView } from "@/features/tesouraria/components/pix/transacoes/mobile/PixTransacoesMobileView";
import { pixTransacoesMock } from "@/features/tesouraria/mocks/pixTransacoesMock";

describe("Componente: PixTransacoesMobileView", () => {
  it("Deve renderizar filtros e cards no mobile", () => {
    render(
      <PixTransacoesMobileView
        filtros={{ status: "todas", busca: "" }}
        transacoes={pixTransacoesMock}
        onChangeFiltros={vi.fn()}
        onAceitar={vi.fn()}
        onNegar={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("Buscar Pix")).toBeInTheDocument();

    expect(screen.getByText("Engenheiro Rico")).toBeInTheDocument();
    expect(screen.getByText("Pagador Não Identificado")).toBeInTheDocument();
  });

  it("Deve renderizar empty state quando não houver transações", () => {
    render(
      <PixTransacoesMobileView
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
