import { beforeEach, describe, expect, it, vi } from "vitest";

import { relatorioTesourariaService } from "@/features/tesouraria/services/relatorioTesourariaService";
import { RESUMO_GERAL_DESEMPENHO_VAZIO } from "@/features/tesouraria/utils/desempenhoDataUtils";
import { fetchAPI } from "@/shared/services/api";

vi.mock("@/shared/services/api", () => ({
  fetchAPI: vi.fn(),
}));

describe("Service: relatorioTesourariaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Deve consultar /tesouraria/relatorio e normalizar resumo geral e aderidos com splits", async () => {
    const relatorioBruto = {
      resumoGeral: {
        totalArrecadado: 1200,
        totalArrecadadoLiquido: 1190,
        rifasPagas: 120,
        rifasPagasPix: 100,
        rifasPagasComprovante: 20,
        valorArrecadadoPixBruto: 1000,
        valorArrecadadoPixLiquido: 990,
        valorArrecadadoComprovante: 200,
        rifasPendentes: 10,
        rifasPendentesPix: 8,
        rifasPendentesComprovante: 2,
        aderidosAtivos: 5,
      },
      aderidos: [
        {
          id: "usr_1",
          nome: "Aluno Teste",
          cpf: "111.222.333-44",
          curso: "Engenharia",
          modalidadeAdesao: "completo",
          cargo: "Membro",
          arrecadado: 600,
          arrecadadoLiquido: 595,
          meta: 1200,
          rifasVendidas: 60,
          rifasVendidasPix: 50,
          rifasVendidasComprovante: 10,
          rifasPendentes: 5,
        },
      ],
    };

    vi.mocked(fetchAPI).mockResolvedValueOnce(relatorioBruto);

    const resultado =
      await relatorioTesourariaService.obterRelatorioTesouraria();

    expect(fetchAPI).toHaveBeenCalledWith("/tesouraria/relatorio");
    expect(resultado.resumoGeral).toEqual(relatorioBruto.resumoGeral);
    expect(resultado.aderidos).toHaveLength(1);
    expect(resultado.aderidos[0].arrecadadoLiquido).toBe(595);
    expect(resultado.aderidos[0].rifasVendidasPix).toBe(50);
  });

  it("Deve retornar valores padrão seguros quando a API responder com objeto vazio", async () => {
    vi.mocked(fetchAPI).mockResolvedValueOnce({});

    const resultado =
      await relatorioTesourariaService.obterRelatorioTesouraria();

    expect(resultado).toEqual({
      resumoGeral: RESUMO_GERAL_DESEMPENHO_VAZIO,
      aderidos: [],
    });
  });
});
