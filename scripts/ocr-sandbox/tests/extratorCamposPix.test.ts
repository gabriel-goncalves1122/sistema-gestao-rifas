// ============================================================================
// ARQUIVO: scripts/ocr-sandbox/tests/extratorCamposPix.test.ts
// ============================================================================

import { describe, expect, it } from "vitest";
import { extrairCamposPix } from "../src/parsers/extratorCamposPix.js";

describe("extratorCamposPix", () => {
  it("extrai corretamente comprovante Nubank com data textual, txid RIFA, valor, recebedor e E2E ID", () => {
    const texto = `
      Nu Pagamentos S.A.
      Comprovante de transferência
      13 NOV 2026 - 09:15:42
      Valor
      R$ 45,00
      Tipo de transferência: Pix
      Identificador: RIFA7X9K2P8M1Q
      ID da transação: E18236120 20261113 1215s001234abcd
      Destino
      Nome
      Comissao Formatura Unifei
      Instituição: InfinitePay
    `;

    const res = extrairCamposPix(texto);

    expect(res.bancoDetectado).toBe("NUBANK");
    expect(res.txidLido).toBe("RIFA7X9K2P8M1Q");
    expect(res.valorCentavos).toBe(4500);
    expect(res.dataTransacaoIso).toBe("2026-11-13T09:15:42-03:00");
    expect(res.e2eId).toBe("E18236120202611131215S001234ABCD");
    expect(res.recebedorDetectado).toBe("COMISSAO FORMATURA UNIFEI");
    expect(res.alertasTexto).toEqual([]);
  });

  it("ignora saldo e tarifa ao capturar valor pago em comprovante Bancão (BB/Itaú)", () => {
    const texto = `
      Banco do Brasil S.A.
      Comprovante de Pix enviado
      Data: 13/11/2026 10:02:11
      Saldo anterior: R$ 1.500,00
      Tarifa: R$ 0,00
      Valor pago: R$ 120,50
      Descrição: R1FA ABC1234567
      Recebedor: COMISSAO FORMATURA UNIFEI
      ID E2E: £00000000202611131302AABBCCDDEEF
    `;

    const res = extrairCamposPix(texto);

    expect(res.bancoDetectado).toBe("BANCO DO BRASIL");
    expect(res.valorCentavos).toBe(12050);
    expect(res.valoresCandidatosCentavos).not.toContain(150000);
    expect(res.txidLido).toBe("RIFAABC1234567");
    expect(res.e2eId).toBe("E00000000202611131302AABBCCDDEEF");
    expect(res.dataTransacaoIso).toBe("2026-11-13T10:02:11-03:00");
  });

  it("extrai data com mês abreviado (PicPay) e corrige E2E do Inter com OOO duplicado", () => {
    const texto = `
      PicPay
      02/set/2026 - 18:08:08
      Valor
      R$ 50,00
      Para
      8805
      54.789.437/0001-85
      EOO04169682026081401061VUPWETKNDJ
    `;

    const res = extrairCamposPix(texto);

    expect(res.dataTransacaoIso).toBe("2026-09-02T18:08:08-03:00");
    expect(res.cnpjRecebedorDetectado).toBe("54789437000185");
    expect(res.e2eId).toBe("E004169682026081401061VUPWETKNDJ");
  });

  it("detecta alertas de agendamento e cancelamento corretamente", () => {
    const textoAgendado = `
      Banco Inter S.A.
      Comprovante de agendamento de Pix
      Pix agendado para 20/11/2026
      Valor: R$ 30,00
      Identificador: RIFA1122334455
    `;

    const resAgendado = extrairCamposPix(textoAgendado);
    expect(resAgendado.bancoDetectado).toBe("INTER");
    expect(resAgendado.alertasTexto).toContain("AGENDAMENTO_DETECTADO");

    const textoCancelado = `
      Mercado Pago
      Status: Cancelado
      Pagamento recusado pelo banco
      Valor: R$ 30,00
    `;

    const resCancelado = extrairCamposPix(textoCancelado);
    expect(resCancelado.bancoDetectado).toBe("MERCADO PAGO");
    expect(resCancelado.alertasTexto).toContain("STATUS_CANCELADO_OU_RECUSADO");
  });

  it("sinaliza texto insuficiente quando OCR retorna vazio ou muito curto", () => {
    const res = extrairCamposPix("abc");
    expect(res.alertasTexto).toContain("TEXTO_INSUFICIENTE");
    expect(res.valorCentavos).toBeNull();
    expect(res.txidLido).toBeNull();
  });
});
