import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import express from "express";
import { sistemaController } from "../../src/modules/sistema/sistemaController";
import * as sistemaService from "../../src/modules/sistema/sistemaService";

jest.mock("../../src/modules/sistema/sistemaService");

describe("sistemaController", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    app.get("/sistema/manutencao", sistemaController.obterManutencao);
    app.put("/admin/manutencao", (req: any, res, next) => {
      req.user = { email: "admin@unifei.edu.br", role: "admin" };
      sistemaController.atualizarManutencao(req, res);
    });
  });

  describe("obterManutencao", () => {
    it("deve responder com 200 e cabeçalhos de no-cache", async () => {
      const mockStatus = {
        emManutencao: false,
        mensagem: "Sistema operacional",
        previsaoRetorno: null,
        atualizadoEm: null,
        atualizadoPor: null,
      };

      (sistemaService.obterStatusManutencao as jest.Mock<any>).mockResolvedValueOnce(
        mockStatus,
      );

      const req: any = {};
      const res: any = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await sistemaController.obterManutencao(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStatus);
    });
  });

  describe("atualizarManutencao", () => {
    it("deve chamar atualizarStatusManutencao com payload e email do admin", async () => {
      const payload = {
        emManutencao: true,
        mensagem: "Manutenção técnica",
        previsaoRetorno: "20:00",
      };

      const mockRetorno = {
        ...payload,
        atualizadoEm: "2026-11-11T12:00:00.000Z",
        atualizadoPor: "admin@unifei.edu.br",
      };

      (
        sistemaService.atualizarStatusManutencao as jest.Mock<any>
      ).mockResolvedValueOnce(mockRetorno);

      const req: any = {
        body: payload,
        user: { email: "admin@unifei.edu.br" },
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await sistemaController.atualizarManutencao(req, res);

      expect(sistemaService.atualizarStatusManutencao).toHaveBeenCalledWith(
        payload,
        "admin@unifei.edu.br",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        manutencao: mockRetorno,
      });
    });
  });
});
