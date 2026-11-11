import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PixTransacaoCard } from "@/features/tesouraria/components/pix/transacoes/mobile/PixTransacaoCard";
import { pixTransacoesMock } from "@/features/tesouraria/mocks/pixTransacoesMock";

const onAceitarMock = vi.fn().mockResolvedValue(undefined);
const onNegarMock = vi.fn().mockResolvedValue(undefined);

describe("Componente: PixTransacaoCard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Deve renderizar os dados principais e o chip de origem da transação Pix no mobile", () => {
    render(
      <PixTransacaoCard
        transacao={pixTransacoesMock[0]}
        onAceitar={onAceitarMock}
        onNegar={onNegarMock}
      />,
    );

    expect(screen.getByText("Engenheiro Rico")).toBeInTheDocument();
    expect(screen.getByText("Gabriel Sampaio")).toBeInTheDocument();
    expect(screen.getByText("Pix")).toBeInTheDocument();

    expect(screen.getByText("Rifas 010, 011, 012")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*30,00/)).toBeInTheDocument();
    expect(screen.queryByText("Reference ID")).not.toBeInTheDocument();
  });

  it("Deve exibir chip Comprovante e permitir seleção quando elegível", () => {
    const onToggleSelecao = vi.fn();
    render(
      <PixTransacaoCard
        transacao={{
          ...pixTransacoesMock[2],
          id: "tx_comp_mobile",
          origem: "COMPROVANTE",
        }}
        onAceitar={onAceitarMock}
        onNegar={onNegarMock}
        selecionada={false}
        onToggleSelecao={onToggleSelecao}
      />,
    );

    expect(screen.getByText("Comprovante")).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox", {
      name: /selecionar transação pagador não identificado/i,
    });
    fireEvent.click(checkbox);
    expect(onToggleSelecao).toHaveBeenCalledWith("tx_comp_mobile");
  });

  it("Deve mostrar fallback quando não houver aderido ou rifas", () => {
    render(
      <PixTransacaoCard
        transacao={pixTransacoesMock[2]}
        onAceitar={onAceitarMock}
        onNegar={onNegarMock}
      />,
    );

    expect(screen.getByText("Pagador Não Identificado")).toBeInTheDocument();
    expect(screen.getByText("Sem aderido vinculado")).toBeInTheDocument();
    expect(screen.getByText("Sem rifas vinculadas")).toBeInTheDocument();
  });

  it("Não deve renderizar reference ID ou botão de cópia", () => {
    render(
      <PixTransacaoCard
        transacao={pixTransacoesMock[0]}
        onAceitar={onAceitarMock}
        onNegar={onNegarMock}
      />,
    );

    expect(screen.queryByText("Reference ID")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /copiar reference id/i }),
    ).not.toBeInTheDocument();
  });
});
