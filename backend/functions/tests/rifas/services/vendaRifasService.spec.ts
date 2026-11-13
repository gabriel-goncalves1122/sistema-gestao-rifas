// ============================================================================
// ARQUIVO: backend/functions/tests/rifas/services/vendaRifasService.spec.ts
// ============================================================================
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockGet = jest.fn<any>();
const mockBatchSet = jest.fn<any>();
const mockBatchCommit = jest.fn<any>();

jest.mock("firebase-admin", () => {
  const collectionMock = {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnValue({
      id: "COMPRADOR_001",
    }),
    get: mockGet,
  };

  return {
    firestore: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue(collectionMock),
      runTransaction: jest.fn().mockImplementation(async (callback: any) => {
        return callback({
          get: mockGet,
          set: mockBatchSet,
          update: mockBatchSet,
          delete: jest.fn(),
        });
      }),
    }),
  };
});

jest.mock("../../../src/modules/rifas/emailService", () => ({
  enviarEmailRecibo: jest.fn<any>().mockResolvedValue(undefined),
}));

import { VendaRifasService } from "../../../src/modules/rifas/services/vendaRifasService";
import { enviarEmailRecibo } from "../../../src/modules/rifas/emailService";

describe("Service: VendaRifasService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Deve lançar INVALID_DATA se faltarem informações cruciais", async () => {
    const dadosIncompletos = {
      nome: "Comprador Teste",
      telefone: "11999999999",
      numerosRifas: [],
      comprovanteUrl: "",
    };

    await expect(
      VendaRifasService.processarVenda(
        "uid_123",
        "vendedor@teste.com",
        dadosIncompletos,
      ),
    ).rejects.toThrow("INVALID_DATA");

    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it("Deve criar comprador, atualizar rifas e disparar e-mail quando houver e-mail do comprador", async () => {
    const dadosVenda = {
      nome: "Engenheiro Comprador",
      telefone: "35999999999",
      email: "comprador@teste.com",
      numerosRifas: ["010", "011"],
      comprovanteUrl: "https://meu-comprovante.png",
    };

    mockGet
      .mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: "DOC_USUARIO_001",
            data: () => ({
              nome: "Vendedor Teste",
              cpf: "123.456.789-00",
              id_aderido: "ADERIDO_999",
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ status: "disponivel", vendedor_id: "ADERIDO_999" }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ status: "disponivel", vendedor_id: "ADERIDO_999" }),
      });

    await VendaRifasService.processarVenda(
      "uid_123",
      "vendedor@teste.com",
      dadosVenda,
    );

    // 1 set para comprador + 2 sets para bilhetes.
    expect(mockBatchSet).toHaveBeenCalledTimes(3);
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "pendente",
        comprador_nome: "Engenheiro Comprador",
        comprador_telefone: "35999999999",
        comprador_email: "comprador@teste.com",
      }),
      { merge: true },
    );

    expect(enviarEmailRecibo).toHaveBeenCalledWith(
      "comprador@teste.com",
      "Engenheiro Comprador",
      ["010", "011"],
      "pendente",
    );
  });

  it("Não deve disparar e-mail quando comprador não informar e-mail", async () => {
    const dadosVenda = {
      nome: "Comprador Sem Email",
      telefone: "35999999999",
      numerosRifas: ["010"],
      comprovanteUrl: "https://meu-comprovante.png",
    };

    mockGet
      .mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: "DOC_USUARIO_001",
            data: () => ({
              nome: "Vendedor Teste",
              cpf: "123.456.789-00",
              id_aderido: "ADERIDO_999",
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ status: "disponivel", vendedor_id: "ADERIDO_999" }),
      });

    await VendaRifasService.processarVenda(
      "uid_123",
      "vendedor@teste.com",
      dadosVenda,
    );

    expect(mockBatchSet).toHaveBeenCalledTimes(2);
    expect(enviarEmailRecibo).not.toHaveBeenCalled();
  });

  it("Não deve quebrar a venda se o envio de e-mail falhar", async () => {
    const dadosVenda = {
      nome: "Comprador Teste",
      telefone: "35999999999",
      email: "comprador@teste.com",
      numerosRifas: ["010"],
      comprovanteUrl: "https://meu-comprovante.png",
    };

    mockGet
      .mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: "DOC_USUARIO_001",
            data: () => ({
              nome: "Vendedor Teste",
              cpf: "123.456.789-00",
              id_aderido: "ADERIDO_999",
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ status: "disponivel", vendedor_id: "ADERIDO_999" }),
      });

    (enviarEmailRecibo as jest.Mock<any>).mockRejectedValueOnce(
      new Error("SMTP offline"),
    );

    await expect(
      VendaRifasService.processarVenda(
        "uid_123",
        "vendedor@teste.com",
        dadosVenda,
      ),
    ).resolves.not.toThrow();

    expect(mockBatchSet).toHaveBeenCalledTimes(2);
  });

  it("Deve permitir venda manual sobre bilhete com reserva Pix expirada e limpar campos residuais de Pix", async () => {
    const passado = new Date(Date.now() - 40 * 60 * 1000).toISOString();
    const dadosVenda = {
      nome: "Comprador Manual",
      telefone: "35999999999",
      numerosRifas: ["015"],
      comprovanteUrl: "https://storage/comprovante-manual.png",
    };

    mockGet
      .mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: "DOC_USUARIO_001",
            data: () => ({
              nome: "Vendedor Teste",
              cpf: "123.456.789-00",
              id_aderido: "ADERIDO_999",
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: "reservado",
          vendedor_id: "ADERIDO_999",
          data_expiracao: passado,
          pix_order_id: "RIFA_EXPIRADO_01",
          pix_reference_id: "ref_antiga",
          status_pagamento_banco: "WAITING",
        }),
      });

    await VendaRifasService.processarVenda(
      "uid_123",
      "vendedor@teste.com",
      dadosVenda,
    );

    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "pendente",
        comprovante_url: "https://storage/comprovante-manual.png",
        pix_order_id: null,
        pix_qr_code_id: null,
        pix_reference_id: null,
        status_pagamento_banco: null,
        status_validacao: null,
        motivo_recusa: null,
        correcao_pendente: null,
        data_expiracao: null,
      }),
      { merge: true },
    );
  });
});
