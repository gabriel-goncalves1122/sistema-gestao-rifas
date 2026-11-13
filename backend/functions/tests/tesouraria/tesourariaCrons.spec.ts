// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/tesourariaCrons.spec.ts
// ============================================================================

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockGet = jest.fn<any>();

jest.mock("firebase-admin", () => {
  const queryMock = {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: mockGet,
  };
  return {
    firestore: jest.fn(() => ({
      collection: jest.fn(() => queryMock),
    })),
  };
});

jest.mock("firebase-functions/v2/scheduler", () => ({
  onSchedule: (_opts: any, handler: any) => handler,
}));

import { limparPixExpirados } from "../../src/modules/tesouraria/tesourariaCrons";
import { MercadoPagoCheckoutStrategy } from "../../src/modules/tesouraria/checkout/strategies/mercadoPagoCheckoutStrategy";
import { PixNormalCheckoutStrategy } from "../../src/modules/tesouraria/checkout/strategies/pixNormalCheckoutStrategy";

describe("tesourariaCrons - limparPixExpirados", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("deve delegar expiração polimorficamente para MercadoPago e PixNormal", async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      size: 2,
      docs: [
        {
          id: "PAG_MP",
          data: () => ({
            pix_order_id: "12345",
            provedor_pagamento: "MERCADOPAGO_API",
            status_pagamento_banco: "WAITING",
          }),
        },
        {
          id: "PAG_OFF",
          data: () => ({
            pix_order_id: "RIFA123",
            provedor_pagamento: "EMV_OFFLINE",
            status_pagamento_banco: "WAITING",
          }),
        },
      ],
    });

    const mpSpy = jest
      .spyOn(MercadoPagoCheckoutStrategy.prototype, "expirarCheckout")
      .mockResolvedValueOnce(undefined);
    const offSpy = jest
      .spyOn(PixNormalCheckoutStrategy.prototype, "expirarCheckout")
      .mockResolvedValueOnce(undefined);

    await (limparPixExpirados as unknown as () => Promise<void>)();

    expect(mpSpy).toHaveBeenCalledWith("PAG_MP", expect.objectContaining({ pix_order_id: "12345" }));
    expect(offSpy).toHaveBeenCalledWith("PAG_OFF", expect.objectContaining({ pix_order_id: "RIFA123" }));
  });
});
