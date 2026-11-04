// ============================================================================
// ARQUIVO: frontend/tests/features/aderidos/utils/gerarPdfRelatorioAderido.test.ts
// ============================================================================
import { describe, expect, it, vi } from "vitest";
import jsPDF from "jspdf";

import { RelatorioVendasAderido } from "@/features/aderidos/types/painelAderido";
import { gerarPdfRelatorioAderido } from "@/features/aderidos/utils/gerarPdfRelatorioAderido";

describe("Util: gerarPdfRelatorioAderido", () => {
  const relatorioMockCompleto: RelatorioVendasAderido = {
    aderido: {
      nome: "João da Silva Sauro",
      email: "joao@teste.com",
    },
    geradoEm: "2026-11-04T12:00:00.000Z",
    resumo: {
      totalRifasLote: 25,
      totalVendidas: 4,
      rifasPagas: 3,
      valorPagoConfirmado: 30,
      rifasEmAnalise: 1,
      valorEmAnalise: 10,
      rifasDisponiveis: 21,
      valorTotalNegociado: 40,
    },
    itens: [
      {
        numeroRifa: 1,
        compradorNome: "Maria Oliveira",
        compradorTelefone: "35999998888",
        compradorEmail: "maria@teste.com",
        status: "pago",
        statusFormatado: "Pago",
        valor: 10,
        canal: "pix",
        data: "2026-11-01T10:00:00.000Z",
        orderId: "pix_001",
      },
      {
        numeroRifa: 2,
        compradorNome: "Carlos Souza",
        compradorTelefone: "11988887777",
        compradorEmail: "carlos@teste.com",
        status: "pendente",
        statusFormatado: "Em análise",
        valor: 10,
        canal: "comprovante",
        data: "2026-11-02T14:30:00.000Z",
        orderId: null,
      },
      {
        numeroRifa: 3,
        compradorNome: "Ana Paula",
        compradorTelefone: "",
        compradorEmail: "",
        status: "pago",
        statusFormatado: "Pago",
        valor: 10,
        canal: "outro",
        data: null,
        orderId: null,
      },
    ],
  };

  it("Deve instanciar e retornar um documento válido sem disparar download quando baixarArquivo=false", () => {
    const doc = gerarPdfRelatorioAderido(relatorioMockCompleto, false);

    expect(doc).toBeDefined();
    expect(doc.internal).toBeDefined();
    expect(doc.internal.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("Deve gerar documento corretamente quando não houver itens vendidos", () => {
    const relatorioVazio: RelatorioVendasAderido = {
      ...relatorioMockCompleto,
      resumo: {
        totalRifasLote: 25,
        totalVendidas: 0,
        rifasPagas: 0,
        valorPagoConfirmado: 0,
        rifasEmAnalise: 0,
        valorEmAnalise: 0,
        rifasDisponiveis: 25,
        valorTotalNegociado: 0,
      },
      itens: [],
    };

    const doc = gerarPdfRelatorioAderido(relatorioVazio, false);

    expect(doc).toBeDefined();
    expect(doc.internal.getNumberOfPages()).toBe(1);
  });

  it("Deve invocar doc.save() com nome sanitizado e formatado quando baixarArquivo=true", () => {
    const docInstance = new jsPDF();
    const saveSpy = vi.fn();
    docInstance.save = saveSpy as any;

    gerarPdfRelatorioAderido(relatorioMockCompleto, true, docInstance);

    expect(saveSpy).toHaveBeenCalledTimes(1);
    const nomeArquivo = saveSpy.mock.calls[0][0];
    expect(nomeArquivo).toMatch(
      /^relatorio-vendas-joao-da-silva-sauro-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
  });
});
