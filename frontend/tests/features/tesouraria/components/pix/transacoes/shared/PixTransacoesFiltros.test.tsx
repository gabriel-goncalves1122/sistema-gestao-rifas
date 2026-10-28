import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PixTransacoesFiltros } from "@/features/tesouraria/components/pix/transacoes/shared/PixTransacoesFiltros";
import { PixTransacoesFiltros as PixTransacoesFiltrosState } from "@/features/tesouraria/types/pixTransacoes";

const filtrosBase: PixTransacoesFiltrosState = {
  status: "novas",
  busca: "",
};

const matchMediaOriginal = window.matchMedia;

function simularMobile() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("Componente: PixTransacoesFiltros", () => {
  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: matchMediaOriginal,
    });

    vi.restoreAllMocks();
  });

  it("Deve renderizar os filtros essenciais para auditoria Pix, incluindo Aprovadas e Todas", () => {
    render(
      <PixTransacoesFiltros
        filtros={filtrosBase}
        onChangeFiltros={vi.fn()}
        contagens={{
          novas: 5,
          aprovadas: 12,
          recusadas: 2,
          aguardando_pagamento: 3,
          todas: 22,
        }}
      />,
    );

    expect(screen.getByPlaceholderText("Buscar Pix")).toBeInTheDocument();

    expect(screen.getByText("Novas")).toBeInTheDocument();
    expect(screen.getByText("Aprovadas")).toBeInTheDocument();
    expect(screen.getByText("Recusadas")).toBeInTheDocument();
    expect(screen.getByText("Aguardando Pagamento")).toBeInTheDocument();
    expect(screen.getByText("Todas")).toBeInTheDocument();

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();

    expect(screen.queryByText("Para validar")).not.toBeInTheDocument();
    expect(screen.queryByText("Aceitas")).not.toBeInTheDocument();
    expect(screen.queryByText("Negadas")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Sem confirmação bancária"),
    ).not.toBeInTheDocument();
  });

  it("Deve atualizar busca ao digitar no campo", () => {
    const onChangeFiltros = vi.fn();

    render(
      <PixTransacoesFiltros
        filtros={filtrosBase}
        onChangeFiltros={onChangeFiltros}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Buscar Pix"), {
      target: { value: "Gabriel" },
    });

    expect(onChangeFiltros).toHaveBeenCalledWith({
      ...filtrosBase,
      busca: "Gabriel",
    });
  });

  it("Deve alterar filtro rápido para Recusadas e para Aprovadas", () => {
    const onChangeFiltros = vi.fn();

    render(
      <PixTransacoesFiltros
        filtros={filtrosBase}
        onChangeFiltros={onChangeFiltros}
      />,
    );

    fireEvent.click(screen.getByText("Recusadas"));

    expect(onChangeFiltros).toHaveBeenCalledWith({
      ...filtrosBase,
      status: "recusadas",
    });

    fireEvent.click(screen.getByText("Aprovadas"));

    expect(onChangeFiltros).toHaveBeenCalledWith({
      ...filtrosBase,
      status: "aprovadas",
    });
  });

  it("Deve limpar filtros ativos no desktop", () => {
    const onChangeFiltros = vi.fn();

    render(
      <PixTransacoesFiltros
        filtros={{ status: "aprovadas", busca: "Maria" }}
        onChangeFiltros={onChangeFiltros}
        totalResultados={10}
      />,
    );

    const botaoLimpar = screen.getByRole("button", {
      name: /limpar filtros/i,
    });
    expect(botaoLimpar).toBeInTheDocument();

    fireEvent.click(botaoLimpar);

    expect(onChangeFiltros).toHaveBeenCalledWith({
      status: "novas",
      busca: "",
    });
  });

  it("Deve manter a busca visível no mobile e mostrar contador de filtros", () => {
    const onChangeFiltros = vi.fn();
    simularMobile();

    render(
      <PixTransacoesFiltros
        filtros={filtrosBase}
        onChangeFiltros={onChangeFiltros}
      />,
    );

    expect(screen.getByText("Sem filtros ativos")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Buscar Pix"), {
      target: { value: "Ana" },
    });

    expect(onChangeFiltros).toHaveBeenCalledWith({
      ...filtrosBase,
      busca: "Ana",
    });
  });

  it("Deve limpar busca e filtro rápido ativos no mobile", () => {
    const onChangeFiltros = vi.fn();
    simularMobile();

    render(
      <PixTransacoesFiltros
        filtros={{ status: "recusadas", busca: "Gabriel" }}
        onChangeFiltros={onChangeFiltros}
      />,
    );

    expect(screen.getByText("2 filtros ativos")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /limpar filtros pix/i }),
    );

    expect(onChangeFiltros).toHaveBeenCalledWith({
      status: "novas",
      busca: "",
    });
  });
});
