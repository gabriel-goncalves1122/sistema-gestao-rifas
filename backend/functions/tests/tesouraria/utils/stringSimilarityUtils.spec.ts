import {
  normalizarNomeParaComparacao,
  calcularSimilaridadeDice,
  calcularSimilaridadeAderente,
} from "../../../src/modules/tesouraria/utils/stringSimilarityUtils";

describe("stringSimilarityUtils", () => {
  describe("normalizarNomeParaComparacao", () => {
    it("deve remover acentos, pontuações e colocar em caixa alta", () => {
      const entrada = "  João da Silva (São Paulo) - Comprador!  ";
      const esperado = "JOAO DA SILVA SAO PAULO COMPRADOR";
      expect(normalizarNomeParaComparacao(entrada)).toBe(esperado);
    });

    it("deve retornar vazio se string for nula ou vazia", () => {
      expect(normalizarNomeParaComparacao("")).toBe("");
    });
  });

  describe("calcularSimilaridadeDice", () => {
    it("deve retornar 1.0 para strings idênticas", () => {
      expect(calcularSimilaridadeDice("JOAO SILVA", "JOAO SILVA")).toBe(1);
      expect(calcularSimilaridadeDice("João da Silva", "joao da silva")).toBe(1);
    });

    it("deve retornar alta similaridade para nomes com pequenas variações", () => {
      const score = calcularSimilaridadeDice("MARIA SILVA SANTOS", "MARIA DA SILVA SANTOS");
      expect(score).toBeGreaterThan(0.75);
    });

    it("deve identificar match para comprador vs aderido com grafia próxima", () => {
      const score = calcularSimilaridadeDice("FABIANA MENEGATTI", "FABIANA MENEGATI");
      expect(score).toBeGreaterThan(0.85);
    });

    it("deve retornar baixa similaridade para nomes completamente distintos", () => {
      const score = calcularSimilaridadeDice("CARLOS ALBERTO PEREIRA", "JULIANA RODRIGUES LIMA");
      expect(score).toBeLessThan(0.3);
    });

    it("deve retornar 0 para strings vazias", () => {
      expect(calcularSimilaridadeDice("", "JOAO")).toBe(0);
      expect(calcularSimilaridadeDice("A", "B")).toBe(0);
    });
  });

  describe("calcularSimilaridadeAderente", () => {
    it("deve retornar 1.0 para nomes idênticos após normalização", () => {
      expect(calcularSimilaridadeAderente("Gabriel Gonçalves Sampaio", "GABRIEL GONCALVES SAMPAIO")).toBe(1);
    });

    it("deve atribuir score alto (mínimo 0.95) quando houver omissão de sobrenome do meio mas primeiro e último coincidirem", () => {
      const score = calcularSimilaridadeAderente("Gabriel Sampaio", "Gabriel Gonçalves Sampaio");
      expect(score).toBeGreaterThanOrEqual(0.95);
    });

    it("deve retornar 0 para strings vazias", () => {
      expect(calcularSimilaridadeAderente("", "Gabriel")).toBe(0);
    });
  });
});
