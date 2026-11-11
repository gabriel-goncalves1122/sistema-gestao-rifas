import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockGet = jest.fn<any>();
const mockSet = jest.fn<any>();
const mockRunTransaction = jest.fn<any>();
const mockWhere = jest.fn<any>();
const mockLimit = jest.fn<any>();
const mockDoc = jest.fn<any>();
const mockCollection = jest.fn<any>();

jest.mock("firebase-admin", () => {
  return {
    firestore: Object.assign(
      jest.fn().mockReturnValue({
        collection: mockCollection.mockImplementation((colPath: string) => ({
          doc: mockDoc.mockImplementation((docId?: string) => ({
            id: docId || "MOCK_DOC_ID",
            path: `${colPath}/${docId || "MOCK_DOC_ID"}`,
            get: mockGet,
            set: mockSet,
          })),
          where: mockWhere.mockReturnValue({
            where: mockWhere,
            limit: mockLimit.mockReturnValue({
              get: mockGet,
            }),
            get: mockGet,
          }),
        })),
        runTransaction: mockRunTransaction,
      }),
      {
        Timestamp: {
          now: () => ({ valueOf: () => Date.now() }),
          fromDate: (date: Date) => ({ valueOf: () => date.getTime() }),
        },
      },
    ),
  };
});

jest.mock("../../../src/modules/rifas/emailService", () => ({
  enviarEmailRecibo: jest.fn<any>().mockResolvedValue(true),
}));

import { ConciliacaoExtratoService } from "../../../src/modules/tesouraria/services/conciliacaoExtratoService";

