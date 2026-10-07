// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/routes/tesourariaRoutes.spec.ts
// ============================================================================
import request from "supertest";
import { describe, expect, it, jest } from "@jest/globals";

import tesourariaRoutes from "../../../src/modules/tesouraria/tesourariaRoutes";
import { criarAppTesourariaTeste } from "../helpers/criarAppTesourariaTeste";

jest.mock("../../../src/modules/tesouraria/tesourariaController", () => ({
  tesourariaController: {
    atualizarCompradorCompra: (_req: any, res: any) =>
      res.status(200).json({ acao: "atualizar_comprador_compra" }),
    reenviarEmailComprovante: (_req: any, res: any) =>
      res.status(200).json({ acao: "reenviar_email_comprovante" }),
    notificarCorrecaoDados: (_req: any, res: any) =>
      res.status(200).json({ acao: "notificar_correcao_dados" }),
    obterRelatorioTesouraria: (_req: any, res: any) =>
      res.status(200).json({ acao: "relatorio_tesouraria" }),
    obterHistoricoTesouraria: (_req: any, res: any) =>
      res.status(200).json({ acao: "historico_tesouraria" }),
    listarPixTransacoes: (_req: any, res: any) =>
      res.status(200).json({ acao: "listar_pix_transacoes" }),
    obterPixTransacoesResumo: (_req: any, res: any) =>
      res.status(200).json({ acao: "resumo_pix_transacoes" }),
    sincronizarPixTransacoes: (_req: any, res: any) =>
      res.status(200).json({ acao: "sincronizar_pix_transacoes" }),
    aceitarPixTransacao: (_req: any, res: any) =>
      res.status(200).json({ acao: "aceitar_pix_transacao" }),
    negarPixTransacao: (_req: any, res: any) =>
      res.status(200).json({ acao: "negar_pix_transacao" }),
    aceitarCompraManual: (_req: any, res: any) =>
      res.status(200).json({ acao: "aceitar_compra_manual" }),
    negarCompraManual: (_req: any, res: any) =>
      res.status(200).json({ acao: "negar_compra_manual" }),
  },
}));

jest.mock("../../../src/shared/middlewares/authMiddleware", () => ({
  validateToken: (_req: any, _res: any, next: any) => next(),
  requireTesourariaOrAdmin: (_req: any, _res: any, next: any) => next(),
}));

describe("Rotas: /tesouraria", () => {
  it("GET /tesouraria/relatorio -> deve chamar relatório financeiro", async () => {
    const app = criarAppTesourariaTeste(tesourariaRoutes);

    const response = await request(app).get("/tesouraria/relatorio");

    
    expect(response.status).toBe(200);
    expect(response.body.acao).toBe("relatorio_tesouraria");
  });

  it("GET /tesouraria/historico -> deve chamar histórico financeiro", async () => {
    const app = criarAppTesourariaTeste(tesourariaRoutes);

    const response = await request(app).get("/tesouraria/historico");

    
    expect(response.status).toBe(200);
    expect(response.body.acao).toBe("historico_tesouraria");
  });

  it("PATCH /tesouraria/historico/compras/:compradorId -> deve atualizar comprador", async () => {
    const app = criarAppTesourariaTeste(tesourariaRoutes);

    const response = await request(app)
      .patch("/tesouraria/historico/compras/comprador_123")
      .send({
        nome: "Maria Atualizada",
        email: "maria@teste.com",
        telefone: "35999990000",
      });

    
    expect(response.status).toBe(200);
    expect(response.body.acao).toBe("atualizar_comprador_compra");
  });

  it("POST /tesouraria/historico/compras/:compradorId/reenviar-email-comprovante -> deve reenviar e-mail", async () => {
    const app = criarAppTesourariaTeste(tesourariaRoutes);

    const response = await request(app).post(
      "/tesouraria/historico/compras/comprador_123/reenviar-email-comprovante",
    );

    
    expect(response.status).toBe(200);
    expect(response.body.acao).toBe("reenviar_email_comprovante");
  });

  it("GET /tesouraria/transacoes-bancarias -> deve listar Pix", async () => {
    const app = criarAppTesourariaTeste(tesourariaRoutes);

    const response = await request(app).get("/tesouraria/transacoes-bancarias");

    
    expect(response.status).toBe(200);
    expect(response.body.acao).toBe("listar_pix_transacoes");
  });

  it("GET /tesouraria/transacoes-bancarias/resumo -> deve retornar resumo Pix", async () => {
    const app = criarAppTesourariaTeste(tesourariaRoutes);

    const response = await request(app).get(
      "/tesouraria/transacoes-bancarias/resumo",
    );

    
    expect(response.status).toBe(200);
    expect(response.body.acao).toBe("resumo_pix_transacoes");
  });

  it("POST /tesouraria/transacoes-bancarias/sincronizar -> deve manter endpoint compatível", async () => {
    const app = criarAppTesourariaTeste(tesourariaRoutes);

    const response = await request(app).post(
      "/tesouraria/transacoes-bancarias/sincronizar",
    );

    
    expect(response.status).toBe(200);
    expect(response.body.acao).toBe("sincronizar_pix_transacoes");
  });

  it("POST /tesouraria/transacoes-bancarias/:transacaoId/aceitar -> deve aceitar Pix", async () => {
    const app = criarAppTesourariaTeste(tesourariaRoutes);

    const response = await request(app).post(
      "/tesouraria/transacoes-bancarias/tx_001/aceitar",
    );

    
    expect(response.status).toBe(200);
    expect(response.body.acao).toBe("aceitar_pix_transacao");
  });

  it("POST /tesouraria/transacoes-bancarias/:transacaoId/negar -> deve negar Pix", async () => {
    const app = criarAppTesourariaTeste(tesourariaRoutes);

    const response = await request(app)
      .post("/tesouraria/transacoes-bancarias/tx_001/negar")
      .send({ motivo: "Dados incorretos" });

    
    expect(response.status).toBe(200);
    expect(response.body.acao).toBe("negar_pix_transacao");
  });
});
