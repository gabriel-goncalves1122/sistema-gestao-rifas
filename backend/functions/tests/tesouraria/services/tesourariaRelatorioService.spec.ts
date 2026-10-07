import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockBilhetesWhere = jest.fn<any>();
const mockBilhetesGet = jest.fn<any>();
const mockCompradorDoc = jest.fn<any>();
const mockCompradorGet = jest.fn<any>();
const mockBatchUpdate = jest.fn<any>();
const mockBatchCommit = jest.fn<any>();
const mockUsuariosGet = jest.fn<any>();

const bilhetesCollectionMock = {
  where: mockBilhetesWhere.mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: mockBilhetesGet,
};

const compradorRefMock = {
  id: "comprador_123",
  get: mockCompradorGet,
};

const compradoresCollectionMock = {
  doc: mockCompradorDoc.mockReturnValue(compradorRefMock),
};

const usuariosCollectionMock = {
  get: mockUsuariosGet,
};

jest.mock("firebase-admin", () => ({
  firestore: jest.fn().mockReturnValue({
    collection: jest.fn((nome: string) => {
      if (nome === "bilhetes") return bilhetesCollectionMock;
      if (nome === "compradores") return compradoresCollectionMock;
      if (nome === "usuarios") return usuariosCollectionMock;

      return {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: [] }),
      };
    }),
    batch: jest.fn().mockReturnValue({
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    }),
  }),
}));

import { TesourariaRelatorioService } from "../../../src/modules/tesouraria/services/tesourariaRelatorioService";

describe("Service: TesourariaRelatorioService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompradorDoc.mockReturnValue(compradorRefMock);
  });

  describe("obterRelatorioTesouraria", () => {
    it("Deve calcular corretamente o relatório de tesouraria agrupando rifas pagas", async () => {
      mockUsuariosGet.mockResolvedValueOnce({
        docs: [
          { id: "u1", data: () => ({ role: "aderido", cpf: "111", nome: "Aderido 1" }) },
          { id: "u2", data: () => ({ role: "aderido", cpf: "222", nome: "Aderido 2", meta_vendas: 2000 }) },
          { id: "u3", data: () => ({ role: "admin", cpf: "333", nome: "Admin ignorado no relatório" }) },
        ]
      });

      mockBilhetesGet.mockResolvedValueOnce({
        forEach: (cb: any) => {
          cb({ data: () => ({ status: "pago", vendedor_cpf: "111" }) });
          cb({ data: () => ({ status: "pago", vendedor_cpf: "111" }) });
          cb({ data: () => ({ status: "pago", vendedor_cpf: "222" }) });
        }
      });

      const relatorio = await TesourariaRelatorioService.obterRelatorioTesouraria();

      expect(relatorio.aderidos.length).toBe(2);
      expect(relatorio.aderidos.find((a: any) => a.id === "u1")?.rifasVendidas).toBe(2);
      expect(relatorio.aderidos.find((a: any) => a.id === "u1")?.arrecadado).toBe(20);
      expect(relatorio.resumoGeral.totalArrecadado).toBe(30);
      expect(relatorio.resumoGeral.rifasPagas).toBe(3);
    });
  });

  describe("obterHistoricoDetalhado", () => {
    it("Deve retornar histórico detalhado ordenado por data_reserva desc", async () => {
      mockBilhetesGet.mockResolvedValueOnce({
        docs: [
          { id: "b1", data: () => ({ status: "pago", data_reserva: "2026-08-01T10:00:00Z" }) },
          { id: "b2", data: () => ({ status: "pendente", data_reserva: "2026-08-05T10:00:00Z" }) }
        ]
      });

      const historico = await TesourariaRelatorioService.obterHistoricoDetalhado();

      expect(historico.length).toBe(2);
      expect(historico[0].bilhetes).toContain("b2");
      expect(historico[1].bilhetes).toContain("b1");
    });
  });

  describe("atualizarCompradorCompra", () => {
    it("Deve atualizar dados do comprador nos bilhetes e no documento compradores", async () => {
      const bilheteRef001 = { path: "bilhetes/001" };
      const bilheteRef002 = { path: "bilhetes/002" };

      mockBilhetesGet.mockResolvedValueOnce({
        empty: false,
        size: 2,
        docs: [
          {
            id: "001",
            ref: bilheteRef001,
          },
          {
            id: "002",
            ref: bilheteRef002,
          },
        ],
      });
      mockCompradorGet.mockResolvedValueOnce({
        exists: true,
      });

      const resultado = await TesourariaRelatorioService.atualizarCompradorCompra(
        "comprador_123",
        {
          nome: "Maria Atualizada",
          email: "maria@teste.com",
          telefone: "35999990000",
        },
      );

      expect(mockBilhetesWhere).toHaveBeenCalledWith(
        "comprador_id",
        "==",
        "comprador_123",
      );
      expect(mockBatchUpdate).toHaveBeenCalledWith(bilheteRef001, {
        comprador_nome: "Maria Atualizada",
        comprador_email: "maria@teste.com",
        comprador_telefone: "35999990000",
      });
      expect(mockBatchUpdate).toHaveBeenCalledWith(bilheteRef002, {
        comprador_nome: "Maria Atualizada",
        comprador_email: "maria@teste.com",
        comprador_telefone: "35999990000",
      });
      expect(mockBatchUpdate).toHaveBeenCalledWith(compradorRefMock, {
        nome: "Maria Atualizada",
        email: "maria@teste.com",
        telefone: "35999990000",
      });
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      expect(resultado).toEqual({
        comprador_id: "comprador_123",
        nome: "Maria Atualizada",
        email: "maria@teste.com",
        telefone: "35999990000",
        rifasAtualizadas: 2,
        compradorDocumentoAtualizado: true,
      });
    });

    it("Deve atualizar bilhetes mesmo quando documento compradores não existir", async () => {
      mockBilhetesGet.mockResolvedValueOnce({
        empty: false,
        size: 1,
        docs: [
          {
            id: "003",
            ref: { path: "bilhetes/003" },
          },
        ],
      });
      mockCompradorGet.mockResolvedValueOnce({
        exists: false,
      });

      const resultado = await TesourariaRelatorioService.atualizarCompradorCompra(
        "comprador_sem_doc",
        {
          nome: "João",
          email: null,
          telefone: null,
        },
      );

      expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      expect(resultado.compradorDocumentoAtualizado).toBe(false);
    });

    it("Deve lançar COMPRA_NAO_ENCONTRADA quando não houver bilhetes", async () => {
      mockBilhetesGet.mockResolvedValueOnce({
        empty: true,
        size: 0,
        docs: [],
      });

      await expect(
        TesourariaRelatorioService.atualizarCompradorCompra("inexistente", {
          nome: "Pessoa",
        }),
      ).rejects.toThrow("COMPRA_NAO_ENCONTRADA");

      expect(mockBatchUpdate).not.toHaveBeenCalled();
      expect(mockBatchCommit).not.toHaveBeenCalled();
    });
  });
});
