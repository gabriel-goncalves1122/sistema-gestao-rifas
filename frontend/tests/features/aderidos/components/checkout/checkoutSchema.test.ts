// ============================================================================
// ARQUIVO: frontend/tests/features/rifas/utils/checkoutSchema.test.ts
// ============================================================================
import { describe, expect, it } from "vitest";

import { checkoutSchema } from "@/features/aderidos/components/checkout/checkoutSchema";

describe("Schema: checkoutSchema", () => {
  it("Deve validar dados corretos do checkout", async () => {
    const dadosValidos = {
      nome: "Ana Beatriz",
      telefone: "(35) 99999-8888",
      email: "ana@email.com",
      documento: "123.456.789-09",
    };

    await expect(checkoutSchema.validate(dadosValidos)).resolves.toEqual(
      dadosValidos,
    );
  });

  it("Deve validar CNPJ matematicamente válido", async () => {
    const dadosCnpjValido = {
      nome: "Empresa Parceira",
      telefone: "(35) 99999-8888",
      email: "contato@empresa.com.br",
      documento: "11.222.333/0001-81",
    };

    await expect(checkoutSchema.validate(dadosCnpjValido)).resolves.toEqual(
      dadosCnpjValido,
    );
  });

  it("Deve exigir e-mail obrigatorio", async () => {
    const dadosSemEmail = {
      nome: "Ana Beatriz",
      telefone: "(35) 99999-8888",
      email: "",
      documento: "12345678909",
    };

    await expect(checkoutSchema.validate(dadosSemEmail)).rejects.toThrow(
      "O e-mail é obrigatório"
    );
  });

  it("Deve exigir CPF obrigatório", async () => {
    const dadosSemDocumento = {
      nome: "Ana Beatriz",
      telefone: "(35) 99999-8888",
      email: "",
      documento: "",
    };

    await expect(checkoutSchema.validate(dadosSemDocumento)).rejects.toThrow(
      "Informe o CPF ou CNPJ do pagador."
    );
  });

  it("Deve rejeitar CPF incompleto", async () => {
    const dadosInvalidos = {
      nome: "Ana Beatriz",
      telefone: "(35) 99999-8888",
      documento: "123.456",
    };

    await expect(checkoutSchema.validate(dadosInvalidos)).rejects.toThrow(
      "Documento incompleto. Use 11 dígitos (CPF) ou 14 dígitos (CNPJ).",
    );
  });

  it("Deve rejeitar CPF com dígito verificador inválido ou números repetidos", async () => {
    const cpfDigitoErrado = {
      nome: "Ana Beatriz",
      telefone: "(35) 99999-8888",
      email: "ana@email.com",
      documento: "123.456.789-11",
    };

    await expect(checkoutSchema.validate(cpfDigitoErrado)).rejects.toThrow(
      "CPF ou CNPJ inválido. Verifique os dígitos informados.",
    );

    const cpfRepetido = {
      nome: "Ana Beatriz",
      telefone: "(35) 99999-8888",
      email: "ana@email.com",
      documento: "111.111.111-11",
    };

    await expect(checkoutSchema.validate(cpfRepetido)).rejects.toThrow(
      "CPF ou CNPJ inválido. Verifique os dígitos informados.",
    );
  });

  it("Não deve exigir comprovante do Pix no fluxo novo", async () => {
    const dadosSemComprovante = {
      nome: "Ana Beatriz",
      telefone: "(35) 99999-8888",
      email: "ana@email.com",
      documento: "12345678909",
    };

    await expect(checkoutSchema.validate(dadosSemComprovante)).resolves.toEqual(
      dadosSemComprovante,
    );
  });

  it("Deve exigir o nome do comprador", async () => {
    const dadosInvalidos = {
      nome: "",
      telefone: "(35) 99999-8888",
      email: "ana@email.com",
      documento: "12345678909",
    };

    await expect(checkoutSchema.validate(dadosInvalidos)).rejects.toThrow(
      "Informe o nome completo do comprador.",
    );
  });

  it("Deve exigir o WhatsApp do comprador", async () => {
    const dadosInvalidos = {
      nome: "Ana Beatriz",
      telefone: "",
      email: "ana@email.com",
      documento: "12345678909",
    };

    await expect(checkoutSchema.validate(dadosInvalidos)).rejects.toThrow(
      "Informe o WhatsApp do comprador.",
    );
  });

  it("Deve rejeitar telefone incompleto", async () => {
    const dadosInvalidos = {
      nome: "Ana Beatriz",
      telefone: "(35) 9999",
      email: "ana@email.com",
      documento: "12345678909",
    };

    await expect(checkoutSchema.validate(dadosInvalidos)).rejects.toThrow(
      "Telefone incompleto. Use o formato (35) 99999-9999.",
    );
  });

  it("Deve rejeitar e-mail inválido ou com TLD incompleto", async () => {
    const dadosInvalidos = {
      nome: "Ana Beatriz",
      telefone: "(35) 99999-8888",
      email: "email-invalido",
      documento: "12345678909",
    };

    await expect(checkoutSchema.validate(dadosInvalidos)).rejects.toThrow(
      "Formato de e-mail inválido.",
    );

    const emailTldCurto = {
      nome: "Ana Beatriz",
      telefone: "(35) 99999-8888",
      email: "ana@gmail.c",
      documento: "12345678909",
    };

    await expect(checkoutSchema.validate(emailTldCurto)).rejects.toThrow(
      "Formato de e-mail inválido.",
    );
  });
});
