import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PixResumoConsolidado } from "@/features/tesouraria/components/pix/tabs/visaoGeral/PixResumoConsolidado";
import { PixTransacoesResumo } from "@/features/tesouraria/types/pixTransacoes";
import { RESUMO_PIX_TRANSACOES_VAZIO } from "@/features/tesouraria/utils/pixTransacoesUtils";

describe("Componente: PixResumoConsolidado", () => {
  it("Deve renderizar os 3 canais consolidados (Total Geral, Pix e Comprovantes)", () => {
    const resumo: PixTransacoesResumo = {
      ...RESUMO_PIX_TRANSACOES_VAZIO,
      totalRecebido: 99,
      pixRecebidoLiquido: 99,
      pixRecebidoBruto: 100,
      pixRifasPagas: 10,
      pixValorAguardandoBruto: 30,

      comprovantesValorRecebido: 200,
      comprovantesRifasPagas: 20,
      comprovantesTransacoesPagas: 2,
      comprovantesValorPendente: 50,

      totalGeralRecebidoLiquido: 299,
      totalGeralRecebidoBruto: 300,
      totalGeralRifasPagas: 30,
      totalGeralRifasPendentes: 8,
    };

    render(<PixResumoConsolidado resumo={resumo} />);

    expect(
      screen.getByText("TOTAL GERAL CONSOLIDADO"),
    ).toBeInTheDocument();
    expect(screen.getByText("PIX AUTOMATIZADO")).toBeInTheDocument();
    expect(screen.getByText("COMPROVANTES MANUAIS")).toBeInTheDocument();

    expect(screen.getByText("R$ 299,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 99,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 200,00")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });
});
