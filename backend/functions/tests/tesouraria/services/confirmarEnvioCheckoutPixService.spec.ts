// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/services/confirmarEnvioCheckoutPixService.spec.ts
// ============================================================================

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockGet = jest.fn<any>();
const mockSet = jest.fn<any>();
const mockRunTransaction = jest.fn<any>();
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
          })),
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

jest.mock("../../../src/modules/rifas/helpers/usuarioRifasHelper", () => ({
  obterContextoAderidoPorEmail: jest.fn(),
}));

import { obterContextoAderidoPorEmail } from "../../../src/modules/rifas/helpers/usuarioRifasHelper";

jest.mock("../../../src/modules/rifas/emailService", () => ({
  enviarEmailRecibo: jest.fn().mockResolvedValue(true),
}));

import { enviarEmailRecibo } from "../../../src/modules/rifas/emailService";
import { ConfirmarEnvioCheckoutPixService } from "../../../src/modules/tesouraria/services/confirmarEnvioCheckoutPixService";

describe("ConfirmarEnvioCheckoutPixService", () => {
  const contextoMock = {
    idAderido: "ADERIDO_123",
    vendedorNome: "João Aderido",
    vendedorCpf: "11122233344",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (obterContextoAderidoPorEmail as jest.Mock).mockResolvedValue(contextoMock);
  });

  it("deve rejeitar chamada sem autenticação", async () => {
    await expect(
      ConfirmarEnvioCheckoutPixService.executar({
        uid: "",
        emailLogado: "teste@unifei.edu.br",
        pagamentoId: "PAG_1",
      }),
    ).rejects.toThrow("UNAUTHORIZED");
  });

  it("deve transicionar bilhetes para pendente e salvar comprovante na transação", async () => {
    const mockPagamentoData = {
      vendedor_id: "ADERIDO_123",
      status_pagamento_banco: "WAITING",
      numeros_rifas: ["001", "002"],
      comprador_email: "comprador@gmail.com",
      comprador_nome: "Maria Compradora",
    };

    mockRunTransaction.mockImplementation(async (cb: any) => {
      return cb({
        get: jest.fn().mockImplementation((ref: any) => {
          if (ref.id === "PAG_1") {
            return Promise.resolve({ exists: true, data: () => mockPagamentoData });
          }
          return Promise.resolve({ exists: true, data: () => ({ status: "reservado" }) });
        }),
        set: mockSet,
      });
    });

    const resultado = await ConfirmarEnvioCheckoutPixService.executar({
      uid: "uid_aderido",
      emailLogado: "aderido@unifei.edu.br",
      pagamentoId: "PAG_1",
      comprovanteUrl: "https://storage.googleapis.com/comprovantes/comp_123.pdf",
      hashComprovante: "a1b2c3d4e5",
    });

    expect(resultado.sucesso).toBe(true);
    expect(resultado.pagamentoId).toBe("PAG_1");
    expect(resultado.rifas).toEqual(["001", "002"]);

    // Verifica mutações no Firestore
    expect(mockSet).toHaveBeenCalledTimes(3); // 1 para pagamento + 2 para os bilhetes
    expect(enviarEmailRecibo).toHaveBeenCalledWith(
      "comprador@gmail.com",
      "Maria Compradora",
      ["001", "002"],
      "pendente",
    );
  });

  it("deve impedir confirmação se a transação já foi paga", async () => {
    mockRunTransaction.mockImplementation(async (cb: any) => {
      return cb({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            vendedor_id: "ADERIDO_123",
            status_pagamento_banco: "PAID",
          }),
        }),
        set: mockSet,
      });
    });

    await expect(
      ConfirmarEnvioCheckoutPixService.executar({
        uid: "uid_aderido",
        emailLogado: "aderido@unifei.edu.br",
        pagamentoId: "PAG_JA_PAGO",
      }),
    ).rejects.toThrow("TRANSACAO_JA_FINALIZADA");
  });
});
