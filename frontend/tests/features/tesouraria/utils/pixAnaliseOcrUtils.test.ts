import { describe, expect, it } from "vitest";

import { AnaliseOcrDTO } from "@/features/tesouraria/types/pixTransacoes";
import {
  formatarAlertaOcr,
  formatarValorCentavosOcr,
  obterConfigVisualAnaliseOcr,
} from "@/features/tesouraria/utils/pixAnaliseOcrUtils";

const analiseBase: AnaliseOcrDTO = {
  statusExecucao: "CONCLUIDO",
  veredicto: "CORRELACAO_FORTE",
  score: 95,
  txidBate: true,
  valorBate: true,
  recebedorBate: true,
  e2eUnico: true,
  bancoDetectado: "NUBANK",
  txidLido: "RIFA123456",
  e2eIdDetectado: "E18236120202611121705ABC12345678",
  valorLidoCentavos: 2000,
  dataTransacaoIso: "2026-11-12T14:05:00-03:00",
  recebedorDetectado: "COMISSAO FORMATURA UNIFEI",
  cnpjRecebedorDetectado: "54789437000185",
  alertas: [],
  motivos: ["TXID correspondente"],
  tempoMs: 40,
  analisadoEm: "2026-11-12T17:06:00.000Z",
};

describe("Utilitários: pixAnaliseOcrUtils", () => {
  it("deve retornar configuração visual com score para CORRELACAO_FORTE", () => {
    const visual = obterConfigVisualAnaliseOcr(analiseBase);

    expect(visual.labelCurto).toBe("Forte 95%");
    expect(visual.labelCompleto).toBe("Correlação Forte");
  });

  it("deve retornar Sem OCR quando análise for null", () => {
    const visual = obterConfigVisualAnaliseOcr(null);

    expect(visual.labelCurto).toBe("Sem OCR");
    expect(visual.labelCompleto).toBe("Aguardando Análise OCR");
  });

  it("deve retornar Erro OCR quando statusExecucao for ERRO", () => {
    const visual = obterConfigVisualAnaliseOcr({
      ...analiseBase,
      statusExecucao: "ERRO",
      veredicto: null,
      score: null,
    });

    expect(visual.labelCurto).toBe("Erro OCR");
  });

  it("deve traduzir códigos de alerta e formatar centavos corretamente", () => {
    expect(formatarAlertaOcr("E2E_DUPLICADO")).toBe(
      "E2E ID já utilizado em outro pagamento",
    );
    expect(formatarValorCentavosOcr(2550)).toContain("25,50");
    expect(formatarValorCentavosOcr(null)).toBe("Não identificado");
  });
});
