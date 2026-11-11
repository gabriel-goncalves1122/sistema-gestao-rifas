import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import * as admin from "firebase-admin";

const mockGet = jest.fn<any>();
const mockSet = jest.fn<any>();
const mockDoc = jest.fn<any>();
const mockRunTransaction = jest.fn<any>();

jest.mock("../../src/shared/config/firebaseAdmin", () => ({
  db: {
    doc: mockDoc,
    runTransaction: mockRunTransaction,
  },
}));

import {
  MENSAGEM_PADRAO_MANUTENCAO,
  mapearParaManutencaoDto,
  obterStatusManutencao,
  atualizarStatusManutencao,
  invalidarCacheManutencao,
} from "../../src/modules/sistema/sistemaService";

describe("sistemaService - Modo de Manutenção", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidarCacheManutencao();

    mockDoc.mockReturnValue({
      get: mockGet,
    });
  });

  describe("mapearParaManutencaoDto", () => {
    it("deve retornar valores padrão seguros quando dados forem indefinidos", () => {
      const dto = mapearParaManutencaoDto(undefined);

      expect(dto.emManutencao).toBe(false);
      expect(dto.mensagem).toBe(MENSAGEM_PADRAO_MANUTENCAO);
      expect(dto.previsaoRetorno).toBeNull();
      expect(dto.atualizadoEm).toBeNull();
      expect(dto.atualizadoPor).toBeNull();
    });

    it("deve converter Timestamp do Firestore para ISO 8601", () => {
      const dataIso = "2026-11-11T12:00:00.000Z";
      const mockTimestamp = {
        toDate: () => new Date(dataIso),
      };

      const dto = mapearParaManutencaoDto({
        em_manutencao: true,
        mensagem: "Manutenção programada",
        previsao_retorno: "22h00",
        atualizado_em: mockTimestamp as any,
        atualizado_por: "admin@unifei.edu.br",
      });

      expect(dto.emManutencao).toBe(true);
      expect(dto.mensagem).toBe("Manutenção programada");
      expect(dto.previsaoRetorno).toBe("22h00");
      expect(dto.atualizadoEm).toBe(dataIso);
      expect(dto.atualizadoPor).toBe("admin@unifei.edu.br");
    });
  });

  describe("obterStatusManutencao", () => {
    it("deve buscar no Firestore e retornar status quando documento existe", async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          em_manutencao: true,
          mensagem: "Atualizando banco",
          previsao_retorno: "15:00",
          atualizado_por: "admin@teste.com",
        }),
      });

      const dto = await obterStatusManutencao(true);

      expect(mockDoc).toHaveBeenCalledWith("configuracoes/manutencao");
      expect(dto.emManutencao).toBe(true);
      expect(dto.mensagem).toBe("Atualizando banco");
      expect(dto.previsaoRetorno).toBe("15:00");
    });

    it("deve usar cache em memória quando dentro do TTL", async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          em_manutencao: false,
          mensagem: "Normal",
        }),
      });

      const primeiro = await obterStatusManutencao();
      expect(mockGet).toHaveBeenCalledTimes(1);

      const segundo = await obterStatusManutencao();
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(segundo).toEqual(primeiro);
    });
  });

  describe("atualizarStatusManutencao", () => {
    it("deve executar via runTransaction e persistir os campos", async () => {
      mockRunTransaction.mockImplementationOnce(async (cb: any) => {
        const fakeTx = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              mensagem: "Antiga mensagem",
              previsao_retorno: null,
              atualizado_por: "antigo@teste.com",
            }),
          }),
          set: mockSet,
        };
        return cb(fakeTx);
      });

      const resultado = await atualizarStatusManutencao(
        {
          emManutencao: true,
          mensagem: "Nova manutenção",
          previsaoRetorno: "23:00",
        },
        "admin@teste.com",
      );

      expect(mockRunTransaction).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          em_manutencao: true,
          mensagem: "Nova manutenção",
          previsao_retorno: "23:00",
          atualizado_por: "admin@teste.com",
        }),
        { merge: true },
      );
      expect(resultado.emManutencao).toBe(true);
      expect(resultado.mensagem).toBe("Nova manutenção");
      expect(resultado.previsaoRetorno).toBe("23:00");
    });
  });
});
