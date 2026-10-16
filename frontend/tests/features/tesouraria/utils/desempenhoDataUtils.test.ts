import { describe, expect, it } from "vitest";

import {
  montarOrigem,
  montarRankingAderidos,
  montarReceitaPorDia,
  montarStatus,
  RESUMO_GERAL_DESEMPENHO_VAZIO,
} from "@/features/tesouraria/utils/desempenhoDataUtils";
import {
  AderidoMetricaDesempenho,
  ResumoGeralDesempenho,
  TransacaoDesempenho,
} from "@/features/tesouraria/types/desempenho";

describe("Utils: desempenhoDataUtils", () => {
  it("Deve montar receita por dia distinguindo arrecadação Pix e Comprovantes", () => {
    const transacoes: TransacaoDesempenho[] = [
      {
        status: "pago",
        dataReserva: "2026-10-01T10:00:00Z",
        valorTotal: 50,
        origem: "PIX",
      },
      {
        status: "pago",
        dataReserva: "2026-10-01T14:00:00Z",
        valorTotal: 30,
        origem: "COMPROVANTE",
      },
      {
        status: "pendente",
        dataReserva: "2026-10-01T15:00:00Z",
        valorTotal: 20,
        origem: "PIX",
      },
    ];

    const receita = montarReceitaPorDia(transacoes);

    expect(receita).toHaveLength(1);
    expect(receita[0].valorPix).toBe(50);
    expect(receita[0].valorComprovante).toBe(30);
    expect(receita[0].valor).toBe(80);
  });

  it("Deve calcular status das rifas incluindo contagem e barra de recusadas quando existirem", () => {
    const transacoes: TransacaoDesempenho[] = [
      { status: "pago", dataReserva: "2026-10-01", valorTotal: 10 },
      { status: "pendente", dataReserva: "2026-10-01", valorTotal: 10 },
      { status: "recusado", dataReserva: "2026-10-01", valorTotal: 10 },
    ];

    const status = montarStatus(transacoes);

    expect(status.pagas).toBe(1);
    expect(status.pendentes).toBe(1);
    expect(status.recusadas).toBe(1);
    expect(status.total).toBe(3);
    expect(status.barras.some((b) => b.label === "Recusadas")).toBe(true);
  });

  it("Deve montar barras comparativas de origem de vendas", () => {
    const resumo: ResumoGeralDesempenho = {
      ...RESUMO_GERAL_DESEMPENHO_VAZIO,
      rifasPagasPix: 120,
      rifasPagasComprovante: 30,
    };

    const origem = montarOrigem(resumo);

    expect(origem.total).toBe(150);
    expect(origem.barras[0].valor).toBe(120);
    expect(origem.barras[1].valor).toBe(30);
  });

  it("Deve ordenar e calcular ranking de aderidos por arrecadação e percentual de meta", () => {
    const aderidos: AderidoMetricaDesempenho[] = [
      { id: "1", nome: "B", arrecadado: 600, meta: 1200 },
      { id: "2", nome: "A", arrecadado: 1200, meta: 1200 },
    ];

    const ranking = montarRankingAderidos(aderidos);

    expect(ranking[0].nome).toBe("A");
    expect(ranking[0].posicao).toBe(1);
    expect(ranking[0].percentualMeta).toBe(100);
    expect(ranking[0].bateuMeta).toBe(true);

    expect(ranking[1].nome).toBe("B");
    expect(ranking[1].posicao).toBe(2);
    expect(ranking[1].percentualMeta).toBe(50);
    expect(ranking[1].bateuMeta).toBe(false);
  });
});
