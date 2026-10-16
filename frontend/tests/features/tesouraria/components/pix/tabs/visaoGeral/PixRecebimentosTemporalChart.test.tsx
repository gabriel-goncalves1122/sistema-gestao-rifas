import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PixRecebimentosTemporalChart } from "@/features/tesouraria/components/pix/tabs/visaoGeral/PixRecebimentosTemporalChart";
import { pixTransacoesMock } from "@/features/tesouraria/mocks/pixTransacoesMock";
import { calcularResumoPixTransacoes } from "@/features/tesouraria/utils/pixTransacoesUtils";
import { montarDadosTemporaisPix } from "@/features/tesouraria/utils/pixVisaoGeralUtils";

vi.mock("recharts", async () => {
  const OriginalRecharts = await vi.importActual<any>("recharts");

  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 320 }}>{children}</div>
    ),
  };
});

describe("Componente: PixRecebimentosTemporalChart", () => {
  it("Deve renderizar título, texto explicativo e métricas no desktop", () => {
    render(
      <PixRecebimentosTemporalChart
        dadosTemporais={montarDadosTemporaisPix(pixTransacoesMock)}
        isMobile={false}
        resumo={calcularResumoPixTransacoes(pixTransacoesMock)}
      />,
    );

    expect(screen.getByText("Recebimentos ao longo do tempo")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Evolução diária dos Pix recebidos, pendentes e pontos que exigem conciliação./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Pagas")).toBeInTheDocument();
    expect(screen.getByText("Comprovantes")).toBeInTheDocument();
  });

  it("Deve renderizar empty state quando não houver dados temporais", () => {
    render(
      <PixRecebimentosTemporalChart
        dadosTemporais={[]}
        isMobile={false}
        resumo={calcularResumoPixTransacoes([])}
      />,
    );

    expect(
      screen.getByText("Nenhuma transação carregada para análise temporal"),
    ).toBeInTheDocument();
  });
});
