import { beforeEach, describe, expect, it, vi } from "vitest";

import { desempenhoService } from "@/features/tesouraria/services/desempenhoService";
import { RESUMO_GERAL_DESEMPENHO_VAZIO } from "@/features/tesouraria/utils/desempenhoDataUtils";
import { fetchAPI } from "@/shared/services/api";

vi.mock("@/shared/services/api", () => ({
  fetchAPI: vi.fn(),
}));

describe("Service: desempenhoService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Deve buscar relatório de desempenho no endpoint legado atual", async () => {
    const relatorioApi = {
      resumoGeral: { totalArrecadado: 500, rifasPagas: 50, aderidosAtivos: 10 },
      aderidos: [{ arrecadado: 150, meta: 100 }],
    };
    vi.mocked(fetchAPI).mockResolvedValueOnce(relatorioApi);

    const resultado = await desempenhoService.buscarRelatorio();

    expect(fetchAPI).toHaveBeenCalledWith("/tesouraria/relatorio");
    expect(resultado).toEqual({
      resumoGeral: {
        ...RESUMO_GERAL_DESEMPENHO_VAZIO,
        totalArrecadado: 500,
        totalArrecadadoLiquido: 500,
        rifasPagas: 50,
        aderidosAtivos: 10,
      },
      aderidos: [
        {
          nome: "Aderido Não Identificado",
          cpf: "-",
          arrecadado: 150,
          arrecadadoLiquido: 150,
          meta: 100,
          rifasVendidas: 0,
          rifasVendidasPix: 0,
          rifasVendidasComprovante: 0,
          rifasPendentes: 0,
        },
      ],
    });
  });

  it("Deve normalizar relatório vazio sem quebrar a tela", async () => {
    vi.mocked(fetchAPI).mockResolvedValueOnce({});

    const resultado = await desempenhoService.buscarRelatorio();

    expect(resultado).toEqual({
      resumoGeral: RESUMO_GERAL_DESEMPENHO_VAZIO,
      aderidos: [],
    });
  });

  it("Deve buscar histórico detalhado no endpoint legado atual", async () => {
    const historico = [
      { status: "pago", data_reserva: "2026-05-01", valor: 100 },
    ];
    vi.mocked(fetchAPI).mockResolvedValueOnce({ historico });

    const resultado = await desempenhoService.buscarHistoricoDetalhado();

    expect(fetchAPI).toHaveBeenCalledWith("/tesouraria/historico");
    expect(resultado).toEqual(historico);
  });

  it("Deve retornar histórico vazio quando o payload vier sem lista", async () => {
    vi.mocked(fetchAPI).mockResolvedValueOnce({});

    const resultado = await desempenhoService.buscarHistoricoDetalhado();

    expect(resultado).toEqual([]);
  });
});
