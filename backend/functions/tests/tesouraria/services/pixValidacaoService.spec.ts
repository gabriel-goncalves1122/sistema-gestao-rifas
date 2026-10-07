import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockTransactionSet = jest.fn<any>();
const mockTransactionGet = jest.fn<any>();
const mockRunTransaction = jest.fn<any>();
const mockBuscarTransacoes = jest.fn<any>();
const mockEnviarEmailRecibo = jest.fn<any>();

jest.mock("firebase-admin", () => ({
  firestore: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({}),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    }),
    runTransaction: mockRunTransaction,
  }),
}));

jest.mock(
  "../../../src/modules/tesouraria/services/pixTransacoesService",
  () => ({
    PixTransacoesService: {
      buscarTransacoes: mockBuscarTransacoes,
    },
  }),
);

jest.mock("../../../src/modules/rifas/emailService", () => ({
  enviarEmailRecibo: mockEnviarEmailRecibo,
}));

import { PixValidacaoService } from "../../../src/modules/tesouraria/services/pixValidacaoService";

function transacaoBase(sobrescritas: Record<string, any> = {}) {
  return {
    id: "tx_001",
    pixOrderId: "ORDE_001",
    referenceId: "rifas-001",
    metodo: "PIX",
    statusPagamento: "PAID",
    statusConciliacao: "conciliada",
    valorBruto: 10,
    valorPago: 10,
    moeda: "BRL",
    dataCriacao: "2026-06-08T10:00:00.000Z",
    dataPagamento: "2026-06-08T10:01:00.000Z",
    compradorNome: "Maria",
    compradorEmail: "maria@teste.com",
    aderido: { id: "ADERIDO_001", nome: "Aderido" },
    rifas: [{ numero: "001", status: "pendente" }],
    ...sobrescritas,
  };
}

describe("Service: PixValidacaoService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnviarEmailRecibo.mockResolvedValue(true);

    mockRunTransaction.mockImplementation(async (callback: any) => {
      return callback({
        get: mockTransactionGet,
        getAll: jest.fn().mockResolvedValue([{ exists: true, ref: {}, data: () => ({ pix_reference_id: "rifas-001" }) }]),
        set: mockTransactionSet,
      });
    });
  });

  it("Deve aceitar Pix confirmado pelo banco", async () => {
    mockTransactionGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          ref: {},
          data: () => ({
            status_pagamento_banco: "PAID",
            numeros_rifas: ["001"],
            comprador_email: "maria@teste.com",
            comprador_nome: "Maria",
          }),
        }
      ]
    });

    const resultado = await PixValidacaoService.aceitarTransacao({
      transacaoId: "pix-ORDE_001",
      uidTesouraria: "tesoureiro_001",
      emailTesouraria: "tesouraria@teste.com",
    });

    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "pago",
        status_validacao: "aceita",
        validado_por: "tesouraria@teste.com",
      }),
      { merge: true },
    );
    expect(mockEnviarEmailRecibo).toHaveBeenCalledWith(
      "maria@teste.com",
      "Maria",
      ["001"],
      "aprovado",
    );
    expect(resultado).toMatchObject({
      sucesso: true,
      statusValidacao: "aceita",
      rifas: ["001"],
      emailEnviado: true,
    });
  });

  it("Deve permitir aceitação manual de Pix sem confirmação bancária", async () => {
    mockTransactionGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          ref: {},
          data: () => ({
            status_pagamento_banco: "WAITING",
            numeros_rifas: ["001"],
          }),
        }
      ]
    });

    const resultado = await PixValidacaoService.aceitarTransacao({
      transacaoId: "pix-ORDE_001",
      uidTesouraria: "tesoureiro_001",
      emailTesouraria: "tesouraria@teste.com",
    });

    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status_validacao: "aceita",
      }),
      { merge: true },
    );
    expect(resultado.sucesso).toBe(true);
  });

  it("Deve bloquear Pix já validado", async () => {
    mockTransactionGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          ref: {},
          data: () => ({
            status_pagamento_banco: "PAID",
            status_validacao: "aceita",
          }),
        }
      ]
    });

    await expect(
      PixValidacaoService.negarTransacao({
        transacaoId: "pix-ORDE_001",
        uidTesouraria: "tesoureiro_001",
        motivo: "Dados incorretos",
      }),
    ).rejects.toThrow("PIX_ALREADY_VALIDATED");
  });

  it("Deve exigir motivo para negar Pix", async () => {
    await expect(
      PixValidacaoService.negarTransacao({
        transacaoId: "pix-ORDE_001",
        uidTesouraria: "tesoureiro_001",
      }),
    ).rejects.toThrow("MOTIVO_REQUIRED");
  });

  it("Deve negar Pix confirmado e notificar correção de dados", async () => {
    mockTransactionGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          ref: {},
          data: () => ({
            status_pagamento_banco: "PAID",
            numeros_rifas: ["001"],
            vendedor_id: "ADERIDO_001"
          }),
        }
      ]
    });

    const resultado = await PixValidacaoService.negarTransacao({
      transacaoId: "pix-ORDE_001",
      uidTesouraria: "tesoureiro_001",
      motivo: "Telefone inválido",
    });

    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "recusado",
        status_validacao: "negada",
        motivo_recusa: "Telefone inválido",
      }),
      { merge: true },
    );
    
    // Testa notificação
    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        vendedor_id: "ADERIDO_001",
        tipo: "correcao_dados",
      })
    );

    expect(resultado).toMatchObject({
      sucesso: true,
      statusValidacao: "negada",
      motivo: "Telefone inválido",
    });
  });
});
