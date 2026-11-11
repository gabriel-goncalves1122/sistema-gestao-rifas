import { describe, expect, it } from "vitest";

import {
  aplicarMascaraCpfCnpj,
  aplicarMascaraTelefone,
  calcularValorTotalRifas,
} from "@/features/aderidos/components/checkout/utils/checkoutUtils";
import { VALOR_RIFA } from "@/features/aderidos/utils/constants";

describe("Utils: checkoutUtils", () => {
  it("calculates total value proportionally to selected tickets", () => {
    expect(calcularValorTotalRifas([])).toBe(0);
    expect(calcularValorTotalRifas(["001", "002", "003"])).toBe(3 * VALOR_RIFA);
  });

  it("applies progressive CPF mask up to 11 digits and CNPJ mask for 12-14 digits", () => {
    expect(aplicarMascaraCpfCnpj("")).toBe("");
    expect(aplicarMascaraCpfCnpj("123")).toBe("123");
    expect(aplicarMascaraCpfCnpj("123456")).toBe("123.456");
    expect(aplicarMascaraCpfCnpj("123456789")).toBe("123.456.789");
    expect(aplicarMascaraCpfCnpj("12345678901")).toBe("123.456.789-01");

    expect(aplicarMascaraCpfCnpj("123456780001")).toBe("12.345.678/0001");
    expect(aplicarMascaraCpfCnpj("12345678000199")).toBe("12.345.678/0001-99");
    expect(aplicarMascaraCpfCnpj("12.345.678/0001-9988")).toBe(
      "12.345.678/0001-99",
    );
  });

  it("re-exports aplicarMascaraTelefone consistently with shared formatter", () => {
    expect(aplicarMascaraTelefone("35999998888")).toBe("(35) 99999-8888");
  });
});
