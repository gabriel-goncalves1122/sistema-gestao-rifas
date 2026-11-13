// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/checkout/checkoutEntityBuilder.spec.ts
// ============================================================================

import { describe, expect, it, jest } from "@jest/globals";
import QRCode from "qrcode";

import {
  construirRespostaPagamentoExistente,
  montarBilheteReservadoPix,
  montarPayloadReservaCheckout,
} from "../../../src/modules/tesouraria/checkout/builders/checkoutEntityBuilder";

describe("Builder: checkoutEntityBuilder", () => {
  it("Deve limpar campos residuais de vendas anteriores ao montarBilheteReservadoPix", () => {
    const bilhete = montarBilheteReservadoPix({
      numero: "042",
      compradorId: "COMP_1",
      referenceId: "REF_1",
      contextoAderido: {
        vendedorNome: "Aderido",
        vendedorCpf: "12345678909",
        idAderido: "AD_1",
      },
      dados: {
        nome: "Comprador",
        telefone: "35999990000",
        numerosRifas: ["042"],
      },
      valorRifa: 10,
      agora: "2026-11-11T10:00:00.000Z",
      expiraEm: "2026-11-11T10:30:00.000Z",
    });

    expect(bilhete.comprovante_url).toBeNull();
    expect(bilhete.motivo_recusa).toBeNull();
    expect(bilhete.correcao_pendente).toBeNull();
    expect(bilhete.data_pagamento).toBeNull();
    expect(bilhete.pix_order_id).toBeNull();
    expect(bilhete.status_validacao).toBeNull();
  });

  it("Deve montar comprador e pagamento base sem IDs pré-gerados", () => {
    const payload = montarPayloadReservaCheckout({
      idempotencyKey: "KEY_1",
      contextoAderido: { idAderido: "AD_1", vendedorNome: "Vendedor" },
      dados: { nome: "Maria", telefone: "35999990000", numerosRifas: ["001"] },
      valorBruto: 10,
      agora: "2026-11-11T10:00:00.000Z",
      expiraEm: "2026-11-11T10:30:00.000Z",
      provedorPagamento: "EMV_OFFLINE",
    });

    expect(payload.comprador).toEqual({
      nome: "Maria",
      telefone: "35999990000",
      email: null,
      criado_em: "2026-11-11T10:00:00.000Z",
    });
    expect(payload.pagamentoBase.provedor_pagamento).toBe("EMV_OFFLINE");
    expect((payload.pagamentoBase as any).id).toBeUndefined();
  });

  it("Deve gerar qrCodeBase64 sob demanda quando ausente e rejeitar pagamento em criação", async () => {
    await expect(
      construirRespostaPagamentoExistente({
        id: "PAG_1",
        pix_qr_code_id: null,
        copia_e_cola: null,
      } as any),
    ).rejects.toThrow("PAGAMENTO_EM_CRIACAO");

    const spyQr = jest
      .spyOn(QRCode, "toDataURL")
      .mockResolvedValueOnce("data:image/png;base64,ABC_BASE64" as never);

    const resposta = await construirRespostaPagamentoExistente({
      id: "PAG_2",
      status_pagamento_banco: "WAITING",
      pix_qr_code_id: "QR_1",
      copia_e_cola: "000201",
      numeros_rifas: ["001"],
    } as any);

    expect(resposta.qrCodeBase64).toBe("ABC_BASE64");
    spyQr.mockRestore();
  });
});
