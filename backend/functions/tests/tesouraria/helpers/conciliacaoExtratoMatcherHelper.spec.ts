import { describe, expect, it } from "@jest/globals";

import {
  CandidatoPendencia,
  executarMatchingExtratoPendencias,
} from "../../../src/modules/tesouraria/helpers/conciliacaoExtratoMatcherHelper";
import { LinhaExtratoBancario } from "../../../src/modules/tesouraria/utils/extratoBancarioParser";

describe("Helper: conciliacaoExtratoMatcherHelper", () => {
  const pendenciaBase: CandidatoPendencia = {
    pagamentoId: "pag_1",
    referenceId: "RIFATEST01",
    pixOrderId: "RIFATEST01",
    endToEndId: "E2E999",
    valorEsperado: 20,
    compradorNome: "Maria Clara Oliveira",
    vendedorNome: "Joao Vendedor",
    numerosRifas: ["001", "002"],
    dataReserva: "2026-11-11T10:00:00.000Z",
  };

  it("Deve priorizar match exato por TXID dentro da tolerância de valor", () => {
    const linhas: LinhaExtratoBancario[] = [
      {
        data: "2026-11-11",
        nomePagador: "NOME DIFERENTE",
        valor: 20.0,
        txid: "RIFATEST01",
      },
    ];

    const res = executarMatchingExtratoPendencias(linhas, [pendenciaBase]);
    expect(res.resumo.totalMatchesExatos).toBe(1);
    expect(res.matches[0].tipoMatch).toBe("TXID_EXATO");
    expect(res.matches[0].confianca).toBe(1);
    expect(res.naoIdentificadosExtrato).toHaveLength(0);
  });

  it("Deve realizar match exato por E2E quando TXID não estiver presente", () => {
    const linhas: LinhaExtratoBancario[] = [
      {
        data: "2026-11-11",
        nomePagador: "PAGADOR QUALQUER",
        valor: 20.0,
        endToEndId: "e2e999",
      },
    ];

    const res = executarMatchingExtratoPendencias(linhas, [pendenciaBase]);
    expect(res.resumo.totalMatchesExatos).toBe(1);
    expect(res.matches[0].tipoMatch).toBe("E2E_EXATO");
    expect(res.matches[0].alvoMatch).toBe("E2E");
  });

  it("Deve sugerir match por similaridade de nome (Comprador ou Aderido) com valor idêntico", () => {
    const linhas: LinhaExtratoBancario[] = [
      {
        data: "2026-11-11",
        nomePagador: "JOAO VENDEDOR",
        valor: 20.0,
      },
    ];

    const res = executarMatchingExtratoPendencias(linhas, [
      { ...pendenciaBase, endToEndId: undefined, referenceId: undefined, pixOrderId: undefined },
    ]);

    expect(res.resumo.totalMatchesAproximados).toBe(1);
    expect(res.matches[0].tipoMatch).toBe("NOME_VALOR_APROXIMADO");
    expect(res.matches[0].alvoMatch).toBe("ADERIDO");
  });

  it("Deve atribuir confiança 1.0 estrita quando o nome do comprador e o valor forem idênticos (mesmo sem TXID/E2E)", () => {
    const linhas: LinhaExtratoBancario[] = [
      {
        data: "2026-11-11",
        nomePagador: "Maria Clara Oliveira",
        valor: 20.0,
      },
    ];

    const res = executarMatchingExtratoPendencias(linhas, [
      { ...pendenciaBase, endToEndId: undefined, referenceId: undefined, pixOrderId: undefined },
    ]);

    expect(res.resumo.totalMatchesAproximados).toBe(1);
    expect(res.matches[0].tipoMatch).toBe("NOME_VALOR_APROXIMADO");
    expect(res.matches[0].alvoMatch).toBe("COMPRADOR");
    expect(res.matches[0].confianca).toBe(1.0);
  });

  it("Não deve casar linhas cujo valor divirja da pendência", () => {
    const linhas: LinhaExtratoBancario[] = [
      {
        data: "2026-11-11",
        nomePagador: "Maria Clara Oliveira",
        valor: 50.0,
        txid: "RIFATEST01",
      },
    ];

    const res = executarMatchingExtratoPendencias(linhas, [pendenciaBase]);
    expect(res.matches).toHaveLength(0);
    expect(res.naoIdentificadosExtrato).toHaveLength(1);
  });
});
