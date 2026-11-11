import { describe, it, expect } from "vitest";
import { colors } from "@/shared/tokens/colors";
import {
  calcularDadosExibicaoItemRanking,
  obterCorPosicaoRanking,
} from "@/features/tesouraria/utils/desempenhoRankingUtils";

describe("Utilitários: desempenhoRankingUtils", () => {
  it("Deve retornar cores de pódio para Top 3 e cinza padrão a partir da 4ª posição", () => {
    expect(obterCorPosicaoRanking(1)).toBe("#D4AF37");
    expect(obterCorPosicaoRanking(2)).toBe("#9E9E9E");
    expect(obterCorPosicaoRanking(3)).toBe("#CD7F32");
    expect(obterCorPosicaoRanking(4)).toBe(colors.cinzaTexto);
  });

  it("Deve calcular corretamente flags de exibição, rifas restantes e diferença bruto/líquido", () => {
    const top1 = calcularDadosExibicaoItemRanking(
      {
        posicao: 1,
        cpfLabel: "111.***.***-00",
        rifasVendidas: 35,
        arrecadado: 700,
        arrecadadoLiquido: 693,
        valorPix: 500,
        valorComprovante: 200,
      },
      50,
    );

    expect(top1).toEqual({
      ehTop3: true,
      corPosicao: "#D4AF37",
      cpfExibicao: "111.***.***-00",
      rifasVendidas: 35,
      rifasRestantes: 15,
      temSplitValores: true,
      valorLiquido: 693,
      temDiferencaBrutoLiquido: true,
    });

    const comum = calcularDadosExibicaoItemRanking({
      posicao: 5,
      arrecadado: 100,
    });

    expect(comum).toEqual({
      ehTop3: false,
      corPosicao: colors.cinzaTexto,
      cpfExibicao: "-",
      rifasVendidas: 0,
      rifasRestantes: 50,
      temSplitValores: false,
      valorLiquido: 100,
      temDiferencaBrutoLiquido: false,
    });
  });
});