describe("ConciliacaoExtratoService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("analisarExtrato", () => {
    it("deve identificar match exato por txid com 100% de confiança", async () => {
      // Mock de pagamentos_pix retornando uma pendência com reference_id "RIFAC8F2A1"
      const mockPixDocs = [
        {
          id: "pag_1",
          data: () => ({
            reference_id: "RIFAC8F2A1",
            pix_order_id: "RIFAC8F2A1",
            valor_bruto: 20,
            comprador_nome: "Pedro Henrique",
            vendedor_nome: "Fabiana Menegatti",
            numeros_rifas: ["00001", "00002"],
            status_pagamento_banco: "IN_ANALYSIS",
            status_validacao: "pendente",
          }),
        },
      ];

      // Primeira chamada: pagamentos_pix. Segunda: bilhetes (vazio para bilhetes avulsos)
      mockGet.mockResolvedValueOnce({
        forEach: (cb: any) => mockPixDocs.forEach(cb),
      });
      mockGet.mockResolvedValueOnce({
        forEach: () => {},
      });

      const csv = `Data,Nome,Valor,Identificador
10/11/2026,Pedro Henrique,20.00,RIFAC8F2A1
`;

      const resultado = await ConciliacaoExtratoService.analisarExtrato(csv);

      expect(resultado.resumo.totalMatchesExatos).toBe(1);
      expect(resultado.resumo.totalMatchesAproximados).toBe(0);
      expect(resultado.matches[0].tipoMatch).toBe("TXID_EXATO");
      expect(resultado.matches[0].alvoMatch).toBe("TXID");
      expect(resultado.matches[0].confianca).toBe(1.0);
      expect(resultado.matches[0].pagamentoId).toBe("pag_1");
    });

    it("deve identificar match sugerido quando o comprador pagou direto (sem txid)", async () => {
      const mockPixDocs = [
        {
          id: "pag_2",
          data: () => ({
            reference_id: "RIFA999999",
            valor_bruto: 30,
            comprador_nome: "Carlos Eduardo da Silva",
            vendedor_nome: "Lucas Aderido",
            numeros_rifas: ["00010", "00011", "00012"],
            status_pagamento_banco: "WAITING",
          }),
        },
      ];

      mockGet.mockResolvedValueOnce({
        forEach: (cb: any) => mockPixDocs.forEach(cb),
      });
      mockGet.mockResolvedValueOnce({
        forEach: () => {},
      });

      // Extrato bancário sem txid, apenas com nome similar do comprador
      const csv = `Data,Nome,Valor,Identificador
10/11/2026,CARLOS EDUARDO SILVA,30.00,
`;

      const resultado = await ConciliacaoExtratoService.analisarExtrato(csv);

      expect(resultado.resumo.totalMatchesExatos).toBe(0);
      expect(resultado.resumo.totalMatchesAproximados).toBe(1);
      expect(resultado.matches[0].tipoMatch).toBe("NOME_VALOR_APROXIMADO");
      expect(resultado.matches[0].alvoMatch).toBe("COMPRADOR");
      expect(resultado.matches[0].confianca).toBeGreaterThanOrEqual(0.7);
    });

    it("deve identificar match sugerido quando o ADERIDO pagou em nome do comprador", async () => {
      const mockPixDocs = [
        {
          id: "pag_3",
          data: () => ({
            reference_id: "RIFA888888",
            valor_bruto: 50,
            comprador_nome: "Comprador Externo Desconhecido",
            vendedor_nome: "Fabiana Menegatti",
            numeros_rifas: ["00020", "00021", "00022", "00023", "00024"],
            status_pagamento_banco: "WAITING",
          }),
        },
      ];

      mockGet.mockResolvedValueOnce({
        forEach: (cb: any) => mockPixDocs.forEach(cb),
      });
      mockGet.mockResolvedValueOnce({
        forEach: () => {},
      });

      // Extrato bancário veio com o nome do aderido que repassou o Pix
      const csv = `Data,Nome,Valor,Identificador
10/11/2026,FABIANA MENEGATTI,50.00,
`;

      const resultado = await ConciliacaoExtratoService.analisarExtrato(csv);

      expect(resultado.resumo.totalMatchesAproximados).toBe(1);
      expect(resultado.matches[0].alvoMatch).toBe("ADERIDO");
      expect(resultado.matches[0].confianca).toBe(1.0);
      expect(resultado.matches[0].vendedorNome).toBe("Fabiana Menegatti");
    });

    it("deve registrar linhas do extrato sem par como não identificadas", async () => {
      mockGet.mockResolvedValueOnce({
        forEach: () => {},
      });
      mockGet.mockResolvedValueOnce({
        forEach: () => {},
      });

      const csv = `Data,Nome,Valor,Identificador
10/11/2026,PESSOA ALEATORIA,15.00,
`;

      const resultado = await ConciliacaoExtratoService.analisarExtrato(csv);

      expect(resultado.matches).toHaveLength(0);
      expect(resultado.naoIdentificadosExtrato).toHaveLength(1);
      expect(resultado.resumo.totalSemMatchExtrato).toBe(1);
    });
  });

  describe("aprovarLoteConciliacao", () => {
    it("deve retornar vazio se a lista de itens estiver vazia", async () => {
      const res = await ConciliacaoExtratoService.aprovarLoteConciliacao(
        [],
        "USER_1",
      );
      expect(res.aprovadosCount).toBe(0);
      expect(res.sucesso).toBe(true);
    });

    it("deve aprovar os bilhetes e atualizar pagamentos_pix em runTransaction", async () => {
      mockRunTransaction.mockImplementation(async (cb: any) => {
        const fakeTx = {
          get: jest.fn().mockImplementation((ref: any) => {
            // Se for pagamentos_pix
            if (ref.path.includes("pagamentos_pix")) {
              return {
                exists: true,
                data: () => ({
                  numeros_rifas: ["001", "002"],
                  comprador_email: "cliente@teste.com",
                  comprador_nome: "Cliente Teste",
                  status_validacao: "pendente",
                }),
              };
            }
            // Se for bilhete
            return {
              exists: true,
              data: () => ({
                status: "pendente",
              }),
            };
          }),
          set: mockSet,
        };
        return cb(fakeTx);
      });

      const itens = [
        {
          pagamentoId: "pag_123",
          tipoMatch: "TXID_EXATO" as const,
          alvoMatch: "TXID" as const,
          valorBanco: 20,
          txidBanco: "RIFAC8F2A1",
        },
      ];

      const res = await ConciliacaoExtratoService.aprovarLoteConciliacao(
        itens,
        "TESOURARIA_UID",
        "tesouraria@unifei.edu.br",
      );

      expect(res.sucesso).toBe(true);
      expect(res.aprovadosCount).toBe(1);
      expect(res.totalRifasAprovadas).toBe(2);
      expect(res.valorTotalAprovado).toBe(20);
      expect(mockSet).toHaveBeenCalled();
    });
  });
});
