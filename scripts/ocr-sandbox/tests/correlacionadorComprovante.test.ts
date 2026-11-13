// ============================================================================
// ARQUIVO: scripts/ocr-sandbox/tests/correlacionadorComprovante.test.ts
// ============================================================================

import { describe, expect, it } from "vitest";
import { correlacionarComprovante } from "../src/correlation/correlacionadorComprovante.js";
import { extrairCamposPix } from "../src/parsers/extratorCamposPix.js";
import { PedidoEsperadoCorrelacao } from "../src/types/ocrSandboxTypes.js";

const PEDIDO_BASE: PedidoEsperadoCorrelacao = {
  pagamentoId: "pag_001",
  txidEsperado: "RIFA987654ABCD",
  valorCentavos: 3000,
  recebedorEsperado: "COMISSAO FORMATURA UNIFEI",
  dataCriacaoIso: "2026-11-13T08:00:00",
  e2eIdsJaUtilizados: ["E18236120202611120900DUPLICAD099"],
};

describe("correlacionarComprovante", () => {
  it("classifica como CORRELACAO_FORTE quando TxID, valor, recebedor e E2E batem", () => {
    const extraido = extrairCamposPix(`
      Nubank
      13/11/2026 - 08:25:00
      Valor pago: R$ 30,00
      Identificador: RIFA987654ABCD
      ID: E18236120202611130825UNICO000001
      Recebedor: Comissao Formatura Unifei
    `);

    const res = correlacionarComprovante(extraido, PEDIDO_BASE);

    expect(res.veredicto).toBe("CORRELACAO_FORTE");
    expect(res.score).toBe(100);
    expect(res.txidBate).toBe(true);
    expect(res.valorBate).toBe(true);
    expect(res.recebedorBate).toBe(true);
    expect(res.e2eUnico).toBe(true);
    expect(res.alertas).toEqual([]);
  });

  it("resgata TxID com confusão clássica de OCR (O/0 e I/1) sem corromper o match", () => {
    const pedido = { ...PEDIDO_BASE, txidEsperado: "RIFA018273IOXY" };
    const extraido = extrairCamposPix(`
      Itau
      13/11/2026 09:00
      Valor: R$ 30,00
      Descrição: RIFAOI827310XY
      Recebedor: COMISSAO FORMATURA UNIFEI
    `);

    const res = correlacionarComprovante(extraido, pedido);

    expect(res.veredicto).toBe("CORRELACAO_FORTE");
    expect(res.txidBate).toBe(true);
    expect(res.valorBate).toBe(true);
  });

  it("classifica como CORRELACAO_PARCIAL quando banco omite TxID mas valor + recebedor + E2E batem", () => {
    const extraido = extrairCamposPix(`
      Caixa Econômica Federal
      13/11/2026 09:10:00
      Valor transferido: R$ 30,00
      Para: COMISSAO FORMATURA UNIFEI
      ID Transação: E00360305202611130910XYZ12345678
    `);

    const res = correlacionarComprovante(extraido, PEDIDO_BASE);

    expect(res.veredicto).toBe("CORRELACAO_PARCIAL");
    expect(res.txidBate).toBe(false);
    expect(res.valorBate).toBe(true);
    expect(res.alertas).toContain("TXID_NAO_ENCONTRADO");
  });

  it("classifica como SUSPEITO em comprovante agendado ou com E2E ID duplicado", () => {
    const extraidoAgendado = extrairCamposPix(`
      Inter
      Pix agendado para 15/11/2026
      Valor: R$ 30,00
      Identificador: RIFA987654ABCD
    `);
    const resAgendado = correlacionarComprovante(extraidoAgendado, PEDIDO_BASE);
    expect(resAgendado.veredicto).toBe("SUSPEITO");
    expect(resAgendado.alertas).toContain("AGENDAMENTO_DETECTADO");

    const extraidoDuplicado = extrairCamposPix(`
      Nubank
      13/11/2026 09:30
      Valor: R$ 30,00
      Identificador: RIFA987654ABCD
      E18236120202611120900DUPLICAD099
    `);
    const resDuplicado = correlacionarComprovante(extraidoDuplicado, PEDIDO_BASE);
    expect(resDuplicado.veredicto).toBe("SUSPEITO");
    expect(resDuplicado.e2eUnico).toBe(false);
    expect(resDuplicado.alertas).toContain("E2E_DUPLICADO");
  });

  it("classifica como DIVERGENTE para valor diferente, TxID de outro pedido ou data anterior", () => {
    const extraidoValorErrado = extrairCamposPix(`
      C6 Bank
      13/11/2026 10:00
      Valor pago: R$ 15,00
      Identificador: RIFA987654ABCD
    `);
    expect(correlacionarComprovante(extraidoValorErrado, PEDIDO_BASE).veredicto).toBe("DIVERGENTE");

    const extraidoOutroTxid = extrairCamposPix(`
      C6 Bank
      13/11/2026 10:00
      Valor pago: R$ 30,00
      Identificador: RIFAOUTROPEDIDO1
    `);
    const resOutro = correlacionarComprovante(extraidoOutroTxid, PEDIDO_BASE);
    expect(resOutro.veredicto).toBe("DIVERGENTE");
    expect(resOutro.alertas).toContain("TXID_DE_OUTRO_PEDIDO");

    const extraidoAntigo = extrairCamposPix(`
      C6 Bank
      10/11/2026 10:00
      Valor pago: R$ 30,00
      Identificador: RIFA987654ABCD
    `);
    const resAntigo = correlacionarComprovante(extraidoAntigo, PEDIDO_BASE);
    expect(resAntigo.veredicto).toBe("DIVERGENTE");
    expect(resAntigo.alertas).toContain("COMPROVANTE_ANTERIOR_AO_PEDIDO");
  });

  it("resgata TxID com 1 caractere inserido/trocado (B/8) e valida fuso BRT vs UTC + CNPJ", () => {
    const pedido = {
      ...PEDIDO_BASE,
      txidEsperado: "RIFAIBVNOMKI9B",
      recebedorEsperado: "8805",
      cnpjRecebedorEsperado: "54789437000185",
      dataCriacaoIso: "2026-11-13T11:31:19.775Z", // 08:31:19 BRT
    };

    const extraido = extrairCamposPix(`
      Nu Pagamentos S.A.
      13/11/2026 08:31:55
      Valor R$ 30,00
      Identificador RIFAIBVYNOMKI9B
      Destino
      Nome 8805
      CNPJ 54.789.437/0001-85
    `);

    const res = correlacionarComprovante(extraido, pedido);
    expect(res.veredicto).toBe("CORRELACAO_FORTE");
    expect(res.txidBate).toBe(true);
    expect(res.recebedorBate).toBe(true);
    expect(res.alertas).not.toContain("COMPROVANTE_ANTERIOR_AO_PEDIDO");
  });
});
