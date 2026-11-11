import { describe, it, expect } from "vitest";
import { mapearStatusBancoPix } from "@/features/aderidos/utils/statusPixUtils";

describe("Utilitário: statusPixUtils (mapearStatusBancoPix)", () => {
  it("Deve mapear status aprovados ou em análise bancária para 'pago'", () => {
    expect(mapearStatusBancoPix("approved")).toBe("pago");
    expect(mapearStatusBancoPix("PAID")).toBe("pago");
    expect(mapearStatusBancoPix("authorized")).toBe("pago");
    expect(mapearStatusBancoPix("in_analysis")).toBe("pago");
    expect(mapearStatusBancoPix("pendente")).toBe("pago");
  });

  it("Deve mapear status de rejeição, expiração ou cancelamento para 'cancelado'", () => {
    expect(mapearStatusBancoPix("rejected")).toBe("cancelado");
    expect(mapearStatusBancoPix("cancelled")).toBe("cancelado");
    expect(mapearStatusBancoPix("CANCELED")).toBe("cancelado");
    expect(mapearStatusBancoPix("expired")).toBe("cancelado");
    expect(mapearStatusBancoPix("expirado")).toBe("cancelado");
  });

  it("Deve manter aguardando_pagamento para status pendentes ou desconhecidos", () => {
    expect(mapearStatusBancoPix("waiting")).toBe("aguardando_pagamento");
    expect(mapearStatusBancoPix("pending")).toBe("aguardando_pagamento");
    expect(mapearStatusBancoPix("")).toBe("aguardando_pagamento");
  });
});
