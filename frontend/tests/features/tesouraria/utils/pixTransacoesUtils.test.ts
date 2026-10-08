import { describe, expect, it } from "vitest";

import { pixTransacoesMock } from "@/features/tesouraria/mocks/pixTransacoesMock";
import { PixTransacao } from "@/features/tesouraria/types/pixTransacoes";
import {
  calcularResumoPixTransacoes,
  filtrarPixTransacoes,
  formatarMoedaPix,
  obterLabelStatusPagamento,
} from "@/features/tesouraria/utils/pixTransacoesUtils";

function criarTransacao(
  parcial: Partial<PixTransacao>,
): PixTransacao {
  return {
    id: parcial.id || "tx_teste",
    referenceId: parcial.referenceId || "ref_teste",
    metodo: "PIX",
    statusPagamento: parcial.statusPagamento || "PAID",

    valorBruto: parcial.valorBruto ?? 10,
    valorPago: parcial.valorPago ?? 10,
    moeda: "BRL",
    dataCriacao: parcial.dataCriacao || "2026-10-01T10:00:00.000-03:00",
    ...parcial,
  };
}

describe("Utils: pixTransacoesUtils", () => {
  it("Deve formatar moeda brasileira com fallback seguro", () => {
    expect(formatarMoedaPix(50)).toMatch(/R\$\s*50,00/);
    expect(formatarMoedaPix(undefined)).toMatch(/R\$\s*0,00/);
  });

  it("Deve traduzir status Pix", () => {
    expect(obterLabelStatusPagamento("PAID")).toBe("Pago");
    expect(obterLabelStatusPagamento("CANCELED")).toBe("Cancelado");
  });

  it("Deve calcular resumo financeiro a partir das transações mockadas do banco", () => {
    const resumo = calcularResumoPixTransacoes(pixTransacoesMock);

    expect(resumo.totalRecebido).toBe(49.5);
    expect(resumo.quantidadePagas).toBe(2);


    expect(resumo.ticketMedio).toBe(24.75);
  });

  it("Deve filtrar por CPF, documento do comprador, aderido e rifas", () => {
    const transacoes = [
      criarTransacao({
        id: "tx_001",
        referenceId: "pedido_ana",
        compradorNome: "Cliente Ana",
        compradorDocumento: "12345678900",
        aderido: { nome: "Ana Costa", cpf: "11122233344" },
        rifas: [{ numero: "010" }],
      }),
      criarTransacao({
        id: "tx_002",
        referenceId: "pedido_bruno",
        compradorNome: "Cliente Bruno",
        compradorDocumento: "98765432100",
        aderido: { nome: "Bruno Lima", cpf: "55566677788" },
        rifas: [{ numero: "099" }],
      }),
    ];

    expect(
      filtrarPixTransacoes(transacoes, {
        status: "novas",
        busca: "111.222.333-44",
      }),
    ).toEqual([transacoes[0]]);

    expect(
      filtrarPixTransacoes(transacoes, {
        status: "novas",
        busca: "98765432100",
      }),
    ).toEqual([transacoes[1]]);

    expect(
      filtrarPixTransacoes(transacoes, {
        status: "novas",
        busca: "bruno",
      }),
    ).toEqual([transacoes[1]]);

    expect(
      filtrarPixTransacoes(transacoes, {
        status: "novas",
        busca: "099",
      }),
    ).toEqual([transacoes[1]]);
  });

  it("Não deve usar reference ID como campo de busca da auditoria Pix", () => {
    const transacoes = [
      criarTransacao({
        id: "tx_001",
        referenceId: "pedido_ana",
        compradorNome: "Cliente Ana",
      }),
    ];

    expect(
      filtrarPixTransacoes(transacoes, {
        status: "novas",
        busca: "pedido_ana",
      }),
    ).toEqual([]);
  });

  it("Deve filtrar a fila de auditoria Pix por critérios operacionais", () => {
    const transacoes = [
      criarTransacao({
        id: "tx_pendente_banco",
        statusPagamento: "WAITING",
        valorPago: 0,
        dataPagamento: null,
        compradorId: "venda_002",
        aderido: { id: "aderido_002", nome: "Bruno Lima" },
        rifas: [{ numero: "020", status: "pendente" }],
      }),
      criarTransacao({
        id: "tx_aceita",
        statusPagamento: "PAID",
        compradorId: "venda_003",
        aderido: { id: "aderido_003", nome: "Carla Dias" },
        rifas: [{ numero: "030", status: "pago" }],
      }),
    ];

    expect(
      filtrarPixTransacoes(transacoes, {
        status: "novas",
        busca: "",
      }),
    ).toEqual([transacoes[1]]);

    expect(
      filtrarPixTransacoes(transacoes, {
        status: "aguardando_pagamento",
        busca: "",
      }),
    ).toEqual([transacoes[0]]);
  });
});
