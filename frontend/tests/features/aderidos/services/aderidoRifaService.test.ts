import { beforeEach, describe, expect, it, vi } from "vitest";

import { aderidoRifaService } from "@/features/aderidos/services/aderidoRifaService";
import { fetchAPI } from "@/shared/services/api";

vi.mock("@/shared/services/api", () => ({
  fetchAPI: vi.fn(),
}));

describe("Service: aderidoRifaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Deve buscar minhas rifas e retornar os bilhetes", async () => {
    vi.mocked(fetchAPI).mockResolvedValueOnce({
      bilhetes: [{ numero: "001" }],
    });

    const resultado = await aderidoRifaService.buscarMinhasRifas();

    expect(fetchAPI).toHaveBeenCalledWith("/rifas/minhas-rifas");
    expect(resultado).toEqual([{ numero: "001" }]);
  });

  it("Deve retornar array vazio se nao houver bilhetes", async () => {
    vi.mocked(fetchAPI).mockResolvedValueOnce({});

    const resultado = await aderidoRifaService.buscarMinhasRifas();

    expect(resultado).toEqual([]);
  });

  it("Deve corrigir apenas dados das rifas recusadas", async () => {
    vi.mocked(fetchAPI).mockResolvedValueOnce({ sucesso: true });

    const resultado = await aderidoRifaService.corrigirDadosRifasRecusadas({
      numerosRifas: ["015"],
      nome: "Ana",
      telefone: "(11) 99999-9999",
      email: "ana@teste.com",
    });

    expect(resultado).toBe(true);
    expect(fetchAPI).toHaveBeenCalledWith("/rifas/corrigir-dados", "POST", {
      nome: "Ana",
      telefone: "(11) 99999-9999",
      email: "ana@teste.com",
      numerosRifas: ["015"],
    });
  });

  it("Deve obter o relatório consolidado de vendas do aderido autenticado", async () => {
    const relatorioMock = {
      aderido: { nome: "Gabriel", email: "gabriel@unifei.br" },
      geradoEm: "2026-11-04T10:00:00Z",
      resumo: {
        totalRifasLote: 25,
        totalVendidas: 10,
        rifasPagas: 8,
        valorPagoConfirmado: 80,
        rifasEmAnalise: 2,
        valorEmAnalise: 20,
        rifasDisponiveis: 15,
        valorTotalNegociado: 100,
      },
      itens: [],
    };

    vi.mocked(fetchAPI).mockResolvedValueOnce(relatorioMock);

    const resultado = await aderidoRifaService.obterMeuRelatorioVendas();

    expect(fetchAPI).toHaveBeenCalledWith("/rifas/meu-relatorio");
    expect(resultado).toEqual(relatorioMock);
  });
});
