import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConciliacaoExtratoDialog } from "@/features/tesouraria/components/pix/transacoes/shared/ConciliacaoExtratoDialog";
import { ResultadoAnaliseExtrato } from "@/features/tesouraria/types/conciliacaoExtrato";

describe("ConciliacaoExtratoDialog", () => {
  const propsBase = {
    aberto: true,
    onFechar: vi.fn(),
    arquivo: null,
    analisando: false,
    aprovando: false,
    resultado: null,
    selecionados: new Set<string>(),
    erro: null,
    onSelecionarArquivo: vi.fn(),
    onToggleSelecao: vi.fn(),
    onToggleTodos: vi.fn(),
    onConfirmarAprovacao: vi.fn(),
    onLimpar: vi.fn(),
    valorTotalSelecionado: 0,
  };

  it("deve renderizar a área de dropzone quando nenhum extrato foi carregado", () => {
    render(<ConciliacaoExtratoDialog {...propsBase} />);

    expect(
      screen.getByText(/Conciliação por Extrato Bancário/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Clique para selecionar ou arraste o extrato aqui/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/InfinitePay/i).length).toBeGreaterThan(0);
  });

  it("deve exibir spinner durante análise do extrato", () => {
    render(<ConciliacaoExtratoDialog {...propsBase} analisando={true} />);

    expect(
      screen.getByText(/Cruzando transações do extrato com o sistema/i),
    ).toBeInTheDocument();
  });

  it("deve renderizar tabela de matches e cards de KPI após processamento", () => {
    const mockResultado: ResultadoAnaliseExtrato = {
      resumo: {
        totalLinhasExtrato: 2,
        totalPendenciasSistema: 2,
        totalMatchesExatos: 1,
        totalMatchesAproximados: 1,
        totalSemMatchExtrato: 0,
        totalSemMatchSistema: 0,
        valorTotalMatches: 50,
      },
      matches: [
        {
          pagamentoId: "pag_1",
          tipoMatch: "TXID_EXATO",
          alvoMatch: "TXID",
          confianca: 1.0,
          compradorNome: "Pedro Henrique",
          nomePagadorBanco: "Pedro Henrique",
          valorEsperado: 20,
          valorBanco: 20,
          numerosRifas: ["00001", "00002"],
          dataBanco: "10/11/2026",
          dataReserva: "10/11/2026",
        },
      ],
      naoIdentificadosExtrato: [],
    };

    render(
      <ConciliacaoExtratoDialog
        {...propsBase}
        resultado={mockResultado}
        selecionados={new Set(["pag_1"])}
        valorTotalSelecionado={20}
      />,
    );

    expect(screen.getByText(/MATCHES EXATOS \(TXID\)/i)).toBeInTheDocument();
    expect(screen.getAllByText("Pedro Henrique").length).toBe(2); // Comprador e Pagador
    expect(screen.getByText(/Exato \(txid\)/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Aprovar 1 Vendas/i }),
    ).toBeInTheDocument();
  });

  it("deve acionar onConfirmarAprovacao ao clicar no botão de aprovação em lote", () => {
    const onConfirmar = vi.fn();
    const mockResultado: ResultadoAnaliseExtrato = {
      resumo: {
        totalLinhasExtrato: 1,
        totalPendenciasSistema: 1,
        totalMatchesExatos: 1,
        totalMatchesAproximados: 0,
        totalSemMatchExtrato: 0,
        totalSemMatchSistema: 0,
        valorTotalMatches: 20,
      },
      matches: [
        {
          pagamentoId: "pag_1",
          tipoMatch: "TXID_EXATO",
          alvoMatch: "TXID",
          confianca: 1.0,
          compradorNome: "Pedro Henrique",
          nomePagadorBanco: "Pedro Henrique",
          valorEsperado: 20,
          valorBanco: 20,
          numerosRifas: ["00001"],
          dataBanco: "10/11/2026",
          dataReserva: "10/11/2026",
        },
      ],
      naoIdentificadosExtrato: [],
    };

    render(
      <ConciliacaoExtratoDialog
        {...propsBase}
        resultado={mockResultado}
        selecionados={new Set(["pag_1"])}
        valorTotalSelecionado={20}
        onConfirmarAprovacao={onConfirmar}
      />,
    );

    const btnAprovar = screen.getByRole("button", {
      name: /Aprovar 1 Vendas/i,
    });
    fireEvent.click(btnAprovar);

    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });
});
