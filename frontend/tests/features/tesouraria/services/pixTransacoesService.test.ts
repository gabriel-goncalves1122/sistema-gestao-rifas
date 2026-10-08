import { beforeEach, describe, expect, it, vi } from "vitest";

import { pixTransacoesService } from "@/features/tesouraria/services/pixTransacoesService";
import { PixTransacao } from "@/features/tesouraria/types/pixTransacoes";
import { fetchAPI } from "@/shared/services/api";

vi.mock("@/shared/services/api", () => ({
  fetchAPI: vi.fn(),
}));

function criarTransacao(
  parcial: Partial<PixTransacao>,
): PixTransacao {
  return {
    id: parcial.id || "tx_teste",
    referenceId: parcial.referenceId || "ref_teste",
    metodo: "PIX",
    statusPagamento: parcial.statusPagamento || "PAID",
    statusConciliacao: parcial.statusConciliacao || "conciliada",
    valorBruto: parcial.valorBruto ?? 10,
    valorPago: parcial.valorPago ?? 10,
    moeda: "BRL",
    dataCriacao: parcial.dataCriacao || "2026-10-01T10:00:00.000-03:00",
    ...parcial,
  };
}

describe("Service: pixTransacoesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Deve buscar transações no endpoint atual e normalizar o payload", async () => {
    const transacoes = [
      criarTransacao({ id: "tx_001", statusValidacao: "aceita" }),
    ];
    vi.mocked(fetchAPI).mockResolvedValueOnce({ transacoes });

    const resultado = await pixTransacoesService.buscarTransacoes();

    expect(fetchAPI).toHaveBeenCalledWith("/tesouraria/transacoes-bancarias");
    expect(resultado).toEqual(transacoes);
  });

  it("Deve normalizar status de validação Pix vindo no formato de API", async () => {
    const transacao = criarTransacao({ id: "tx_validacao" }) as PixTransacao & {
      status_validacao: string;
    };
    transacao.status_validacao = "negada";

    vi.mocked(fetchAPI).mockResolvedValueOnce({ transacoes: [transacao] });

    const resultado = await pixTransacoesService.buscarTransacoes();

    expect(resultado[0]).toMatchObject({
      id: "tx_validacao",
      statusValidacao: "negada",
    });
    expect(resultado[0]).not.toHaveProperty("status_validacao");
  });

  it("Deve retornar lista vazia quando o payload de transações vier ausente", async () => {
    vi.mocked(fetchAPI).mockResolvedValueOnce({});

    const resultado = await pixTransacoesService.buscarTransacoes();

    expect(resultado).toEqual([]);
  });

  it("Deve buscar resumo e preencher campos ausentes com zero", async () => {
    vi.mocked(fetchAPI).mockResolvedValueOnce({
      resumo: {
        totalRecebido: 50,
        quantidadePagas: 2,
      },
    });

    const resultado = await pixTransacoesService.buscarResumo();

    expect(fetchAPI).toHaveBeenCalledWith(
      "/tesouraria/transacoes-bancarias/resumo",
    );
    expect(resultado).toEqual({
      totalRecebido: 50,
      totalPendente: 0,
      totalCancelado: 0,
      totalErros: 0,
      quantidadePagas: 2,
      quantidadeAguardando: 0,
      quantidadeCanceladas: 0,
      quantidadeErros: 0,
      totalTransacoes: 0,
      ticketMedio: 0,
    });
  });

  it("Deve sincronizar usando POST sem alterar o contrato público", async () => {
    vi.mocked(fetchAPI).mockResolvedValueOnce({ sucesso: true });

    await pixTransacoesService.sincronizarBanco();

    expect(fetchAPI).toHaveBeenCalledWith(
      "/tesouraria/transacoes-bancarias/sincronizar",
      "POST",
    );
  });

  it("Deve aceitar transação Pix usando endpoint real de tesouraria", async () => {
    vi.mocked(fetchAPI).mockResolvedValueOnce({ sucesso: true });

    await pixTransacoesService.aceitarTransacao("ORDE_001");

    expect(fetchAPI).toHaveBeenCalledWith(
      "/tesouraria/transacoes-bancarias/ORDE_001/aceitar",
      "POST",
    );
  });

  it("Deve negar transação Pix usando endpoint real de tesouraria e motivo", async () => {
    vi.mocked(fetchAPI).mockResolvedValueOnce({ sucesso: true });

    await pixTransacoesService.negarTransacao(
      "ORDE_001",
      "Dados incorretos.",
    );

    expect(fetchAPI).toHaveBeenCalledWith(
      "/tesouraria/transacoes-bancarias/ORDE_001/negar",
      "POST",
      { motivo: "Dados incorretos." },
    );
  });
});
