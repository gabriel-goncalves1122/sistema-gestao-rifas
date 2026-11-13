import { describe, expect, it } from "@jest/globals";

import {
  calcularValorPixCentavos,
  dataExpiracaoPix,
  isReservaBilheteExpirada,
  isRifaDisponivelParaPix,
  mapearStatusCheckoutPix,
  montarIdempotencyKeyPix,
  normalizarDadosCheckoutPix,
} from "../../../src/modules/tesouraria/helpers/checkoutPixHelper";

describe("Helper: checkoutPixHelper", () => {
  it("Deve normalizar payload de checkout Pix", () => {
    const dados = normalizarDadosCheckoutPix({
      nome: " Maria ",
      telefone: "(35) 99999-0000",
      email: " MARIA@teste.com ",
      documento: "123.456.789-09",
      numerosRifas: ["001", "001", "002"],
    });

    expect(dados).toEqual({
      nome: "Maria",
      telefone: "35999990000",
      email: "maria@teste.com",
      documento: "12345678909",
      numerosRifas: ["001", "002"],
    });
    expect(calcularValorPixCentavos(dados.numerosRifas)).toBe(2000);
  });

  it("Deve aceitar payload da Nova API sem email e sem documento", () => {
    const dados = normalizarDadosCheckoutPix({
      nome: " Carlos Aluno ",
      telefone: "(35) 98888-7777",
      numerosRifas: ["005"],
    });

    expect(dados).toEqual({
      nome: "Carlos Aluno",
      telefone: "35988887777",
      email: undefined,
      documento: undefined,
      numerosRifas: ["005"],
      sessaoCheckoutId: undefined,
    });
  });

  it("Deve rejeitar payload incompleto (sem nome, sem telefone ou sem rifas)", () => {
    expect(() =>
      normalizarDadosCheckoutPix({
        nome: "",
        telefone: "",
        numerosRifas: [],
      }),
    ).toThrow("INVALID_DATA");

    expect(() =>
      normalizarDadosCheckoutPix({
        nome: "João",
        telefone: "",
        numerosRifas: ["001"],
      }),
    ).toThrow("INVALID_DATA");
  });

  describe("isRifaDisponivelParaPix", () => {
    it("Deve liberar rifa órfã em status CRIANDO sem pix_order_id após timeout", () => {
      const haUmMinuto = new Date(Date.now() - 60 * 1000).toISOString();
      const haDezSegundos = new Date(Date.now() - 10 * 1000).toISOString();

      expect(
        isRifaDisponivelParaPix(
          {
            status: "reservado",
            status_pagamento_banco: "CRIANDO",
            pix_order_id: null,
            data_reserva: haUmMinuto,
            vendedor_id: "ADERIDO_1",
          },
          "outra_sessao",
          "ADERIDO_1",
        ),
      ).toBe(true);

      expect(
        isRifaDisponivelParaPix(
          {
            status: "reservado",
            status_pagamento_banco: "CRIANDO",
            pix_order_id: null,
            data_reserva: haDezSegundos,
            vendedor_id: "ADERIDO_1",
          },
          "outra_sessao",
          "ADERIDO_1",
        ),
      ).toBe(false);
    });
  });

  it("Deve expirar cobrança Pix em cerca de quinze minutos", () => {
    const expiraEm = dataExpiracaoPix(new Date("2026-06-09T10:00:00.000Z"));

    expect(expiraEm).toBe("2026-06-09T10:15:00.000Z");
  });

  it("Deve montar chave idempotente estável por vendedor, rifas e janela e diferenciar se dados do comprador mudarem", () => {
    const dataBase = new Date("2026-06-09T10:01:00.000Z");
    const chaveA = montarIdempotencyKeyPix({
      vendedorId: "ADERIDO_001",
      numerosRifas: ["002", "001"],
      dataBase,
    });
    const chaveB = montarIdempotencyKeyPix({
      vendedorId: "ADERIDO_001",
      numerosRifas: ["001", "002"],
      dataBase,
    });
    const chaveCompradorCorrigido = montarIdempotencyKeyPix({
      vendedorId: "ADERIDO_001",
      numerosRifas: ["001", "002"],
      documento: "12345678909",
      email: "novo@email.com",
      dataBase,
    });

    expect(chaveA).toBe(chaveB);
    expect(chaveA).not.toBe(chaveCompradorCorrigido);
    expect(chaveA).toHaveLength(64);
  });

  it("Deve mapear status do Mercado Pago para CheckoutPixStatus", () => {
    expect(mapearStatusCheckoutPix("approved")).toBe("pago");
    expect(mapearStatusCheckoutPix("authorized")).toBe("pago");
    expect(mapearStatusCheckoutPix("rejected")).toBe("cancelado");
    expect(mapearStatusCheckoutPix("cancelled")).toBe("cancelado");
    expect(mapearStatusCheckoutPix("pending")).toBe("aguardando_pagamento");
    expect(mapearStatusCheckoutPix("in_process")).toBe("aguardando_pagamento");
  });

  it("Deve identificar reserva de bilhete expirada em modo offline ou órfã e preservar quando já pago", () => {
    const passado = new Date(Date.now() - 35 * 60 * 1000).toISOString();
    const futuro = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    expect(
      isReservaBilheteExpirada({
        status: "reservado",
        data_expiracao: passado,
        status_pagamento_banco: "WAITING",
        pix_order_id: "RIFA1234567890",
      }),
    ).toBe(true);

    expect(
      isReservaBilheteExpirada({
        status: "reservado",
        data_expiracao: passado,
        status_pagamento_banco: "PAID",
        pix_order_id: "RIFA1234567890",
      }),
    ).toBe(false);

    expect(
      isReservaBilheteExpirada({
        status: "reservado",
        data_expiracao: futuro,
        status_pagamento_banco: "WAITING",
        pix_order_id: "RIFA1234567890",
      }),
    ).toBe(false);
  });
});
