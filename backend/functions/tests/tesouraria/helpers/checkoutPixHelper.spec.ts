import { describe, expect, it } from "@jest/globals";

import {
  calcularValorPixCentavos,
  dataExpiracaoPix,
  isRifaDisponivelParaPix,
  mapearStatusCheckoutPix,
  montarIdempotencyKeyPix,
  normalizarDadosCheckoutPix,
  normalizarQrCodeMercadoPago,
  validarCnpj,
  validarCpf,
  validarDocumentoPix,
  validarEmailPix,
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

  it("Deve rejeitar payload incompleto", () => {
    expect(() =>
      normalizarDadosCheckoutPix({
        nome: "",
        telefone: "",
        numerosRifas: [],
      }),
    ).toThrow("INVALID_DATA");
  });

  describe("Validação matemática de CPF, CNPJ e E-mail", () => {
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

  describe("normalizarQrCodeMercadoPago", () => {
    it("Deve lançar erro se o objeto ou ID/QR Code não existirem", () => {
      expect(() => normalizarQrCodeMercadoPago(null)).toThrow("MERCADOPAGO_QR_CODE_INVALIDO");
      expect(() => normalizarQrCodeMercadoPago({})).toThrow("MERCADOPAGO_QR_CODE_INVALIDO");
      expect(() => normalizarQrCodeMercadoPago({ id: "123" })).toThrow("MERCADOPAGO_QR_CODE_INVALIDO");
    });

    it("Deve normalizar QR Code retornado pelo Mercado Pago", () => {
      const qrCode = normalizarQrCodeMercadoPago({
        id: "PEDIDO_MP_123",
        point_of_interaction: {
          transaction_data: {
            qr_code: "00020126...COPIA-COLA",
            qr_code_base64: "base64..."
          }
        },
        date_of_expiration: "2026-07-09T12:00:00-03:00",
      });

      expect(qrCode.id).toBe("PEDIDO_MP_123");
      expect(qrCode.copiaECola).toBe("00020126...COPIA-COLA");
      expect(qrCode.expiraEm).toBe("2026-07-09T12:00:00-03:00");
      expect(qrCode.qrCodeBase64).toBe("base64...");
    });
  });

  it("Deve expirar cobrança Pix em cerca de trinta minutos", () => {
    const expiraEm = dataExpiracaoPix(new Date("2026-06-09T10:00:00.000Z"));

    expect(expiraEm).toBe("2026-06-09T10:30:00.000Z");
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
});
