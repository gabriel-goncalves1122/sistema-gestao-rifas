// ============================================================================
// ARQUIVO: backend/functions/tests/admin/secretaria/secretariaService.spec.ts
// ============================================================================
import { jest, describe, beforeEach, it, expect } from "@jest/globals";

import { secretariaService } from "../../../src/modules/admin/secretaria/secretariaService";

// ============================================================================
// MOCK DO FIRESTORE ADMIN SDK
// ============================================================================

const mockGet: any = jest.fn();
const mockDoc: any = jest.fn((id: string) => ({ id, get: mockDocGet, set: mockDocSet }));
const mockDocGet: any = jest.fn();
const mockDocSet: any = jest.fn();
const mockRunTransaction: any = jest.fn();

jest.mock("../../../src/shared/config/firebaseAdmin", () => {
  const collectionMock = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: (...args: any[]) => mockGet(...args),
    doc: (...args: any[]) => mockDoc(...args),
  };

  return {
    db: {
      collection: jest.fn(() => collectionMock),
      runTransaction: (...args: any[]) => mockRunTransaction(...args),
    },
  };
});

const mockTransactionSet: any = jest.fn();
const mockTransactionGet: any = jest.fn();

const mockTransactionUpdate: any = jest.fn();

describe("Service: secretariaService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionGet.mockResolvedValue({
      exists: false,
      data: () => undefined,
    });

    mockRunTransaction.mockImplementation(async (callback: any) => {
      return callback({
        get: mockTransactionGet,
        set: mockTransactionSet,
        update: mockTransactionUpdate,
      });
    });
  });

  it("Deve lançar erro se o e-mail já estiver autorizado", async () => {
    mockGet.mockResolvedValueOnce({ empty: false });

    await expect(
      secretariaService.adicionarAderido({ email: "teste@teste.com" }),
    ).rejects.toThrow("Este e-mail já foi autorizado anteriormente.");

    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("Deve criar o primeiro aderido completo com 120 bilhetes", async () => {
    mockGet.mockResolvedValueOnce({ empty: true });
    mockDocGet.mockResolvedValueOnce({ exists: false });
    mockGet.mockResolvedValueOnce({ empty: true });
    mockGet.mockResolvedValueOnce({ empty: true });
    mockTransactionGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ ultima_posicao: 0, ultimo_bilhete: 0 }),
    });

    const resultado = await secretariaService.adicionarAderido({
      email: "primeiro@teste.com",
      nome: "Primeiro Aluno",
      curso: "Engenharia Civil",
      modalidade_adesao: "completo",
    });

    expect(resultado).toEqual({
      idAderido: "ADERIDO_001",
      modalidade: "completo",
      bilhetesGerados: 120,
      faixaRifas: {
        inicio: "00001",
        fim: "00120",
      },
    });

    expect(mockTransactionSet).toHaveBeenCalledTimes(123);
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);

    expect(mockDoc).toHaveBeenCalledWith("ADERIDO_001");
    expect(mockDoc).toHaveBeenCalledWith("00001");
    expect(mockDoc).toHaveBeenCalledWith("00120");

    const novoUsuario = mockTransactionSet.mock.calls[0][1];
    const indiceEmail = mockTransactionSet.mock.calls[1][1];

    expect(novoUsuario).toEqual(
      expect.objectContaining({
        id: "ADERIDO_001",
        email: "primeiro@teste.com",
        nome: "PRIMEIRO ALUNO",
        curso: "ENGENHARIA CIVIL",
        cargo: "aderido",
        modalidade_adesao: "completo",
        meta_vendas: 1200,
        status: "pendente",
        status_cadastro: "pendente",
      }),
    );
    expect(indiceEmail).toEqual(
      expect.objectContaining({
        email: "primeiro@teste.com",
        usuario_id: "ADERIDO_001",
      }),
    );
  });

  it("Deve criar meio-aderido com 60 bilhetes e meta reduzida", async () => {
    mockGet.mockResolvedValueOnce({ empty: true });
    mockDocGet.mockResolvedValueOnce({ exists: false });
    mockGet.mockResolvedValueOnce({ empty: true });
    mockGet.mockResolvedValueOnce({ empty: true });
    mockTransactionGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ ultima_posicao: 0, ultimo_bilhete: 0 }),
    });

    const resultado = await secretariaService.adicionarAderido({
      email: "meio@teste.com",
      nome: "Meio Aderido",
      modalidade_adesao: "meio",
    });

    expect(resultado).toEqual({
      idAderido: "ADERIDO_001",
      modalidade: "meio",
      bilhetesGerados: 60,
      faixaRifas: {
        inicio: "00001",
        fim: "00060",
      },
    });

    expect(mockTransactionSet).toHaveBeenCalledTimes(63);

    const novoUsuario = mockTransactionSet.mock.calls[0][1];

    expect(novoUsuario).toEqual(
      expect.objectContaining({
        modalidade_adesao: "meio",
        meta_vendas: 600,
        faixa_rifas: {
          inicio: "00001",
          fim: "00060",
        },
      }),
    );
  });

  it("Deve criar aderido quando o contador legado não existe e não há dados prévios", async () => {
    mockGet.mockResolvedValueOnce({ empty: true });
    mockDocGet.mockResolvedValueOnce({ exists: false });
    mockGet.mockResolvedValueOnce({ docs: [] });
    mockGet.mockResolvedValueOnce({ docs: [] });
    mockTransactionGet.mockResolvedValueOnce({
      exists: false,
      data: () => undefined,
    });

    const resultado = await secretariaService.adicionarAderido({
      email: "semcontador@teste.com",
      nome: "Sem Contador",
      modalidade_adesao: "completo",
    });

    expect(resultado).toEqual({
      idAderido: "ADERIDO_001",
      modalidade: "completo",
      bilhetesGerados: 120,
      faixaRifas: {
        inicio: "00001",
        fim: "00120",
      },
    });

    expect(mockTransactionSet).toHaveBeenLastCalledWith(
      expect.anything(),
      {
        ultima_posicao: 1,
        ultimo_bilhete: 120,
      },
      { merge: true },
    );
  });

  it("Deve reconstruir contador ausente a partir de usuários e bilhetes legados", async () => {
    mockGet.mockResolvedValueOnce({ empty: true });
    mockDocGet.mockResolvedValueOnce({ exists: false });
    mockGet.mockResolvedValueOnce({
      docs: [
        {
          id: "ADERIDO_009",
          data: () => ({ faixa_rifas: { fim: "00120" } }),
        },
        {
          id: "usuario-legado",
          data: () => ({ posicao_adesao: 11, faixa_rifas: { fim: "00150" } }),
        },
      ],
    });
    mockGet.mockResolvedValueOnce({
      docs: [
        {
          id: "00179",
          data: () => ({}),
        },
        {
          id: "bilhete-legado",
          data: () => ({ numero: "00180" }),
        },
      ],
    });
    mockTransactionGet.mockResolvedValueOnce({
      exists: false,
      data: () => undefined,
    });

    const resultado = await secretariaService.adicionarAderido({
      email: "legado@teste.com",
      nome: "Aluno Legado",
      modalidade_adesao: "completo",
    });

    expect(resultado.idAderido).toBe("ADERIDO_012");
    expect(resultado.faixaRifas).toEqual({
      inicio: "00181",
      fim: "00300",
    });

    expect(mockDoc).toHaveBeenCalledWith("ADERIDO_012");
    expect(mockDoc).toHaveBeenCalledWith("00181");
    expect(mockTransactionSet).toHaveBeenLastCalledWith(
      expect.anything(),
      {
        ultima_posicao: 12,
        ultimo_bilhete: 300,
      },
      { merge: true },
    );
  });

  it("Deve usar contador criado por outra requisição se a transação já o enxergar", async () => {
    mockGet.mockResolvedValueOnce({ empty: true });
    mockDocGet.mockResolvedValueOnce({ exists: false });
    mockGet.mockResolvedValueOnce({ docs: [] });
    mockGet.mockResolvedValueOnce({ docs: [] });
    mockTransactionGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ ultima_posicao: 3, ultimo_bilhete: 360 }),
    });

    const resultado = await secretariaService.adicionarAderido({
      email: "concorrente@teste.com",
      nome: "Criacao Concorrente",
      modalidade_adesao: "meio",
    });

    expect(resultado).toEqual({
      idAderido: "ADERIDO_004",
      modalidade: "meio",
      bilhetesGerados: 60,
      faixaRifas: {
        inicio: "00361",
        fim: "00420",
      },
    });
  });

  it("Deve rejeitar criação quando o índice transacional de e-mail já existe", async () => {
    mockGet.mockResolvedValueOnce({ empty: true });
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ ultima_posicao: 1, ultimo_bilhete: 60 }),
    });
    mockTransactionGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ ultima_posicao: 1, ultimo_bilhete: 60 }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ usuario_id: "ADERIDO_999" }),
      });

    await expect(
      secretariaService.adicionarAderido({
        email: "duplicado@teste.com",
        nome: "Duplicado",
        modalidade_adesao: "meio",
      }),
    ).rejects.toThrow("Este e-mail já foi autorizado anteriormente.");

    expect(mockTransactionSet).not.toHaveBeenCalled();
  });

  it("Deve rejeitar criação quando a próxima posição de aderido já existe", async () => {
    mockGet.mockResolvedValueOnce({ empty: true });
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ ultima_posicao: 1, ultimo_bilhete: 60 }),
    });
    mockTransactionGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ ultima_posicao: 1, ultimo_bilhete: 60 }),
      })
      .mockResolvedValueOnce({
        exists: false,
        data: () => undefined,
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: "ADERIDO_001" }),
      });

    await expect(
      secretariaService.adicionarAderido({
        email: "posicao@teste.com",
        nome: "Posicao Ocupada",
        modalidade_adesao: "meio",
      }),
    ).rejects.toThrow("Não foi possível reservar a próxima posição de aderido.");

    expect(mockTransactionSet).not.toHaveBeenCalled();
  });

  it("Deve rejeitar criação quando a faixa calculada já possui bilhete", async () => {
    mockGet.mockResolvedValueOnce({ empty: true });
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ ultima_posicao: 1, ultimo_bilhete: 60 }),
    });
    mockTransactionGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ ultima_posicao: 1, ultimo_bilhete: 60 }),
      })
      .mockResolvedValueOnce({
        exists: false,
        data: () => undefined,
      })
      .mockResolvedValueOnce({
        exists: false,
        data: () => undefined,
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ numero: "00001" }),
      });

    await expect(
      secretariaService.adicionarAderido({
        email: "faixa@teste.com",
        nome: "Faixa Ocupada",
        modalidade_adesao: "meio",
      }),
    ).rejects.toThrow("A faixa de rifas calculada já possui bilhetes cadastrados.");

    expect(mockTransactionSet).not.toHaveBeenCalled();
  });

  it("Deve continuar a contagem se já existirem usuários e bilhetes", async () => {
    mockGet.mockResolvedValueOnce({ empty: true });
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ ultima_posicao: 15, ultimo_bilhete: 1800 }),
    });
    mockTransactionGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ ultima_posicao: 15, ultimo_bilhete: 1800 }),
    });

    const resultado = await secretariaService.adicionarAderido({
      email: "novo@teste.com",
      modalidade_adesao: "completo",
    });

    expect(resultado.idAderido).toBe("ADERIDO_016");
    expect(resultado.faixaRifas).toEqual({
      inicio: "01801",
      fim: "01920",
    });

    expect(mockDoc).toHaveBeenCalledWith("ADERIDO_016");
    expect(mockDoc).toHaveBeenCalledWith("01801");
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  it("Deve atualizar apenas campos cadastrais do aderido", async () => {
    mockTransactionGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        status_cadastro: "ativo",
        modalidade_adesao: "completo",
      }),
    });

    const resultado = await secretariaService.atualizarAderido("ADERIDO_001", {
      nome: "Gabriel Sampaio",
      telefone: "35999999999",
      status_cadastro: "ativo",
    });

    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        nome: "GABRIEL SAMPAIO",
        telefone: "35999999999",
        status_cadastro: "ativo",
        status: "ativo",
        atualizado_em: expect.any(String),
      }),
    );

    expect(resultado).toEqual({
      idAderido: "ADERIDO_001",
      camposAtualizados: expect.arrayContaining([
        "nome",
        "telefone",
        "status_cadastro",
        "status",
        "atualizado_em",
      ]),
    });
  });

  it("Deve listar aderidos preservando campos originais legados", async () => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({
      docs: [
        {
          id: "ADERIDO_001",
          data: () => ({
            Nome: "LEGADO 1",
            status: "Aderido",
          }),
        },
        {
          id: "ADERIDO_002",
          data: () => ({
            nome: "NOVO 2",
            status_cadastro: "pendente",
          }),
        },
      ],
    });

    const resultado = await secretariaService.listarAderidos();

    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toEqual({
      id: "ADERIDO_001",
      Nome: "LEGADO 1",
      status: "Aderido",
    });
    expect(resultado[1]).toEqual({
      id: "ADERIDO_002",
      nome: "NOVO 2",
      status_cadastro: "pendente",
    });
  });
});
