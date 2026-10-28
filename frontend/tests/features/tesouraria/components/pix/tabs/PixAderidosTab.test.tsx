import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PixAderidosTab } from "@/features/tesouraria/components/pix/tabs/PixAderidosTab";
import { pixTransacoesMock } from "@/features/tesouraria/mocks/pixTransacoesMock";

describe("Aba: PixAderidosTab", () => {
  it("Deve mostrar nome, CPF, arrecadação e rifas restantes por aderido na tabela de ranking", () => {
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

  it("Deve abrir bottom sheet com detalhes de arrecadação e histórico ao clicar no nome do aderido", () => {
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

  it("Deve priorizar aderidosServidor do relatório quando fornecido e exibir histórico de transações ao clicar", () => {
    const aderidosServidorMock = [
      {
        vendedorId: "vend_servidor",
        vendedorNome: "Carlos Servidor",
        vendedorCpf: "99988877766",
        curso: "Eng. Computação",
        cargo: "Tesoureiro",
        arrecadado: 500,
        valorTotal: 500,
        valorPix: 300,
        valorComprovante: 200,
        meta: 1200,
        rifasVendidas: 50,
        rifasVendidasPix: 30,
        rifasVendidasComprovante: 20,
        comprasCount: 2,
        ultimaVendaEm: "2026-10-15T10:00:00.000Z",
        transacoes: [
          {
            id: "tx-pix-carlos",
            compradorNome: "Comprador via Pix",
            dataPagamento: "2026-10-15T10:00:00.000Z",
            dataCriacao: "2026-10-15T09:55:00.000Z",
            valorBruto: 300,
            valorPago: 297,
            quantidadeRifas: 30,
            rifas: [{ numero: "001", status: "pago" }],
            origem: "PIX" as const,
            statusPagamento: "PAID" as const,
          },
          {
            id: "tx-comp-carlos",
            compradorNome: "Comprador via Comprovante",
            dataPagamento: "2026-10-14T10:00:00.000Z",
            dataCriacao: "2026-10-14T09:50:00.000Z",
            valorBruto: 200,
            valorPago: 200,
            quantidadeRifas: 20,
            rifas: [{ numero: "031", status: "pago" }],
            origem: "COMPROVANTE" as const,
            statusPagamento: "PAID" as const,
          },
        ],
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
    expect(screen.getByText("Eng. Computação")).toBeInTheDocument();
    expect(screen.getByText("Tesoureiro")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*500,00/)).toBeInTheDocument();
    expect(
      screen.getByText(/Pix:\s*R\$\s*300,00\s*•\s*Comp:\s*R\$\s*200,00/i),
    ).toBeInTheDocument();
    expect(screen.getByText("70 rifas")).toBeInTheDocument();

    // Clica no nome do aderido para abrir o histórico de transações daquela pessoa
    fireEvent.click(
      screen.getByRole("button", {
        name: /abrir detalhes de arrecadação de Carlos Servidor/i,
      }),
    );

    expect(screen.getByText("Transações relacionadas")).toBeInTheDocument();
    expect(screen.getByText("Comprador via Pix")).toBeInTheDocument();
    expect(screen.getByText("Comprador via Comprovante")).toBeInTheDocument();
  });

  it("Deve filtrar aderidos pelo campo de busca", () => {
    render(<PixAderidosTab transacoes={pixTransacoesMock} />);

    const inputBusca = screen.getByPlaceholderText(
      /buscar por nome, curso ou cpf/i,
    );
    fireEvent.change(inputBusca, { target: { value: "Gabriel" } });

    expect(screen.getByText("Gabriel Sampaio")).toBeInTheDocument();
    expect(screen.queryByText("Sem aderido vinculado")).not.toBeInTheDocument();
  });
});
