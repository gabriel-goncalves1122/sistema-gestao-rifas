import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ConciliacaoExtratoDialog } from "@/features/tesouraria/components/pix/transacoes/shared/ConciliacaoExtratoDialog";
import type { ResultadoAnaliseExtrato } from "@/features/tesouraria/types/conciliacaoExtrato";

function criarResultadoExemplo(): ResultadoAnaliseExtrato {
  return {
    resumo: {
      totalLinhasExtrato: 5,
      totalPendenciasSistema: 2,
      totalMatchesExatos: 1,
      totalMatchesAproximados: 1,
      totalSemMatchExtrato: 3,
      totalSemMatchSistema: 0,
      valorTotalMatches: 120,
    },
    matches: [
      {
        pagamentoId: "pag-1",
        tipoMatch: "TXID_EXATO",
        alvoMatch: "TXID",
        confianca: 1,
        compradorNome: "Maria Silva",
        nomePagadorBanco: "MARIA SILVA",
        valorEsperado: 60,
        valorBanco: 60,
        numerosRifas: ["001", "002"],
        dataBanco: "2026-10-08T12:00:00Z",
        dataReserva: "2026-10-08T11:55:00Z",
      },
      {
        pagamentoId: "pag-2",
        tipoMatch: "NOME_VALOR_APROXIMADO",
        alvoMatch: "ADERIDO",
        confianca: 0.88,
        compradorNome: "Carlos Oliveira",
        vendedorNome: "João Aderido",
        nomePagadorBanco: "JOAO ADERIDO",
        valorEsperado: 60,
        valorBanco: 60,
        numerosRifas: ["003", "004"],
        dataBanco: "2026-10-08T12:05:00Z",
        dataReserva: "2026-10-08T11:59:00Z",
      },
    ],
    linhasNaoIdentificadas: [],
  };
}

describe("Componente: ConciliacaoExtratoDialog", () => {
  it("renderiza dropzone de upload e estado de carregamento quando sem resultado", () => {
    const onSelecionarArquivo = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <ConciliacaoExtratoDialog
        aberto
        onFechar={vi.fn()}
        arquivo={null}
        analisando={false}
        aprovando={false}
        resultado={null}
        selecionados={new Set()}
        erro={null}
        onSelecionarArquivo={onSelecionarArquivo}
        onToggleSelecao={vi.fn()}
        onToggleTodos={vi.fn()}
        onConfirmarAprovacao={vi.fn().mockResolvedValue(true)}
        onLimpar={vi.fn()}
        valorTotalSelecionado={0}
      />,
    );

    expect(
      screen.getByText(/Clique para selecionar ou arraste o extrato aqui/i),
    ).toBeInTheDocument();

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const arquivoTeste = new File(["txid,valor\n1,60"], "extrato.csv", {
      type: "text/csv",
    });
    fireEvent.change(fileInput, { target: { files: [arquivoTeste] } });
    expect(onSelecionarArquivo).toHaveBeenCalledWith(arquivoTeste);

    rerender(
      <ConciliacaoExtratoDialog
        aberto
        onFechar={vi.fn()}
        arquivo={arquivoTeste}
        analisando
        aprovando={false}
        resultado={null}
        selecionados={new Set()}
        erro={null}
        onSelecionarArquivo={onSelecionarArquivo}
        onToggleSelecao={vi.fn()}
        onToggleTodos={vi.fn()}
        onConfirmarAprovacao={vi.fn().mockResolvedValue(true)}
        onLimpar={vi.fn()}
        valorTotalSelecionado={0}
      />,
    );

    expect(
      screen.getByText(/Cruzando transações do extrato com o sistema/i),
    ).toBeInTheDocument();
  });

  it("renderiza cartões de resumo, tabela de matches e alterna seleção corretamente", () => {
    const onToggleSelecao = vi.fn();
    const onConfirmarAprovacao = vi.fn().mockResolvedValue(true);

    render(
      <ConciliacaoExtratoDialog
        aberto
        onFechar={vi.fn()}
        arquivo={null}
        analisando={false}
        aprovando={false}
        resultado={criarResultadoExemplo()}
        selecionados={new Set(["pag-1"])}
        erro={null}
        onSelecionarArquivo={vi.fn()}
        onToggleSelecao={onToggleSelecao}
        onToggleTodos={vi.fn()}
        onConfirmarAprovacao={onConfirmarAprovacao}
        onLimpar={vi.fn()}
        valorTotalSelecionado={60}
      />,
    );

    expect(screen.getByText("MATCHES EXATOS (TXID)")).toBeInTheDocument();
    expect(screen.getByText("MATCHES SUGERIDOS")).toBeInTheDocument();
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("Exato (txid)")).toBeInTheDocument();
    expect(screen.getByText("Pago por Aderido")).toBeInTheDocument();
    expect(screen.getByText(/Repasse do Aderido: João Aderido/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Carlos Oliveira"));
    expect(onToggleSelecao).toHaveBeenCalledWith("pag-2");

    const btnAprovar = screen.getByRole("button", { name: /Aprovar 1 Vendas/i });
    expect(btnAprovar).toBeEnabled();
    fireEvent.click(btnAprovar);
    expect(onConfirmarAprovacao).toHaveBeenCalledTimes(1);
  });

  it("exibe aviso quando não há matches conciliáveis", () => {
    const resultadoVazio = criarResultadoExemplo();
    resultadoVazio.matches = [];

    render(
      <ConciliacaoExtratoDialog
        aberto
        onFechar={vi.fn()}
        arquivo={null}
        analisando={false}
        aprovando={false}
        resultado={resultadoVazio}
        selecionados={new Set()}
        erro={null}
        onSelecionarArquivo={vi.fn()}
        onToggleSelecao={vi.fn()}
        onToggleTodos={vi.fn()}
        onConfirmarAprovacao={vi.fn().mockResolvedValue(true)}
        onLimpar={vi.fn()}
        valorTotalSelecionado={0}
      />,
    );

    expect(
      screen.getByText(/Nenhuma compra pendente pôde ser conciliada/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Aprovar 0 Vendas/i }),
    ).toBeDisabled();
  });
});
