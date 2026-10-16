// ============================================================================
// ARQUIVO: backend/functions/tests/rifas/services/correcaoRifasService.spec.ts
// ============================================================================
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

const mockGet = jest.fn<any>();
const mockTransactionGet = jest.fn<any>();
const mockTransactionUpdate = jest.fn<any>();
const mockRunTransaction = jest.fn<any>();

jest.mock("firebase-admin", () => {
  const collectionMock = {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnValue({
      id: "DOC_ID_FALSO_123",
    }),
    get: mockGet,
  };

  return {
    firestore: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue(collectionMock),
      runTransaction: mockRunTransaction,
    }),
  };
});

import { CorrecaoRifasService } from "../../../src/modules/rifas/services/correcaoRifasService";

describe("Service: CorrecaoRifasService", () => {
  let consoleErrorSpy: any;

  const dadosAtualizados = {
    nome: "Comprador Corrigido",
    telefone: "11999999999",
    email: "novo@email.com",
    comprovanteUrl: "https://novo-comprovativo.pdf",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockRunTransaction.mockImplementation(async (callback: any) => {
      return callback({
        get: mockTransactionGet,
        update: mockTransactionUpdate,
      });
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("Deve lançar USER_NOT_FOUND se o e-mail logado não for encontrado", async () => {
    mockGet.mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    await expect(
      CorrecaoRifasService.corrigirRifasRecusadas(
        "fantasma@teste.com",
        ["010"],
        dadosAtualizados,
      ),
    ).rejects.toThrow("USER_NOT_FOUND");
  });

  it("Deve bloquear correção se a rifa não pertencer ao aderido", async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: "DOC_USUARIO_001",
          data: () => ({
            id_aderido: "ADERIDO_030",
          }),
        },
      ],
    });

    mockTransactionGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        vendedor_id: "ADERIDO_999",
        status: "recusado",
      }),
    });

    await CorrecaoRifasService.corrigirRifasRecusadas(
      "valido@teste.com",
      ["010"],
      dadosAtualizados,
    );

    expect(mockTransactionUpdate).not.toHaveBeenCalled();
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  it("Deve bloquear correção se a rifa não estiver recusada", async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: "DOC_USUARIO_001",
          data: () => ({
            id_aderido: "ADERIDO_030",
          }),
        },
      ],
    });

    mockTransactionGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        vendedor_id: "ADERIDO_030",
        status: "pago",
      }),
    });

    await CorrecaoRifasService.corrigirRifasRecusadas(
      "valido@teste.com",
      ["010"],
      dadosAtualizados,
    );

    expect(mockTransactionUpdate).not.toHaveBeenCalled();
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  it("Deve processar correção se o dono for válido e a rifa estiver recusada", async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: "DOC_USUARIO_001",
          data: () => ({
            id_aderido: "ADERIDO_030",
          }),
        },
      ],
    });

    mockTransactionGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        vendedor_id: "ADERIDO_030",
        status: "recusado",
      }),
    });

    const sucesso = await CorrecaoRifasService.corrigirRifasRecusadas(
      "valido@teste.com",
      ["010"],
      dadosAtualizados,
    );

    expect(sucesso).toBe(true);

    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "pendente",
        comprador_nome: "Comprador Corrigido",
        comprador_telefone: "11999999999",
        comprador_email: "novo@email.com",
        comprovante_url: "https://novo-comprovativo.pdf",
        motivo_recusa: null,
        correcao_pendente: null,
        log_automacao: null,
      }),
    );

    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  it("Deve executar todas as leituras antes das escritas ao corrigir múltiplos bilhetes e sincronizar compradores", async () => {
    const ordemOperacoes: string[] = [];

    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: "DOC_USUARIO_001",
          data: () => ({
            id_aderido: "ADERIDO_030",
          }),
        },
      ],
    });

    mockTransactionGet.mockImplementation(async () => {
      ordemOperacoes.push("read");
      return {
        exists: true,
        data: () => ({
          vendedor_id: "ADERIDO_030",
          comprador_id: "COMP_777",
          status: "recusado",
        }),
      };
    });

    mockTransactionUpdate.mockImplementation(() => {
      ordemOperacoes.push("write");
    });

    const sucesso = await CorrecaoRifasService.corrigirRifasRecusadas(
      "valido@teste.com",
      ["010", "011"],
      dadosAtualizados,
    );

    expect(sucesso).toBe(true);
    // 2 leituras de bilhetes seguidas de 2 escritas de bilhetes + 1 escrita de comprador
    expect(ordemOperacoes).toEqual(["read", "read", "write", "write", "write"]);
  });

  it("Deve lançar erro de falha caso o commit no banco falhe", async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: "DOC_USUARIO_001",
          data: () => ({
            id_aderido: "ADERIDO_030",
          }),
        },
      ],
    });

    mockTransactionGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        vendedor_id: "ADERIDO_030",
        status: "recusado",
      }),
    });

    mockRunTransaction.mockRejectedValueOnce(new Error("Firebase Offline"));

    await expect(
      CorrecaoRifasService.corrigirRifasRecusadas(
        "valido@teste.com",
        ["010"],
        dadosAtualizados,
      ),
    ).rejects.toThrow("Falha ao salvar a correção no banco de dados.");
  });
});
