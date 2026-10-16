import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PixAderidosTab } from "@/features/tesouraria/components/pix/tabs/PixAderidosTab";
import { pixTransacoesMock } from "@/features/tesouraria/mocks/pixTransacoesMock";

describe("Aba: PixAderidosTab", () => {
  it("Deve mostrar nome, CPF, arrecadação e rifas restantes por aderido", () => {
    render(<PixAderidosTab transacoes={pixTransacoesMock} />);

    expect(screen.getByText("Gabriel Sampaio")).toBeInTheDocument();
    expect(screen.getByText("000.000.001-91")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*30,00/)).toBeInTheDocument();
    expect(screen.getByText("117 rifas")).toBeInTheDocument();
  });

  it("Deve mostrar grupo sem aderido vinculado quando houver Pix não identificado", () => {
    render(<PixAderidosTab transacoes={pixTransacoesMock} />);

    expect(screen.getByText("Sem aderido vinculado")).toBeInTheDocument();
    expect(screen.getAllByText("CPF não informado").length).toBeGreaterThan(0);
    expect(screen.getByText(/R\$\s*20,00/)).toBeInTheDocument();
  });

  it("Deve abrir bottom sheet com detalhes de arrecadação ao tocar no card", () => {
    render(<PixAderidosTab transacoes={pixTransacoesMock} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /abrir detalhes de arrecadação de Gabriel Sampaio/i,
      }),
    );

    expect(screen.getByText("Transações relacionadas")).toBeInTheDocument();
    expect(screen.getByText("Engenheiro Rico")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s*30,00/).length).toBeGreaterThan(1);
  });

  it("Deve priorizar aderidosServidor do relatório quando fornecido", () => {
    const aderidosServidorMock = [
      {
        vendedorId: "vend_servidor",
        vendedorNome: "Carlos Servidor",
        vendedorCpf: "99988877766",
        valorTotal: 500,
        valorPix: 300,
        valorComprovante: 200,
        rifasVendidas: 50,
        comprasCount: 10,
        ultimaVendaEm: "2026-10-15T10:00:00.000Z",
      },
    ];

    render(
      <PixAderidosTab
        transacoes={pixTransacoesMock}
        aderidosServidor={aderidosServidorMock}
      />,
    );

    expect(screen.getByText("Carlos Servidor")).toBeInTheDocument();
    expect(screen.getByText("999.888.777-66")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*500,00/)).toBeInTheDocument();
    expect(screen.getByText(/Pix:\s*R\$\s*300,00\s*•\s*Comp:\s*R\$\s*200,00/i)).toBeInTheDocument();
    expect(screen.getByText("70 rifas")).toBeInTheDocument();
  });
});
