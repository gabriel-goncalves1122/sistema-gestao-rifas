// ============================================================================
// ARQUIVO: frontend/tests/features/aderidos/cancelarCheckoutPendente.test.ts
// ============================================================================
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkoutPixService } from "@/features/aderidos/services/checkoutPixService";
import { cancelarCheckoutPendente } from "@/features/aderidos/utils/cancelarCheckoutPendente";
import { checkoutStorage } from "@/features/aderidos/utils/checkoutStorage";

vi.mock("@/features/aderidos/services/checkoutPixService", () => ({
  checkoutPixService: {
    cancelarCobrancaPix: vi.fn(),
  },
}));

describe("cancelarCheckoutPendente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("não deve chamar cancelarCobrancaPix se não houver cobrança salva", async () => {
    const cancelou = await cancelarCheckoutPendente();
    expect(cancelou).toBe(false);
    expect(checkoutPixService.cancelarCobrancaPix).not.toHaveBeenCalled();
  });

  it("não deve chamar cancelar se a cobrança já estiver com status 'pago'", async () => {
    checkoutStorage.update({
      cobrancaPix: {
        id: "pix_pago",
        status: "pago",
        numerosRifas: ["001"],
      } as any,
    });

    const cancelou = await cancelarCheckoutPendente();
    expect(cancelou).toBe(false);
    expect(checkoutPixService.cancelarCobrancaPix).not.toHaveBeenCalled();
  });

  it("deve chamar cancelarCobrancaPix e retornar true quando houver cobrança em aberto", async () => {
    checkoutStorage.update({
      cobrancaPix: {
        id: "pix_aberto_123",
        status: "aguardando_pagamento",
        numerosRifas: ["001", "002"],
      } as any,
    });

    const cancelou = await cancelarCheckoutPendente();
    expect(cancelou).toBe(true);
    expect(checkoutPixService.cancelarCobrancaPix).toHaveBeenCalledWith(
      "pix_aberto_123",
      false,
    );
  });

  it("não deve propagar erro caso a requisição de cancelamento falhe", async () => {
    checkoutStorage.update({
      cobrancaPix: {
        id: "pix_aberto_erro",
        status: "aguardando_pagamento",
      } as any,
    });

    vi.mocked(checkoutPixService.cancelarCobrancaPix).mockRejectedValueOnce(
      new Error("Falha de rede"),
    );

    const cancelou = await cancelarCheckoutPendente();
    expect(cancelou).toBe(false);
  });
});
