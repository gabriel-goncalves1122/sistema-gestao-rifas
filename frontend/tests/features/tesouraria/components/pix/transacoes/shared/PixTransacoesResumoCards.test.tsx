import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PixTransacoesResumoCards } from "@/features/tesouraria/components/pix/transacoes/shared/PixTransacoesResumoCards";
import { PixTransacoesResumo } from "../../../../../types/pixTransacoes";

const resumoMock: PixTransacoesResumo = {
  totalRecebido: 50,
  totalPendente: 10,
  totalCancelado: 10,
  totalDivergente: 20,
  quantidadePagas: 2,
  quantidadeAguardando: 1,
  quantidadeCanceladas: 1,
  quantidadeNaoIdentificadas: 1,
  quantidadeAguardandoValidacao: 2,
  quantidadeAceitas: 3,
  quantidadeNegadas: 1,
  quantidadeSemConfirmacaoBancaria: 1,
  quantidadeComRifas: 4,
  quantidadeSemVinculo: 2,
  ticketMedio: 25,
};

describe("Componente: PixTransacoesResumoCards", () => {
  it("Deve renderizar os cards de resumo Pix", () => {
    render(<PixTransacoesResumoCards resumo={resumoMock} />);

    expect(screen.getByText("Total Recebido (Líq.)")).toBeInTheDocument();
    expect(screen.getByText("Ticket Médio")).toBeInTheDocument();
    expect(screen.getByText("Aguardando Pagamento")).toBeInTheDocument();
    expect(screen.getByText("Canceladas/Erros")).toBeInTheDocument();
  });

  it("Deve mostrar as quantidades relevantes para tesouraria", () => {
    render(<PixTransacoesResumoCards resumo={resumoMock} />);

    expect(
      screen.getByText("2 pagamentos confirmados"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Gasto médio por pix pago"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Total pendente: R$ 10,00"),
    ).toBeInTheDocument();
  });
});
