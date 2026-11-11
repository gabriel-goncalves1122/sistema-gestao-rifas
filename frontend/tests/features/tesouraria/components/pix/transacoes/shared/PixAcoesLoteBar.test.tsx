import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PixAcoesLoteBar } from "@/features/tesouraria/components/pix/transacoes/shared/PixAcoesLoteBar";
import { PixTransacao } from "@/features/tesouraria/types/pixTransacoes";

const transacoesSelecionadas: PixTransacao[] = [
  {
    id: "tx_1",
    metodo: "PIX",
    statusPagamento: "PAID",
    valorBruto: 20,
    valorPago: 20,
    moeda: "BRL",
    dataCriacao: "2026-10-15T10:00:00.000-03:00",
    chaveAcao: "chave_1",
  },
  {
    id: "tx_2",
    metodo: "PIX",
    statusPagamento: "IN_ANALYSIS",
    valorBruto: 30,
    valorPago: 0,
    moeda: "BRL",
    dataCriacao: "2026-10-15T11:00:00.000-03:00",
    origem: "COMPROVANTE",
    chaveAcao: "chave_2",
  },
];

describe("Componente: PixAcoesLoteBar", () => {
  it("Não deve renderizar quando nenhuma transação estiver selecionada", () => {
    const { container } = render(
      <PixAcoesLoteBar
        transacoesSelecionadas={[]}
        onAceitarLote={vi.fn()}
        onNegarLote={vi.fn()}
        onLimparSelecao={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("Deve exibir contagem, valor total e chamar onAceitarLote", async () => {
    const onAceitarLote = vi.fn().mockResolvedValue({
      sucesso: true,
      processadas: 2,
      ignoradas: 0,
      erros: [],
    });
    const onLimparSelecao = vi.fn();
    const onConcluido = vi.fn();

    render(
      <PixAcoesLoteBar
        transacoesSelecionadas={transacoesSelecionadas}
        onAceitarLote={onAceitarLote}
        onNegarLote={vi.fn()}
        onLimparSelecao={onLimparSelecao}
        onConcluido={onConcluido}
      />,
    );

    expect(screen.getByText(/2 selecionadas \(R\$\s*50,00\)/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /aceitar selecionadas/i }),
    );

    await waitFor(() => {
      expect(onAceitarLote).toHaveBeenCalledWith([
        { id: "tx_1", chaveAcao: "chave_1" },
        { id: "tx_2", chaveAcao: "chave_2" },
      ]);
      expect(onLimparSelecao).toHaveBeenCalled();
      expect(onConcluido).toHaveBeenCalled();
    });
  });

  it("Deve abrir diálogo de motivo e chamar onNegarLote ao confirmar", async () => {
    const onNegarLote = vi.fn().mockResolvedValue({
      sucesso: true,
      processadas: 2,
      ignoradas: 0,
      erros: [],
    });
    const onLimparSelecao = vi.fn();

    render(
      <PixAcoesLoteBar
        transacoesSelecionadas={transacoesSelecionadas}
        onAceitarLote={vi.fn()}
        onNegarLote={onNegarLote}
        onLimparSelecao={onLimparSelecao}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /negar selecionadas/i }),
    );

    const inputMotivo = screen.getByLabelText("Motivo da recusa em lote");
    fireEvent.change(inputMotivo, { target: { value: "Comprovante ilegível" } });

    fireEvent.click(
      screen.getByRole("button", { name: /confirmar recusa em lote/i }),
    );

    await waitFor(() => {
      expect(onNegarLote).toHaveBeenCalledWith(
        [
          { id: "tx_1", chaveAcao: "chave_1" },
          { id: "tx_2", chaveAcao: "chave_2" },
        ],
        "Comprovante ilegível",
      );
      expect(onLimparSelecao).toHaveBeenCalled();
    });
  });
});
