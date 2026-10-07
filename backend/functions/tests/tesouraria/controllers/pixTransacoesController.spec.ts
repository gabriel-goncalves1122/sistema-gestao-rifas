// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/controllers/pixTransacoesController.spec.ts
// ============================================================================
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Response } from "express";

import { AuthRequest } from "../../../src/shared/middlewares/authMiddleware";
import { criarReqResTesourariaController } from "../../tesouraria/helpers/criarReqResTesourariaController";

const mocks = {
  buscarPixTransacoes: jest.fn<any>(),
  obterPixTransacoesResumo: jest.fn<any>(),
  sincronizarPixTransacoes: jest.fn<any>(),
  aceitarPixTransacao: jest.fn<any>(),
  negarPixTransacao: jest.fn<any>(),
};

jest.mock("../../../src/modules/tesouraria/tesourariaService", () => ({
  TesourariaService: {
    buscarPixTransacoes: mocks.buscarPixTransacoes,
    obterPixTransacoesResumo: mocks.obterPixTransacoesResumo,
    sincronizarPixTransacoes: mocks.sincronizarPixTransacoes,
    aceitarPixTransacao: mocks.aceitarPixTransacao,
    negarPixTransacao: mocks.negarPixTransacao,
  },
}));

import { listarPixTransacoes } from "../../../src/modules/tesouraria/controllers/listarPixTransacoesController";
import { obterPixTransacoesResumo } from "../../../src/modules/tesouraria/controllers/obterPixTransacoesResumoController";
import { aceitarPixTransacao } from "../../../src/modules/tesouraria/controllers/aceitarPixTransacaoController";
import { negarPixTransacao } from "../../../src/modules/tesouraria/controllers/negarPixTransacaoController";
import { sincronizarPixTransacoes } from "../../../src/modules/tesouraria/controllers/sincronizarPixTransacoesController";

