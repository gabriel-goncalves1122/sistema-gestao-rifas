import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PainelRifasPrincipal } from "@/features/aderidos/components/shared/PainelRifasPrincipal";
import type { ContadoresRifas } from "@/features/aderidos/utils/filtrosRifas";

const contadores: ContadoresRifas = {
  todas: 2,
  disponivel: 1,
  reservado: 0,
  pendente: 0,
  pago: 1,
  recusado: 0,
};

describe("PainelRifasPrincipal", () => {
  it("Deve renderizar header, filtros com contadores e grelha", () => {
    render(
      <PainelRifasPrincipal
        filtro="todas"
        contadoresRifas={contadores}
        rifasFiltradas={[
          { numero: "001", status: "disponivel" },
          { numero: "002", status: "pago" },
        ]}
        selecionadas={[]}
        onChangeFiltro={vi.fn()}
        onToggleSelecao={vi.fn()}
        onAbrirDetalhes={vi.fn()}
      />,
    );

    expect(screen.getByText("Suas rifas")).toBeInTheDocument();
    expect(screen.getByText("2 na lista")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Todas" })).toBeInTheDocument();
    expect(screen.getByText("001")).toBeInTheDocument();
  });

  it("Deve preservar callback de seleção de rifa disponível", () => {
    const onToggleSelecao = vi.fn();

    render(
      <PainelRifasPrincipal
        filtro="todas"
        contadoresRifas={contadores}
        rifasFiltradas={[{ numero: "001", status: "disponivel" }]}
        selecionadas={[]}
        onChangeFiltro={vi.fn()}
        onToggleSelecao={onToggleSelecao}
        onAbrirDetalhes={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("001"));

    expect(onToggleSelecao).toHaveBeenCalledWith("001", "disponivel");
  });

  it("Deve filtrar as rifas visíveis ao digitar no campo de busca rápida", () => {
    render(
      <PainelRifasPrincipal
        filtro="todas"
        contadoresRifas={contadores}
        rifasFiltradas={[
          { numero: "001", status: "disponivel" },
          { numero: "042", status: "pago", comprador_nome: "Carlos" },
        ]}
        selecionadas={[]}
        onChangeFiltro={vi.fn()}
        onToggleSelecao={vi.fn()}
        onAbrirDetalhes={vi.fn()}
      />,
    );

    const inputBusca = screen.getByPlaceholderText(
      /buscar nº da rifa ou comprador/i,
    );
    fireEvent.change(inputBusca, { target: { value: "042" } });

    expect(screen.getByText("1 na lista")).toBeInTheDocument();
    expect(screen.getByText("042")).toBeInTheDocument();
    expect(screen.queryByText("001")).not.toBeInTheDocument();
  });
});
