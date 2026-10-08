// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/services/pixTransacoesService.spec.ts
// ============================================================================
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockWhere = jest.fn<any>();
const mockGet = jest.fn<any>();

jest.mock("firebase-admin", () => {
  const collectionMock = {
    where: mockWhere.mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: mockGet,
  };

  return {
    firestore: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue(collectionMock),
    }),
  };
});

jest.mock("../../../src/shared/services/mercadoPagoPixClient", () => ({
  MercadoPagoPixClient: { consultarPedido: jest.fn() },
}));

jest.mock("../../../src/modules/tesouraria/services/checkoutPixWebhookService", () => ({
  CheckoutPixWebhookService: { processarPayloadConfiavel: jest.fn() },
}));

import { MercadoPagoPixClient } from "../../../src/shared/services/mercadoPagoPixClient";
import { CheckoutPixWebhookService } from "../../../src/modules/tesouraria/services/checkoutPixWebhookService";

import { PixTransacoesService } from "../../../src/modules/tesouraria/services/pixTransacoesService";

describe("Service: PixTransacoesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Deve normalizar bilhetes em transações Pix agrupadas por comprovante", async () => {
    mockGet.mockResolvedValueOnce({
      docs: [
        {
          id: "002",
          data: () => ({
            status: "pago",
            pix_order_id: "mock_order_123",
            comprador_id: "COMPRA_001",
            comprador_nome: "Ana",
            comprador_email: "ana@teste.com",
            comprador_telefone: "11999999999",
            vendedor_id: "ADERIDO_001",
            vendedor_nome: "Aderido Um",
            vendedor_cpf: "111",
            comprovante_url: "https://storage.mock/comprovante-1.png",
            data_reserva: "2026-01-01T10:00:00.000Z",
            data_pagamento: "2026-01-02T10:00:00.000Z",
          }),
        },
        {
          id: "001",
          data: () => ({
            status: "pago",
            pix_order_id: "mock_order_123",
            comprador_id: "COMPRA_001",
            comprador_nome: "Ana",
            vendedor_id: "ADERIDO_001",
            vendedor_nome: "Aderido Um",
            vendedor_cpf: "111",
            comprovante_url: "https://storage.mock/comprovante-1.png",
            data_reserva: "2026-01-01T10:00:00.000Z",
            data_pagamento: "2026-01-02T10:00:00.000Z",
          }),
        },
        {
          id: "003",
          data: () => ({
            status: "pendente",
            pix_order_id: "mock_order_456",
            comprador_id: "COMPRA_002",
            comprador_nome: "Bruno",
            data_reserva: "2026-01-03T10:00:00.000Z",
          }),
        },
      ],
    });

    const resultado = await PixTransacoesService.buscarTransacoes();
    const transacaoPaga = resultado.find(
      (transacao: any) => transacao.id === "pix-mock_order_123",
    );

    expect(mockWhere).toHaveBeenCalledWith("status", "in", [
      "pago",
      "pendente",
      "recusado",
      "reservado",
    ]);
    expect(resultado).toHaveLength(2);
    expect(transacaoPaga).toEqual(
      expect.objectContaining({
        metodo: "PIX",
        statusPagamento: "PAID",
        valorBruto: 20,
        valorPago: 20,
        compradorNome: "Ana",
        quantidadeRifas: 2,
      }),
    );
    expect(transacaoPaga?.rifas).toEqual([
      { numero: "001", status: "pago" },
      { numero: "002", status: "pago" },
    ]);
  });

  it("Deve retornar sincronização vazia quando não houver cobrança aberta", async () => {
    mockGet.mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    await expect(PixTransacoesService.sincronizar()).resolves.toEqual({
      sucesso: true,
      sincronizado: false,
      atualizados: 0,
      mensagem: "Nenhuma cobrança Pix aberta para sincronizar.",
    });
  });

  it("Deve calcular o resumo das transações Pix", async () => {
    mockGet.mockResolvedValueOnce({
      docs: [
        {
          id: "001",
          data: () => ({
            status: "pago",
            pix_order_id: "mock_order_789",
            comprador_id: "COMPRA_001",
            comprador_nome: "Ana",
            data_reserva: "2026-01-01T10:00:00.000Z",
          }),
        },
      ],
    });

    const resumo = await PixTransacoesService.obterResumo();
    expect(resumo).toEqual(
      expect.objectContaining({
        quantidadePagas: 1,
        totalRecebido: 9.9,
      })
    );
  });

  it("Deve sincronizar cobranças abertas chamando a API do Mercado Pago e o webhook interno", async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        { id: "PAG_001", data: () => ({ pix_order_id: "ORDER_111" }) },
        { id: "PAG_002", data: () => ({ pix_order_id: "ORDER_222" }) },
        { id: "PAG_003", data: () => ({ id: "ORDER_333" }) },
      ],
    });

    (MercadoPagoPixClient.consultarPedido as jest.Mock)
      .mockResolvedValueOnce({ id: "ORDER_111", status: "approved" })
      .mockResolvedValueOnce({ id: "ORDER_222", status: "rejected" })
      .mockResolvedValueOnce({ id: "ORDER_333", status: "pending" });

    (CheckoutPixWebhookService.processarPayloadConfiavel as jest.Mock).mockResolvedValue(undefined);

    const resultado = await PixTransacoesService.sincronizar();

    expect(resultado).toEqual({
      sucesso: true,
      sincronizado: true,
      atualizados: 3,
      mensagem: "Sincronização Pix concluída.",
    });

    expect(MercadoPagoPixClient.consultarPedido).toHaveBeenCalledTimes(3);
    expect(MercadoPagoPixClient.consultarPedido).toHaveBeenCalledWith("ORDER_111");
    expect(MercadoPagoPixClient.consultarPedido).toHaveBeenCalledWith("ORDER_222");
    expect(MercadoPagoPixClient.consultarPedido).toHaveBeenCalledWith("ORDER_333");

    expect(CheckoutPixWebhookService.processarPayloadConfiavel).toHaveBeenCalledTimes(3);
  });
});
