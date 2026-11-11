import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PixTransacaoDetalhesDialog } from "@/features/tesouraria/components/pix/transacoes/shared/PixTransacaoDetalhesDialog";
import { useTesourariaLayout } from "@/features/tesouraria/hooks/useTesourariaLayout";
import { PixTransacao } from "@/features/tesouraria/types/pixTransacoes";

vi.mock("@/features/tesouraria/hooks/useTesourariaLayout", () => ({
  useTesourariaLayout: vi.fn(),
}));

const transacaoExemplo: PixTransacao = {
  id: "tx_det_001",
  pixOrderId: "ORDE_DET_001",
  metodo: "PIX",
  statusPagamento: "PAID",
  valorBruto: 40,
  valorPago: 40,
  moeda: "BRL",
  dataCriacao: "2026-10-15T10:00:00.000-03:00",
  dataPagamento: "2026-10-15T10:05:00.000-03:00",
  compradorNome: "Maria Clara",
  compradorEmail: "maria@email.com",
  compradorTelefone: "35998887777",
  compradorDocumento: "123.456.789-00",
  aderido: {
    id: "ADERIDO_1",
    nome: "João Vendedor",
    modalidade_adesao: "completo",
  },
  rifas: [
    { numero: "001", status: "reservado" },
    { numero: "002", status: "reservado" },
  ],
  origem: "COMPROVANTE",
  comprovanteUrl: "https://exemplo.com/comprovante.png",
};

describe("Componente: PixTransacaoDetalhesDialog", () => {
  beforeEach(() => {
    vi.mocked(useTesourariaLayout).mockReturnValue({
      isMobile: false,
      isDesktop: true,
    } as any);
  });

  it("Deve renderizar split-view no desktop com dados da compra, visualizador e ações", () => {
    render(
      <PixTransacaoDetalhesDialog
        transacao={transacaoExemplo}
        onClose={vi.fn()}
        onAceitar={vi.fn()}
        onNegar={vi.fn()}
      />,
    );

    expect(screen.getByTestId("pix-detalhes-split-view")).toBeInTheDocument();
    expect(screen.getByText("Comprovante")).toBeInTheDocument();
    expect(screen.getByText("Maria Clara")).toBeInTheDocument();
    expect(screen.getByText("maria@email.com")).toBeInTheDocument();
    expect(screen.getByText("35998887777")).toBeInTheDocument();
    expect(screen.getByText("123.456.789-00")).toBeInTheDocument();
    expect(screen.getByText("João Vendedor")).toBeInTheDocument();
    expect(screen.getByText("001, 002")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*40,00/)).toBeInTheDocument();
    expect(screen.getByText("ORDE_DET_001")).toBeInTheDocument();

    expect(
      screen.getByAltText("Comprovante de pagamento"),
    ).toHaveAttribute("src", "https://exemplo.com/comprovante.png");

    expect(
      screen.getByRole("button", { name: /aceitar pagamento/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /negar/i })).toBeInTheDocument();
  });

  it("Deve exibir estado vazio no visualizador quando não houver comprovante anexado", () => {
    render(
      <PixTransacaoDetalhesDialog
        transacao={{
          ...transacaoExemplo,
          origem: "PIX",
          comprovanteUrl: null,
        }}
        onClose={vi.fn()}
        onAceitar={vi.fn()}
        onNegar={vi.fn()}
      />,
    );

    expect(screen.getByText("Pix")).toBeInTheDocument();
    expect(screen.getByText("Nenhum comprovante anexado")).toBeInTheDocument();
  });

  it("Deve acionar onAceitar e fechar diálogo ao aprovar pagamento", async () => {
    const onAceitar = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <PixTransacaoDetalhesDialog
        transacao={transacaoExemplo}
        onClose={onClose}
        onAceitar={onAceitar}
        onNegar={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /aceitar pagamento/i }));

    await vi.waitFor(() => {
      expect(onAceitar).toHaveBeenCalledWith("tx_det_001", undefined);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("Não deve renderizar nada quando transacao for null", () => {
    const { container } = render(
      <PixTransacaoDetalhesDialog
        transacao={null}
        onClose={vi.fn()}
        onAceitar={vi.fn()}
        onNegar={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
