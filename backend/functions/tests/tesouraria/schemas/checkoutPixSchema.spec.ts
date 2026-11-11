import { describe, expect, it } from "@jest/globals";
import { checkoutPixSchema } from "../../../src/modules/tesouraria/schemas/checkoutPixSchema";

describe("Schema: checkoutPixSchema", () => {
  it("deve validar com sucesso um payload completo (Mercado Pago)", async () => {
    const payload = {
      nome: "Carlos Silva",
      telefone: "35999998888",
      email: "carlos@exemplo.com",
      documento: "12345678909",
      numerosRifas: ["001", "002"],
    };

    const resultado = await checkoutPixSchema.validate(payload);
    expect(resultado.nome).toBe("Carlos Silva");
    expect(resultado.documento).toBe("12345678909");
  });

  it("deve validar com sucesso um payload sem documento e sem email (Nova API / EMV)", async () => {
    const payload = {
      nome: "Mariana Souza",
      telefone: "35988887777",
      numerosRifas: ["010"],
    };

    const resultado = await checkoutPixSchema.validate(payload);
    expect(resultado.nome).toBe("Mariana Souza");
    expect(resultado.telefone).toBe("35988887777");
    expect(resultado.documento).toBeUndefined();
    expect(resultado.email).toBeUndefined();
  });

  it("deve rejeitar se documento for informado mas tiver formato inválido", async () => {
    const payload = {
      nome: "Mariana Souza",
      telefone: "35988887777",
      documento: "12345",
      numerosRifas: ["010"],
    };

    await expect(checkoutPixSchema.validate(payload)).rejects.toThrow(
      "CPF ou CNPJ inválido",
    );
  });

  it("deve rejeitar se email for informado mas tiver formato inválido", async () => {
    const payload = {
      nome: "Mariana Souza",
      telefone: "35988887777",
      email: "email-invalido",
      numerosRifas: ["010"],
    };

    await expect(checkoutPixSchema.validate(payload)).rejects.toThrow(
      "E-mail inválido",
    );
  });

  it("deve rejeitar se faltar nome ou telefone", async () => {
    await expect(
      checkoutPixSchema.validate({
        telefone: "35988887777",
        numerosRifas: ["010"],
      }),
    ).rejects.toThrow("Nome do comprador é obrigatório");

    await expect(
      checkoutPixSchema.validate({
        nome: "Mariana",
        numerosRifas: ["010"],
      }),
    ).rejects.toThrow("Telefone do comprador é obrigatório");
  });
});
