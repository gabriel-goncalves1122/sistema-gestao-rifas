import { describe, expect, it } from "@jest/globals";

import {
  calcularValorLiquido,
  construirGatewayMetaEnxuto,
  ehPagamentoGatewayMercadoPago,
  resolverProvedorRegistro,
} from "../../../src/modules/tesouraria/helpers/origemPagamentoHelper";

describe("Helper: origemPagamentoHelper", () => {
  describe("resolverProvedorRegistro", () => {
    it("Deve priorizar provedor_pagamento explícito quando presente", () => {
      expect(resolverProvedorRegistro({ provedor_pagamento: "MERCADOPAGO_API", pix_order_id: "RIFA123" })).toBe(
        "MERCADOPAGO_API",
      );
      expect(resolverProvedorRegistro({ provedor_pagamento: "EMV_OFFLINE", pix_order_id: "123456" })).toBe(
        "EMV_OFFLINE",
      );
      expect(resolverProvedorRegistro({ provedor_pagamento: "COMPROVANTE_PURO" })).toBe(
        "COMPROVANTE_PURO",
      );
    });

    it("Deve identificar Pix Normal (EMV_OFFLINE) via fallbacks legados sem confundir com Mercado Pago", () => {
      expect(resolverProvedorRegistro({ pix_order_id: "RIFA987654" })).toBe("EMV_OFFLINE");
      expect(
        resolverProvedorRegistro({
          pix_order_id: "EXT_1",
          raw_mercadopago: { geradoOffline: true },
        }),
      ).toBe("EMV_OFFLINE");
      expect(
        resolverProvedorRegistro({
          pix_order_id: "EXT_2",
          gateway_meta: { geradoOffline: true },
        }),
      ).toBe("EMV_OFFLINE");
      expect(resolverProvedorRegistro({ dados_conciliacao: { tipoMatch: "TXID_EXATO" } })).toBe(
        "EMV_OFFLINE",
      );
    });

    it("Deve identificar Mercado Pago legado pelo pix_order_id não-EMV e Comprovante na ausência", () => {
      expect(resolverProvedorRegistro({ pix_order_id: "MP_999888" })).toBe("MERCADOPAGO_API");
      expect(ehPagamentoGatewayMercadoPago({ pix_order_id: "MP_999888" })).toBe(true);
      expect(ehPagamentoGatewayMercadoPago({ pix_order_id: "RIFA001" })).toBe(false);
      expect(resolverProvedorRegistro({})).toBe("COMPROVANTE_PURO");
      expect(resolverProvedorRegistro(null)).toBe("COMPROVANTE_PURO");
    });
  });

  describe("calcularValorLiquido", () => {
    it("Deve descontar taxa de 1% apenas para MERCADOPAGO_API", () => {
      expect(calcularValorLiquido(100, "MERCADOPAGO_API")).toBe(99);
      expect(calcularValorLiquido(30, { provedor_pagamento: "MERCADOPAGO_API" })).toBe(29.7);
    });

    it("Deve manter valor integral (0% de taxa) para EMV_OFFLINE e COMPROVANTE_PURO", () => {
      expect(calcularValorLiquido(100, "EMV_OFFLINE")).toBe(100);
      expect(calcularValorLiquido(30, { pix_order_id: "RIFAABC123" })).toBe(30);
      expect(calcularValorLiquido(50, "COMPROVANTE_PURO")).toBe(50);
    });
  });

  describe("construirGatewayMetaEnxuto", () => {
    it("Deve extrair apenas metadados essenciais e descartar payload pesado", () => {
      const meta = construirGatewayMetaEnxuto(
        {
          id: 123456,
          status_detail: "accredited",
          date_approved: "2026-11-11T10:00:00Z",
          point_of_interaction: { transaction_data: { qr_code_base64: "GIGANTE..." } },
          payer: { email: "a@b.com" },
        },
        "MERCADOPAGO_API",
      );

      expect(meta).toEqual({
        id: "123456",
        status_detail: "accredited",
        date_approved: "2026-11-11T10:00:00Z",
      });
    });

    it("Deve preservar geradoOffline quando provedor for EMV_OFFLINE", () => {
      expect(construirGatewayMetaEnxuto({ txid: "RIFA1" }, "EMV_OFFLINE")).toEqual({
        id: "RIFA1",
        geradoOffline: true,
      });
      expect(construirGatewayMetaEnxuto(null, "MERCADOPAGO_API")).toBeNull();
    });
  });
});