describe("Controllers Tesouraria: Pix transações", () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    const contexto = criarReqResTesourariaController();
    req = contexto.req;
    res = contexto.res;
  });

  it("Deve listar transações Pix normalizadas", async () => {
    const transacoes = [{ id: "tx_001", statusPagamento: "PAID" }];

    mocks.buscarPixTransacoes.mockResolvedValueOnce(transacoes);

    await listarPixTransacoes(req as AuthRequest, res as Response);

    expect(mocks.buscarPixTransacoes).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ transacoes });
  });

  it("Deve retornar resumo das transações Pix", async () => {
    const resumo = {
      totalRecebido: 100,
      totalPendente: 20,
      totalCancelado: 0,
      totalDivergente: 0,
      quantidadePagas: 1,
      quantidadeAguardando: 1,
      quantidadeCanceladas: 0,
      quantidadeNaoIdentificadas: 0,
      quantidadeAguardandoValidacao: 1,
      quantidadeAceitas: 0,
      quantidadeNegadas: 0,
      quantidadeSemConfirmacaoBancaria: 0,
      quantidadeComRifas: 1,
      quantidadeSemVinculo: 0,
      ticketMedio: 100,
    };

    mocks.obterPixTransacoesResumo.mockResolvedValueOnce(resumo);

    await obterPixTransacoesResumo(req as AuthRequest, res as Response);

    expect(mocks.obterPixTransacoesResumo).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ resumo });
  });

  it("Deve executar sincronização compatível sem integração externa", async () => {
    const resultado = {
      sucesso: true,
      sincronizado: false,
      mensagem: "Dados locais preservados.",
    };

    mocks.sincronizarPixTransacoes.mockResolvedValueOnce(resultado);

    await sincronizarPixTransacoes(req as AuthRequest, res as Response);

    expect(mocks.sincronizarPixTransacoes).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(resultado);
  });

  it("Deve aceitar uma transação Pix", async () => {
    req.params = { transacaoId: "tx_001" } as any;
    const resultado = { sucesso: true, statusValidacao: "aceita" };

    mocks.aceitarPixTransacao.mockResolvedValueOnce(resultado);

    await aceitarPixTransacao(req as AuthRequest, res as Response);

    expect(mocks.aceitarPixTransacao).toHaveBeenCalledWith({
      transacaoId: "tx_001",
      uidTesouraria: "tesouraria_123",
      emailTesouraria: "tesouraria@teste.com",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(resultado);
  });

  it("Deve negar uma transação Pix com motivo", async () => {
    req.params = { transacaoId: "tx_001" } as any;
    req.body = { motivo: "E-mail incorreto" };
    const resultado = { sucesso: true, statusValidacao: "negada" };

    mocks.negarPixTransacao.mockResolvedValueOnce(resultado);

    await negarPixTransacao(req as AuthRequest, res as Response);

    expect(mocks.negarPixTransacao).toHaveBeenCalledWith({
      transacaoId: "tx_001",
      uidTesouraria: "tesouraria_123",
      emailTesouraria: "tesouraria@teste.com",
      motivo: "E-mail incorreto",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(resultado);
  });
  it("Deve retornar 500 ao falhar ao listar transações Pix", async () => {
    mocks.buscarPixTransacoes.mockRejectedValueOnce(new Error("Database error"));

    await listarPixTransacoes(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Erro ao buscar transações Pix." });
  });

  it("Deve retornar 500 ao falhar ao obter resumo", async () => {
    mocks.obterPixTransacoesResumo.mockRejectedValueOnce(new Error("Database error"));

    await obterPixTransacoesResumo(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Erro ao gerar resumo Pix." });
  });

  it("Deve retornar 500 ao falhar na sincronização", async () => {
    mocks.sincronizarPixTransacoes.mockRejectedValueOnce(new Error("Network error"));

    await sincronizarPixTransacoes(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Erro ao sincronizar transações Pix." });
  });

  it("Deve retornar 400 se transacaoId estiver ausente ao aceitar", async () => {
    req.params = {} as any;

    await aceitarPixTransacao(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "ID da transação inválido." });
  });

  it("Deve retornar 404 se transação não encontrada ao aceitar", async () => {
    req.params = { transacaoId: "tx_001" } as any;
    mocks.aceitarPixTransacao.mockRejectedValueOnce(new Error("TRANSACAO_NOT_FOUND"));

    await aceitarPixTransacao(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Transação Pix não encontrada." });
  });



  it("Deve retornar 409 se Pix já validado ao aceitar", async () => {
    req.params = { transacaoId: "tx_001" } as any;
    mocks.aceitarPixTransacao.mockRejectedValueOnce(new Error("PIX_ALREADY_VALIDATED"));

    await aceitarPixTransacao(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: "Transação Pix já validada." });
  });

  it("Deve retornar 422 se transação sem rifas ao aceitar", async () => {
    req.params = { transacaoId: "tx_001" } as any;
    mocks.aceitarPixTransacao.mockRejectedValueOnce(new Error("TRANSACAO_SEM_RIFAS"));

    await aceitarPixTransacao(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: "Transação sem rifas vinculadas." });
  });

  it("Deve retornar 500 genérico ao falhar ao aceitar transação", async () => {
    req.params = { transacaoId: "tx_001" } as any;
    mocks.aceitarPixTransacao.mockRejectedValueOnce(new Error("Database error"));

    await aceitarPixTransacao(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Erro ao aceitar transação Pix." });
  });

  it("Deve retornar 400 se motivo for exigido pela regra de negócios (MOTIVO_REQUIRED)", async () => {
    req.params = { transacaoId: "tx_001" } as any;
    req.body = { motivo: "" };
    mocks.negarPixTransacao.mockRejectedValueOnce(new Error("MOTIVO_REQUIRED"));

    await negarPixTransacao(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Motivo da negativa é obrigatório." });
  });

  it("Deve retornar 400 se transacaoId estiver ausente ao negar", async () => {
    req.params = {} as any;
    req.body = { motivo: "Não reconhecido" };

    await negarPixTransacao(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "ID da transação inválido." });
  });

  it("Deve retornar 404 se transação não encontrada ao negar", async () => {
    req.params = { transacaoId: "tx_001" } as any;
    req.body = { motivo: "Não reconhecido" };
    mocks.negarPixTransacao.mockRejectedValueOnce(new Error("TRANSACAO_NOT_FOUND"));

    await negarPixTransacao(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Transação Pix não encontrada." });
  });

  it("Deve retornar 500 genérico ao falhar ao negar transação", async () => {
    req.params = { transacaoId: "tx_001" } as any;
    req.body = { motivo: "Não reconhecido" };
    mocks.negarPixTransacao.mockRejectedValueOnce(new Error("Database error"));

    await negarPixTransacao(req as AuthRequest, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Erro ao negar transação Pix." });
  });
});
