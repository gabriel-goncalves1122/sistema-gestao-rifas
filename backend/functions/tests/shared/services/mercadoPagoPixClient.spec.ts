import { MercadoPagoPixClient } from "../../../src/shared/services/mercadoPagoPixClient";
import axios from "axios";
import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("MercadoPagoPixClient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, MERCADOPAGO_ACCESS_TOKEN: "mock-token", API_PUBLIC_BASE_URL: "https://api.test.com/" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("somenteNumeros e formatacao", () => {
    it("deve criar um pedido PIX com CPF formatado corretamente e email fallback usando somenteNumeros", async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { id: "123", status: "pending" } });

      const result = await MercadoPagoPixClient.criarPedidoPix({
        referenceId: "ref-1",
        nome: "Joao Teste",
        telefone: "(35) 99999-9999",
        email: "maria@teste.com",
        documento: "111.222.333-44",
        numerosRifas: ["001", "002"],
        valorCentavos: 2000,
        expirationDate: "2026-12-31T23:59:59.000Z",
      });

      expect(result.id).toBe("123");
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://api.mercadopago.com/v1/payments",
        expect.objectContaining({
          transaction_amount: 20, // 2000 centavos = 20 reais
          notification_url: "https://api.test.com/tesouraria/checkout/pix/webhook", // Testar obterNotificationUrl
          payer: expect.objectContaining({
            email: "maria@teste.com",
            identification: {
              type: "CPF",
              number: "11122233344", // Testar somenteNumeros
            },
          }),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer mock-token", // Testar obterTokenApi
          })
        })
      );
    });

    it("deve reconhecer CNPJ em documento de 14 digitos (somenteNumeros)", async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { id: "456", status: "pending" } });

      await MercadoPagoPixClient.criarPedidoPix({
        referenceId: "ref-2",
        nome: "Empresa",
        telefone: "35999999999",
        email: "empresa@teste.com",
        documento: "11.222.333/0001-44",
        numerosRifas: ["003"],
        valorCentavos: 1000,
        expirationDate: "2026-12-31T23:59:59.000Z",
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          payer: expect.objectContaining({
            identification: {
              type: "CNPJ",
              number: "11222333000144",
            }
          })
        }),
        expect.any(Object)
      );
    });

    it("deve mapear erros 400 de CPF, e-mail e pagador do Mercado Pago para códigos específicos", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: "Invalid user identification number" },
        },
      });
      await expect(
        MercadoPagoPixClient.criarPedidoPix({
          referenceId: "ref-doc",
          nome: "Joao",
          telefone: "35999999999",
          email: "joao@teste.com",
          documento: "12345678911",
          numerosRifas: ["001"],
          valorCentavos: 1000,
          expirationDate: "2026-12-31T23:59:59.000Z",
        }),
      ).rejects.toThrow("MERCADOPAGO_DOCUMENTO_INVALIDO");

      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            message: "Invalid payer.email",
            cause: [{ code: 4002, description: "payer.email must be a valid email" }],
          },
        },
      });
      await expect(
        MercadoPagoPixClient.criarPedidoPix({
          referenceId: "ref-email",
          nome: "Joao",
          telefone: "35999999999",
          email: "joao@invalido",
          documento: "12345678909",
          numerosRifas: ["001"],
          valorCentavos: 1000,
          expirationDate: "2026-12-31T23:59:59.000Z",
        }),
      ).rejects.toThrow("MERCADOPAGO_EMAIL_INVALIDO");

      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: "The collector cannot be the same as the payer" },
        },
      });
      await expect(
        MercadoPagoPixClient.criarPedidoPix({
          referenceId: "ref-payer",
          nome: "Joao",
          telefone: "35999999999",
          email: "joao@teste.com",
          documento: "12345678909",
          numerosRifas: ["001"],
          valorCentavos: 1000,
          expirationDate: "2026-12-31T23:59:59.000Z",
        }),
      ).rejects.toThrow("MERCADOPAGO_DADOS_PAGADOR_INVALIDOS");

      consoleWarnSpy.mockRestore();
    });
  });

  describe("obterTokenApi", () => {
    it("deve lançar erro se MERCADOPAGO_ACCESS_TOKEN não estiver configurado", async () => {
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;

      await expect(
        MercadoPagoPixClient.criarPedidoPix({
          referenceId: "ref-1",
          nome: "Joao",
          telefone: "35999999999",
          email: "empresa@teste.com",
          documento: "12345678909",
          numerosRifas: ["001"],
          valorCentavos: 1000,
          expirationDate: "2026-12-31",
        })
      ).rejects.toThrow("MERCADOPAGO_NOT_CONFIGURED");
    });
  });

  describe("consultarPedido e cancelarPedido", () => {
    it("deve consultar pedido corretamente", async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { status: "approved" } });

      const res = await MercadoPagoPixClient.consultarPedido("12345");
      expect(res?.status).toBe("approved");
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "https://api.mercadopago.com/v1/payments/12345",
        expect.any(Object)
      );
    });

    it("deve retornar null ao consultar pedido não encontrado (404)", async () => {
      const erro404 = Object.assign(new Error(), { response: { status: 404 } });
      mockedAxios.get.mockRejectedValueOnce(erro404);

      const res = await MercadoPagoPixClient.consultarPedido("inexistente");
      expect(res).toBeNull();
    });

    it("deve cancelar pedido", async () => {
      mockedAxios.put.mockResolvedValueOnce({ data: { status: "cancelled" } });

      const res = await MercadoPagoPixClient.cancelarPedidoPix("12345");
      expect(res?.status).toBe("cancelled");
    });

    it("deve retornar null ao cancelar pedido que retorna erro da api do mercado pago", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const erro400 = Object.assign(new Error(), { response: { status: 400, data: {} } });
      mockedAxios.put.mockRejectedValueOnce(erro400);

      const res = await MercadoPagoPixClient.cancelarPedidoPix("12345");
      expect(res).toBeNull();
      consoleWarnSpy.mockRestore();
    });
  });
});
