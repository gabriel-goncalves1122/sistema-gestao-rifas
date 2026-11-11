import { describe, it, expect } from "vitest";
import {
  formatarCpf,
  formatarInteiro,
  formatarMoeda,
  formatarValorEixo,
  gerarSlug,
  normalizarTexto,
  somenteNumeros,
} from "@/shared/utils/formatadores";

describe("Utilitários: formatadores", () => {
  it("Deve normalizar removendo acentos, espaços extras e convertendo para minúsculas", () => {
    expect(normalizarTexto("  Ação de Graças ÉPICA  ")).toBe(
      "acao de gracas epica",
    );
    expect(normalizarTexto(null)).toBe("");
  });

  it("Deve gerar slugs hifenizados seguros a partir de títulos e nomes", () => {
    expect(gerarSlug("Tesouraria & Caixa / 2026!")).toBe(
      "tesouraria-caixa-2026",
    );
    expect(gerarSlug("   João Pedro da Silva  ")).toBe("joao-pedro-da-silva");
    expect(gerarSlug(undefined)).toBe("");
  });

  it("Deve formatar CPF progressivamente e truncar em 11 dígitos", () => {
    expect(formatarCpf("12345678901999")).toBe("123.456.789-01");
    expect(formatarCpf("123456")).toBe("123.456");
    expect(somenteNumeros("123.456.789-01")).toBe("12345678901");
  });

  it("Deve formatar moeda em BRL, inteiros em pt-BR e rótulos compactos de eixo", () => {
    expect(formatarMoeda(1250)).toContain("1.250,00");
    expect(formatarMoeda(null)).toContain("0,00");
    expect(formatarInteiro(1500)).toBe("1.500");
    expect(formatarInteiro(undefined)).toBe("0");
    expect(formatarValorEixo(500)).toBe("R$ 500");
    expect(formatarValorEixo(2500)).toBe("R$ 3 mil");
  });
});
