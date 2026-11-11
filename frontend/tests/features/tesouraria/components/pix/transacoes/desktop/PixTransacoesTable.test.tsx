import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PixTransacoesTable } from "@/features/tesouraria/components/pix/transacoes/desktop/PixTransacoesTable";
import { pixTransacoesMock } from "@/features/tesouraria/mocks/pixTransacoesMock";

const onAceitarMock = vi.fn().mockResolvedValue(undefined);
const onNegarMock = vi.fn().mockResolvedValue(undefined);

describe("Componente: PixTransacoesTable", () => {
  it("Deve renderizar colunas principais da análise Pix", () => {
    render(
      <PixTransacoesTable
        transacoes={pixTransacoesMock}
        onAceitar={onAceitarMock}
        onNegar={onNegarMock}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Data" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Pagador" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Aderido" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Rifas" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Valor / Status" }),
    ).toBeInTheDocument();
  });

  it("Deve exibir dados resumidos, chip de origem e abrir detalhes da transação", () => {
    render(
      <PixTransacoesTable
        transacoes={pixTransacoesMock}
        onAceitar={onAceitarMock}
        onNegar={onNegarMock}
      />,
    );

    expect(screen.getByText("Engenheiro Rico")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*30,00/)).toBeInTheDocument();
    expect(screen.getAllByText("Pix").length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", {
        name: /abrir detalhes da transação pix engenheiro rico/i,
      }),
    );

    expect(screen.getByText("Detalhes da transação Pix")).toBeInTheDocument();
    expect(screen.getByText("Gabriel Sampaio")).toBeInTheDocument();
    expect(screen.getByText("010, 011, 012")).toBeInTheDocument();
  });

  it("Deve mostrar transação sem vínculo local nos detalhes", () => {
    render(
      <PixTransacoesTable
        transacoes={pixTransacoesMock}
        onAceitar={onAceitarMock}
        onNegar={onNegarMock}
      />,
    );

    expect(screen.getByText("Pagador Não Identificado")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /abrir detalhes da transação pix pagador não identificado/i,
      }),
    );

    expect(screen.getByText("Não vinculado")).toBeInTheDocument();
    expect(screen.getByText("Sem rifas")).toBeInTheDocument();
  });

  it("Deve abrir os detalhes da transação pelo teclado (Enter/Espaço)", () => {
    render(
      <PixTransacoesTable
        transacoes={pixTransacoesMock}
        onAceitar={onAceitarMock}
        onNegar={onNegarMock}
      />,
    );

    const row = screen.getByTestId("pix-transacao-tx_001");
    fireEvent.keyDown(row, { key: " ", code: "Space" });
    expect(screen.getByText("Detalhes da transação Pix")).toBeInTheDocument();
  });

  it("Deve renderizar checkboxes de seleção por linha e 'Selecionar todas' no cabeçalho", () => {
    const onToggleSelecao = vi.fn();
    const onToggleTodas = vi.fn();
    const transacaoComprovante = {
      ...pixTransacoesMock[2],
      id: "tx_comp_01",
      origem: "COMPROVANTE" as const,
      compradorNome: "Comprador Manual",
    };

    render(
      <PixTransacoesTable
        transacoes={[pixTransacoesMock[0], transacaoComprovante]}
        onAceitar={onAceitarMock}
        onNegar={onNegarMock}
        selecionadosIds={new Set()}
        onToggleSelecao={onToggleSelecao}
        onToggleTodas={onToggleTodas}
      />,
    );

    expect(screen.getByText("Comprovante")).toBeInTheDocument();

    const selecionarTodas = screen.getByRole("checkbox", {
      name: "Selecionar todas",
    });
    fireEvent.click(selecionarTodas);
    expect(onToggleTodas).toHaveBeenCalledWith(["tx_comp_01"]);

    const checkboxLinha = screen.getByRole("checkbox", {
      name: "Selecionar transação Comprador Manual",
    });
    fireEvent.click(checkboxLinha);
    expect(onToggleSelecao).toHaveBeenCalledWith("tx_comp_01");
  });
});
