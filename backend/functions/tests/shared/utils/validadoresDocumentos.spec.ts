// ============================================================================
// ARQUIVO: backend/functions/tests/shared/utils/validadoresDocumentos.spec.ts
// ============================================================================

import { describe, expect, it } from "@jest/globals";

import {
  validarCnpj,
  validarCpf,
  validarDocumentoPix,
  validarEmailPix,
} from "../../../src/shared/utils/validadoresDocumentos";

describe("Utils: validadoresDocumentos", () => {
  it("Deve validar CPF matematicamente válido e rejeitar dígitos inválidos ou repetidos", () => {
    expect(validarCpf("123.456.789-09")).toBe(true);
    expect(validarDocumentoPix("12345678909")).toBe(true);
    expect(validarCpf("12345678911")).toBe(false);
    expect(validarCpf("11111111111")).toBe(false);
    expect(validarCpf("00000000000")).toBe(false);
    expect(validarDocumentoPix("12345")).toBe(false);
  });

  it("Deve validar CNPJ matematicamente válido e rejeitar dígitos inválidos ou repetidos", () => {
    expect(validarCnpj("11.222.333/0001-81")).toBe(true);
    expect(validarDocumentoPix("11222333000181")).toBe(true);
    expect(validarCnpj("11.222.333/0001-44")).toBe(false);
    expect(validarCnpj("11111111111111")).toBe(false);
  });

  it("Deve validar e-mail com domínio e TLD válidos", () => {
    expect(validarEmailPix("comprador@gmail.com")).toBe(true);
    expect(validarEmailPix("comprador@unifei.edu.br")).toBe(true);
    expect(validarEmailPix("comprador@gmail.c")).toBe(false);
    expect(validarEmailPix("comprador@gmail")).toBe(false);
  });
});
