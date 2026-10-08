// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/helpers/pixTransacoesHelper.spec.ts
// ============================================================================
import { describe, expect, it } from "@jest/globals";

import {
  calcularResumoPixTransacoes,
  chaveCompra,
  montarPixTransacao,
  normalizarId,
  statusConciliacao,
  statusPagamento,
} from "../../../src/modules/tesouraria/helpers/pixTransacoesHelper";
import { BilheteComNumero } from "../../../src/modules/tesouraria/types/tesourariaTypes";

function criarBilhete(
  sobrescritas: Partial<BilheteComNumero> = {},
): BilheteComNumero {
  return {
    numero: "001",
    status: "pendente",
    comprador_nome: "Comprador",
    data_reserva: "2026-01-01T10:00:00.000Z",
    ...sobrescritas,
  };
}

describe("Helper: pixTransacoesHelper", () => {
  it("Deve criar chave de compra por comprovante, comprador e fallback manual", () => {
    expect(chaveCompra(criarBilhete({ pix_order_id: "ORDE_001" }))).toBe(
      "pix-ORDE_001",
    );

    expect(
      chaveCompra(
        criarBilhete({
          comprovante_url: "https://storage.mock/comprovante.png",
          comprador_id: "COMPRA_001",
        }),
      ),
    ).toBe("comprovante-https://storage.mock/comprovante.png");

    expect(chaveCompra(criarBilhete({ comprador_id: "COMPRA_001" }))).toBe(
      "comprador-COMPRA_001",
    );

    expect(
      chaveCompra(
        criarBilhete({
          comprador_nome: "Maria",
          data_reserva: "2026-01-01T10:00:00.000Z",
          status: "pendente",
        }),
      ),
    ).toBe("manual|Maria|2026-01-01T10:00:00.000Z|pendente");
  });

  it("Deve normalizar IDs removendo caracteres incompatíveis", () => {
    expect(normalizarId("  comprovante://abc 123 !!  ")).toBe(
      "comprovante-abc-123",
    );
    expect(normalizarId("a".repeat(300))).toHaveLength(255);
  });

  it("Deve mapear status de pagamento para o contrato Pix", () => {
    expect(statusPagamento("pago")).toBe("PAID");
    expect(statusPagamento("recusado")).toBe("DECLINED");
    expect(statusPagamento("pendente")).toBe("WAITING");
    expect(statusPagamento("reservado")).toBe("WAITING");
    expect(statusPagamento("reservado", "PAID")).toBe("PAID");
  });



  it("Deve montar uma transação Pix ordenando rifas numericamente", () => {
    const transacao = montarPixTransacao([
      criarBilhete({
        numero: "010",
        status: "pago",
        comprador_id: "COMPRA_001",
        comprador_nome: "Ana",
        comprador_email: "ana@teste.com",
        comprador_telefone: "11999999999",
        vendedor_id: "ADERIDO_001",
        vendedor_nome: "Aderido Um",
        vendedor_cpf: "111",
        comprovante_url: "https://storage.mock/comprovante-1.png",
        data_pagamento: "2026-01-02T10:00:00.000Z",
      }),
      criarBilhete({
        numero: "002",
        status: "pago",
        comprador_id: "COMPRA_001",
        comprador_nome: "Ana",
        comprador_email: "ana@teste.com",
        vendedor_id: "ADERIDO_001",
        vendedor_nome: "Aderido Um",
        vendedor_cpf: "111",
        comprovante_url: "https://storage.mock/comprovante-1.png",
        data_pagamento: "2026-01-02T10:00:00.000Z",
      }),
    ]);

    expect(transacao).toEqual(
      expect.objectContaining({
        
        metodo: "PIX",
        statusPagamento: "PAID",
        valorBruto: 20,
        valorPago: 20,
        compradorNome: "Ana",
        compradorEmail: "ana@teste.com",
        quantidadeRifas: 2,
      }),
    );
    expect(transacao.rifas).toEqual([
      { numero: "002", status: "pago" },
      { numero: "010", status: "pago" },
    ]);
  });

  it("Deve adicionar observação padrão para transação recusada", () => {
    const transacao = montarPixTransacao([
      criarBilhete({
        status: "recusado",
        motivo_recusa: "Valor divergente",
      }),
    ]);

    expect(transacao.statusPagamento).toBe("DECLINED");
    expect(transacao.valorPago).toBe(0);
    expect(transacao.observacao).toBe("Valor divergente");
  });

  it("Deve calcular resumo financeiro das transações Pix", () => {
    const resumo = calcularResumoPixTransacoes([
      {
        id: "paga",
        referenceId: "paga",
        metodo: "PIX",
        statusPagamento: "PAID",
        statusConciliacao: "conciliada",
        valorBruto: 100,
        valorPago: 100,
        moeda: "BRL",
        dataCriacao: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "pendente",
        referenceId: "pendente",
        metodo: "PIX",
        statusPagamento: "WAITING",
        statusConciliacao: "pendente",
        valorBruto: 20,
        valorPago: 0,
        moeda: "BRL",
        dataCriacao: "2026-01-02T00:00:00.000Z",
      },
      {
        id: "recusada",
        referenceId: "recusada",
        metodo: "PIX",
        statusPagamento: "DECLINED",
        statusConciliacao: "divergente",
        valorBruto: 10,
        valorPago: 0,
        moeda: "BRL",
        dataCriacao: "2026-01-03T00:00:00.000Z",
      },
      {
        id: "sem-aderido",
        referenceId: "sem-aderido",
        metodo: "PIX",
        statusPagamento: "PAID",
        statusConciliacao: "nao_identificada",
        valorBruto: 30,
        valorPago: 30,
        moeda: "BRL",
        dataCriacao: "2026-01-04T00:00:00.000Z",
      },
      {
        id: "com-erro",
        referenceId: "com-erro",
        metodo: "PIX",
        statusPagamento: "ERROR",
        statusConciliacao: "nao_identificada",
        valorBruto: 50,
        valorPago: 0,
        moeda: "BRL",
        dataCriacao: "2026-01-05T00:00:00.000Z",
      },
    ]);

    expect(resumo).toEqual({
      totalRecebido: 128.7,
      totalPendente: 20,
      totalCancelado: 10,
      quantidadePagas: 2,
      quantidadeAguardando: 1,
      quantidadeCanceladas: 1,
      ticketMedio: 64.35,
      quantidadeErros: 1,
      totalErros: 50,
      totalTransacoes: 5,
    });
  });
});
