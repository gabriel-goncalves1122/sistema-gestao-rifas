// ============================================================================
// ARQUIVO: backend/functions/tests/rifas/services/aderidoRifasService.spec.ts
// ============================================================================
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockGet = jest.fn<any>();
const mockDocGet = jest.fn<any>();

jest.mock("firebase-admin", () => {
  const docMock = {
    get: mockDocGet,
  };

  const collectionMock = {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnValue(docMock),
    get: mockGet,
  };

  return {
    firestore: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue(collectionMock),
    }),
  };
});

import { AderidoRifasService } from "../../../src/modules/rifas/services/aderidoRifasService";

describe("Service: AderidoRifasService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("buscarPorAderido", () => {
    it("Deve lançar USER_NOT_FOUND se o e-mail não estiver na base oficial", async () => {
      mockGet.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      await expect(
        AderidoRifasService.buscarPorAderido("intruso@teste.com"),
      ).rejects.toThrow("USER_NOT_FOUND");
    });

    it("Deve retornar os bilhetes ordenados numericamente quando o usuário existir", async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: "DOC_USUARIO_001",
            data: () => ({
              id_aderido: "ADERIDO_001",
            }),
          },
        ],
      });

      mockGet.mockResolvedValueOnce({
        docs: [
          { data: () => ({ numero: "005", status: "pendente" }) },
          { data: () => ({ numero: "001", status: "pago" }) },
        ],
      });

      const resultado =
        await AderidoRifasService.buscarPorAderido("valido@teste.com");

      expect(resultado).toHaveLength(2);
      expect(resultado[0].numero).toBe("001");
      expect(resultado[1].numero).toBe("005");
    });

    it("Deve usar o ID do documento como fallback quando não houver id_aderido", async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: "UID_DOCUMENTO_001",
            data: () => ({}),
          },
        ],
      });

      mockGet.mockResolvedValueOnce({
        docs: [{ data: () => ({ numero: "010", status: "disponivel" }) }],
      });

      const resultado =
        await AderidoRifasService.buscarPorAderido("valido@teste.com");

      expect(resultado).toEqual([{ numero: "010", status: "disponivel" }]);
    });

    it("Deve normalizar bilhete com reserva Pix expirada para disponivel na listagem do aderido", async () => {
      const passado = new Date(Date.now() - 45 * 60 * 1000).toISOString();

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: "DOC_USUARIO_001",
            data: () => ({
              id_aderido: "ADERIDO_001",
            }),
          },
        ],
      });

      mockGet.mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              numero: "007",
              status: "reservado",
              data_expiracao: passado,
              status_pagamento_banco: "WAITING",
              pix_order_id: "RIFA_EXP_007",
              comprador_nome: "Comprador Desistente",
            }),
          },
        ],
      });

      const resultado =
        await AderidoRifasService.buscarPorAderido("valido@teste.com");

      expect(resultado).toHaveLength(1);
      expect(resultado[0].status).toBe("disponivel");
      expect(resultado[0].comprador_nome).toBeUndefined();
      expect(resultado[0].pix_order_id).toBeNull();
    });
  });

  describe("obterRelatorioVendas", () => {
    it("Deve lançar USER_NOT_FOUND se o aderido não existir", async () => {
      mockGet.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      await expect(
        AderidoRifasService.obterRelatorioVendas("inexistente@teste.com"),
      ).rejects.toThrow("USER_NOT_FOUND");
    });

    it("Deve calcular métricas e mapear bilhetes vendidos com dados de compradores", async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: "DOC_ADERIDO_1",
            data: () => ({
              id_aderido: "ADERIDO_01",
              nome: "Formando Silva",
            }),
          },
        ],
      });

      mockGet.mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              numero: "020",
              status: "pago",
              valor_pago: 10,
              comprador_id: "COMPRADOR_A",
              pix_order_id: "pix_123",
              data_pagamento: "2026-11-01T10:00:00Z",
            }),
          },
          {
            data: () => ({
              numero: "005",
              status: "pendente",
              valor_bruto: 10,
              comprador_id: "COMPRADOR_B",
              comprovante_url: "https://storage/comprovante.jpg",
              data_reserva: "2026-11-02T12:00:00Z",
            }),
          },
          {
            data: () => ({
              numero: "015",
              status: "disponivel",
            }),
          },
          {
            data: () => ({
              numero: "002",
              status: "pago",
              comprador_nome: "Comprador Fallback",
              comprador_telefone: "11999999999",
            }),
          },
        ],
      });

      // Mocks para os compradores
      mockDocGet.mockImplementation((async () => ({
        exists: true,
        id: "COMPRADOR_A",
        data: () => ({
          nome: "Maria Compradora",
          telefone: "35988887777",
          email: "maria@teste.com",
        }),
      })) as any);

      const relatorio =
        await AderidoRifasService.obterRelatorioVendas("aderido@teste.com");

      expect(relatorio.aderido.nome).toBe("Formando Silva");
      expect(relatorio.aderido.email).toBe("aderido@teste.com");
      expect(relatorio.resumo).toEqual({
        totalRifasLote: 4,
        totalVendidas: 3,
        rifasPagas: 2,
        valorPagoConfirmado: 20,
        rifasEmAnalise: 1,
        valorEmAnalise: 10,
        rifasDisponiveis: 1,
        valorTotalNegociado: 30,
      });

      // Itens devem vir ordenados pelo número
      expect(relatorio.itens).toHaveLength(3);
      expect(relatorio.itens[0].numeroRifa).toBe(2);
      expect(relatorio.itens[0].status).toBe("pago");
      expect(relatorio.itens[0].statusFormatado).toBe("Pago");
      expect(relatorio.itens[0].compradorNome).toBe("Comprador Fallback");
      expect(relatorio.itens[0].canal).toBe("outro");

      expect(relatorio.itens[1].numeroRifa).toBe(5);
      expect(relatorio.itens[1].status).toBe("pendente");
      expect(relatorio.itens[1].statusFormatado).toBe("Em análise");
      expect(relatorio.itens[1].canal).toBe("comprovante");

      expect(relatorio.itens[2].numeroRifa).toBe(20);
      expect(relatorio.itens[2].status).toBe("pago");
      expect(relatorio.itens[2].statusFormatado).toBe("Pago");
      expect(relatorio.itens[2].canal).toBe("pix");
      expect(relatorio.itens[2].compradorNome).toBe("Maria Compradora");
    });
  });
});
