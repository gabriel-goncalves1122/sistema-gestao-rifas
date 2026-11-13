import { describe, expect, it } from "vitest";

import { PixTransacao } from "@/features/tesouraria/types/pixTransacoes";
import { calcularResumoPixTransacoes } from "@/features/tesouraria/utils/pixTransacoesMetricasUtils";

function criarTransacaoBase(overrides: Partial<PixTransacao>): PixTransacao {
  return {
    id: "tx_base",
    metodo: "PIX",
    statusPagamento: "PAID",
    valorBruto: 100,
    valorPago: 100,
    moeda: "BRL",
    dataCriacao: "2026-11-13T10:00:00Z",
    quantidadeRifas: 10,
    ...overrides,
  };
}

describe("Utilitário: pixTransacoesMetricasUtils", () => {
  it("mantém 100% do valor para EMV_OFFLINE (Pix Direto) e COMPROVANTE_PURO, aplicando taxa de 1% apenas ao MERCADOPAGO_API legado", () => {
    const transacoes: PixTransacao[] = [
      criarTransacaoBase({
        id: "tx_emv",
        pixOrderId: "TX_DIRETO_1",
        provedor: "EMV_OFFLINE",
        valorBruto: 100,
        valorPago: 100,
        quantidadeRifas: 10,
      }),
      criarTransacaoBase({
        id: "tx_comprovante",
        provedor: "COMPROVANTE_PURO",
        comprovanteUrl: "https://storage.example.com/comp.jpg",
        valorBruto: 200,
        valorPago: 200,
        quantidadeRifas: 20,
      }),
      criarTransacaoBase({
        id: "tx_mp_legado",
        pixOrderId: "MP_999",
        provedor: "MERCADOPAGO_API",
        valorBruto: 100,
        valorPago: 100,
        quantidadeRifas: 10,
      }),
    ];

    const resumo = calcularResumoPixTransacoes(transacoes);

    // EMV_OFFLINE (100) + COMPROVANTE_PURO (200) + MERCADOPAGO_API (99) = 399 líquido, 400 bruto
    expect(resumo.pixRecebidoBruto).toBe(400);
    expect(resumo.pixRecebidoLiquido).toBe(399);
    expect(resumo.totalRecebido).toBe(399);
    expect(resumo.pixRifasPagas).toBe(40);
  });
});
