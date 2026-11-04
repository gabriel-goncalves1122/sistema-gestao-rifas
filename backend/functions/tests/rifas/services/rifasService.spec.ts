// ============================================================================
// ARQUIVO: backend/functions/tests/rifas/services/rifasService.spec.ts
// ============================================================================
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mocks = {
  buscarPorAderido: jest.fn<any>(),
  obterRelatorioVendas: jest.fn<any>(),
  processarVenda: jest.fn<any>(),
  corrigirRifasRecusadas: jest.fn<any>(),
  corrigirDadosRifasRecusadas: jest.fn<any>(),
  criarCobrancaPix: jest.fn<any>(),
  consultarCobrancaPix: jest.fn<any>(),
  processarWebhook: jest.fn<any>(),
  obterRelatorioTesouraria: jest.fn<any>(),
  obterHistoricoDetalhado: jest.fn<any>(),
};

jest.mock("../../../src/modules/rifas/services/aderidoRifasService", () => ({
  AderidoRifasService: {
    buscarPorAderido: mocks.buscarPorAderido,
    obterRelatorioVendas: mocks.obterRelatorioVendas,
  },
}));

jest.mock("../../../src/modules/rifas/services/vendaRifasService", () => ({
  VendaRifasService: {
    processarVenda: mocks.processarVenda,
  },
}));

jest.mock("../../../src/modules/rifas/services/correcaoRifasService", () => ({
  CorrecaoRifasService: {
    corrigirRifasRecusadas: mocks.corrigirRifasRecusadas,
  },
}));

jest.mock(
  "../../../src/modules/rifas/services/correcaoDadosRifasService",
  () => ({
    CorrecaoDadosRifasService: {
      corrigirDadosRifasRecusadas: mocks.corrigirDadosRifasRecusadas,
    },
  }),
);

jest.mock("../../../src/modules/rifas/services/relatorioRifasService", () => ({
  RelatorioRifasService: {
    obterRelatorioTesouraria: mocks.obterRelatorioTesouraria,
    obterHistoricoDetalhado: mocks.obterHistoricoDetalhado,
  },
}));

import { RifasService } from "../../../src/modules/rifas/rifasService";

describe("Fachada: RifasService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Deve delegar buscarPorAderido para AderidoRifasService", async () => {
    mocks.buscarPorAderido.mockResolvedValueOnce([{ numero: "001" }]);

    const resultado = await RifasService.buscarPorAderido("aderido@email.com");

    expect(mocks.buscarPorAderido).toHaveBeenCalledWith("aderido@email.com");
    expect(resultado).toEqual([{ numero: "001" }]);
  });

  it("Deve delegar obterRelatorioVendas para AderidoRifasService", async () => {
    const relatorioMock = {
      aderido: { nome: "Aderido", email: "aderido@email.com" },
      geradoEm: "2026-11-04T10:00:00Z",
      resumo: { totalVendidas: 5 },
      itens: [],
    };
    mocks.obterRelatorioVendas.mockResolvedValueOnce(relatorioMock);

    const resultado = await RifasService.obterRelatorioVendas("aderido@email.com");

    expect(mocks.obterRelatorioVendas).toHaveBeenCalledWith("aderido@email.com");
    expect(resultado).toEqual(relatorioMock);
  });

  it("Deve delegar processarVenda para VendaRifasService", async () => {
    const dadosVenda = {
      nome: "Comprador",
      telefone: "11999999999",
      numerosRifas: ["001"],
      comprovanteUrl: "https://storage.mock/comprovante.png",
    };

    mocks.processarVenda.mockResolvedValueOnce(undefined);

    await RifasService.processarVenda(
      "UID_001",
      "aderido@email.com",
      dadosVenda,
    );

    expect(mocks.processarVenda).toHaveBeenCalledWith(
      "UID_001",
      "aderido@email.com",
      dadosVenda,
    );
  });

  it("Deve delegar corrigirRifasRecusadas para CorrecaoRifasService", async () => {
    const dadosCorrecao = {
      nome: "Comprador",
      telefone: "11999999999",
      email: "comprador@email.com",
      comprovanteUrl: "https://storage.mock/comprovante.png",
    };

    mocks.corrigirRifasRecusadas.mockResolvedValueOnce(true);

    const resultado = await RifasService.corrigirRifasRecusadas(
      "aderido@email.com",
      ["010"],
      dadosCorrecao,
    );

    expect(mocks.corrigirRifasRecusadas).toHaveBeenCalledWith(
      "aderido@email.com",
      ["010"],
      dadosCorrecao,
    );

    expect(resultado).toBe(true);
  });

  it("Deve delegar corrigirDadosRifasRecusadas para CorrecaoDadosRifasService", async () => {
    const dadosCorrecao = {
      nome: "Comprador",
      telefone: "11999999999",
      email: "comprador@email.com",
    };

    mocks.corrigirDadosRifasRecusadas.mockResolvedValueOnce(true);

    const resultado = await RifasService.corrigirDadosRifasRecusadas(
      "aderido@email.com",
      ["010"],
      dadosCorrecao,
    );

    expect(mocks.corrigirDadosRifasRecusadas).toHaveBeenCalledWith(
      "aderido@email.com",
      ["010"],
      dadosCorrecao,
    );
    expect(resultado).toBe(true);
  });

  it("Deve delegar obterRelatorioTesouraria para RelatorioRifasService", async () => {
    const relatorio = {
      resumoGeral: {
        totalArrecadado: 100,
      },
      aderidos: [],
    };

    mocks.obterRelatorioTesouraria.mockResolvedValueOnce(relatorio);

    const resultado = await RifasService.obterRelatorioTesouraria();

    expect(mocks.obterRelatorioTesouraria).toHaveBeenCalledTimes(1);
    expect(resultado).toBe(relatorio);
  });

  it("Deve delegar obterHistoricoDetalhado para RelatorioRifasService", async () => {
    const historico = [{ status: "pago" }];

    mocks.obterHistoricoDetalhado.mockResolvedValueOnce(historico);

    const resultado = await RifasService.obterHistoricoDetalhado();

    expect(mocks.obterHistoricoDetalhado).toHaveBeenCalledTimes(1);
    expect(resultado).toBe(historico);
  });
});
