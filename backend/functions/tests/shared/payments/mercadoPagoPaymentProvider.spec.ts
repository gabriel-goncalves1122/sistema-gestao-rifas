// ============================================================================
// ARQUIVO: backend/functions/tests/shared/payments/mercadoPagoPaymentProvider.spec.ts
// ============================================================================

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../../src/shared/services/mercadoPagoPixClient", () => ({
  MercadoPagoPixClient: {
    criarPedidoPix: jest.fn(),
    consultarPedido: jest.fn(),
    cancelarPedidoPix: jest.fn(),
  },
}));

import { MercadoPagoPixClient } from "../../../src/shared/services/mercadoPagoPixClient";
import { MercadoPagoPaymentProvider } from "../../../src/shared/payments/providers/mercadoPagoPaymentProvider";

describe("MercadoPagoPaymentProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve traduzir payload aprovado para EventoStatusPagamento canônico", () => {
    const evento = MercadoPagoPaymentProvider.traduzirPayloadParaEvento({
      id: 123456,
      status: "approved",
      external_reference: "rifas-pix-COMP_1",
      transaction_details: { total_paid_amount: 30 },
      date_approved: "2026-11-11T12:00:00.000Z",
    });

    expect(evento).toEqual(
      expect.objectContaining({
        orderId: "123456",
        referenceId: "rifas-pix-COMP_1",
        statusCanonico: "pago",
        statusBancoBruto: "approved",
        motivoFalha: null,
        valorPagoReais: 30,
        pagoEm: "2026-11-11T12:00:00.000Z",
      }),
    );
  });

  it("deve traduzir payload cancelado com motivo amigável do status_detail", () => {
    const evento = MercadoPagoPaymentProvider.traduzirPayloadParaEvento({
      id: "MP_999",
      status: "cancelled",
      status_detail: "expired",
    });

    expect(evento.statusCanonico).toBe("cancelado");
    expect(evento.motivoFalha).toBe("O tempo limite para pagamento do código Pix expirou.");
  });

  it("deve consultar evento no gateway e retornar null quando pedido não existir", async () => {
    const provider = new MercadoPagoPaymentProvider();
    (MercadoPagoPixClient.consultarPedido as jest.Mock<any>).mockResolvedValueOnce(null);

    expect(await provider.consultarEventoStatus("404")).toBeNull();
  });
});
