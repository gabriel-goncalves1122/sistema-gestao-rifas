import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { conciliacaoExtratoService } from "@/features/tesouraria/services/conciliacaoExtratoService";
import { useConciliacaoExtrato } from "@/features/tesouraria/hooks/useConciliacaoExtrato";

vi.mock("@/features/tesouraria/services/conciliacaoExtratoService", () => ({
  conciliacaoExtratoService: {
    analisarExtrato: vi.fn(),
    aprovarLote: vi.fn(),
  },
}));

describe("useConciliacaoExtrato", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve iniciar com estado fechado e sem resultados", () => {
    const { result } = renderHook(() => useConciliacaoExtrato());

    expect(result.current.aberto).toBe(false);
    expect(result.current.arquivo).toBeNull();
    expect(result.current.resultado).toBeNull();
    expect(result.current.selecionados.size).toBe(0);
  });

  it("deve abrir e fechar o diálogo corretamente", () => {
    const { result } = renderHook(() => useConciliacaoExtrato());

    act(() => {
      result.current.abrirDialog();
    });
    expect(result.current.aberto).toBe(true);

    act(() => {
      result.current.fecharDialog();
    });
    expect(result.current.aberto).toBe(false);
  });

  it("deve processar arquivo e pré-selecionar matches 100% exatos", async () => {
    const mockResposta = {
      resumo: {
        totalLinhasExtrato: 2,
        totalPendenciasSistema: 2,
        totalMatchesExatos: 1,
        totalMatchesAproximados: 1,
        totalSemMatchExtrato: 0,
        totalSemMatchSistema: 0,
        valorTotalMatches: 50,
      },
      matches: [
        {
          pagamentoId: "pag_1",
          tipoMatch: "TXID_EXATO" as const,
          alvoMatch: "TXID" as const,
          confianca: 1.0,
          compradorNome: "João",
          nomePagadorBanco: "João",
          valorEsperado: 20,
          valorBanco: 20,
          numerosRifas: ["001", "002"],
          dataBanco: "10/11/2026",
          dataReserva: "10/11/2026",
        },
        {
          pagamentoId: "pag_2",
          tipoMatch: "NOME_VALOR_APROXIMADO" as const,
          alvoMatch: "COMPRADOR" as const,
          confianca: 0.85,
          compradorNome: "Maria",
          nomePagadorBanco: "Maria Silva",
          valorEsperado: 30,
          valorBanco: 30,
          numerosRifas: ["003", "004", "005"],
          dataBanco: "10/11/2026",
          dataReserva: "10/11/2026",
        },
      ],
      naoIdentificadosExtrato: [],
    };

    vi.mocked(conciliacaoExtratoService.analisarExtrato).mockResolvedValue(
      mockResposta,
    );

    const { result } = renderHook(() => useConciliacaoExtrato());
    const file = new File(
      ["Data,Nome,Valor,Identificador\n10/11/2026,João,20.00,RIFA001"],
      "extrato.csv",
      { type: "text/csv" },
    );

    await act(async () => {
      await result.current.processarArquivo(file);
    });

    expect(result.current.resultado).toEqual(mockResposta);
    // Somente o match 1.0 (pag_1) deve vir pré-selecionado automaticamente
    expect(result.current.selecionados.has("pag_1")).toBe(true);
    expect(result.current.selecionados.has("pag_2")).toBe(false);
  });

  it("deve alternar a seleção de itens e calcular o valor total selecionado", async () => {
    const mockResposta = {
      resumo: {
        totalLinhasExtrato: 1,
        totalPendenciasSistema: 1,
        totalMatchesExatos: 1,
        totalMatchesAproximados: 0,
        totalSemMatchExtrato: 0,
        totalSemMatchSistema: 0,
        valorTotalMatches: 20,
      },
      matches: [
        {
          pagamentoId: "pag_1",
          tipoMatch: "TXID_EXATO" as const,
          alvoMatch: "TXID" as const,
          confianca: 1.0,
          compradorNome: "João",
          nomePagadorBanco: "João",
          valorEsperado: 20,
          valorBanco: 20,
          numerosRifas: ["001"],
          dataBanco: "10/11/2026",
          dataReserva: "10/11/2026",
        },
      ],
      naoIdentificadosExtrato: [],
    };

    vi.mocked(conciliacaoExtratoService.analisarExtrato).mockResolvedValue(
      mockResposta,
    );

    const { result } = renderHook(() => useConciliacaoExtrato());
    const file = new File(["dummy text content"], "extrato.csv", {
      type: "text/csv",
    });

    await act(async () => {
      await result.current.processarArquivo(file);
    });

    expect(result.current.valorTotalSelecionado).toBe(20);

    act(() => {
      result.current.toggleSelecao("pag_1");
    });
    expect(result.current.selecionados.has("pag_1")).toBe(false);
    expect(result.current.valorTotalSelecionado).toBe(0);
  });
});
