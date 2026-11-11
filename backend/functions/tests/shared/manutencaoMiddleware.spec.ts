import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Request, Response, NextFunction } from "express";

const mockVerifyIdToken = jest.fn<any>();
const mockUserDocGet = jest.fn<any>();
const mockUsersWhereGet = jest.fn<any>();
const mockObterStatusManutencao = jest.fn<any>();

jest.mock("../../src/shared/config/firebaseAdmin", () => ({
  auth: {
    verifyIdToken: mockVerifyIdToken,
  },
  db: {
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: mockUserDocGet,
      }),
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: mockUsersWhereGet,
        }),
      }),
    }),
  },
}));

jest.mock("../../src/modules/sistema/sistemaService", () => ({
  obterStatusManutencao: mockObterStatusManutencao,
}));

import {
  isRequestDeAdmin,
  isRotaIsentaManutencao,
  manutencaoMiddleware,
} from "../../src/shared/middlewares/manutencaoMiddleware";

describe("manutencaoMiddleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPER_ADMIN_EMAILS = "super@teste.com";

    mockReq = {
      originalUrl: "/rifas/comprar",
      method: "GET",
      headers: {},
    };

    mockRes = {
      status: jest.fn<any>().mockReturnThis(),
      json: jest.fn<any>(),
    };

    mockNext = jest.fn<any>();
    mockUsersWhereGet.mockResolvedValue({ empty: true, docs: [] });
  });

  describe("isRotaIsentaManutencao", () => {
    it("deve isentar rotas de status de manutenção, auth, admin, webhook Pix e GET /premios", () => {
      expect(
        isRotaIsentaManutencao({ originalUrl: "/sistema/manutencao" } as any),
      ).toBe(true);
      expect(isRotaIsentaManutencao({ originalUrl: "/api/auth/me" } as any)).toBe(
        true,
      );
      expect(
        isRotaIsentaManutencao({ originalUrl: "/admin/aderidos" } as any),
      ).toBe(true);
      expect(
        isRotaIsentaManutencao({
          originalUrl: "/tesouraria/checkout/pix/webhook",
        } as any),
      ).toBe(true);
      expect(
        isRotaIsentaManutencao({
          method: "GET",
          originalUrl: "/premios",
        } as any),
      ).toBe(true);
    });

    it("não deve isentar mutações em prêmios nem rotas de rifas e tesouraria", () => {
      expect(
        isRotaIsentaManutencao({
          method: "POST",
          originalUrl: "/premios",
        } as any),
      ).toBe(false);
      expect(
        isRotaIsentaManutencao({ originalUrl: "/rifas/minhas" } as any),
      ).toBe(false);
      expect(
        isRotaIsentaManutencao({ originalUrl: "/tesouraria/pix" } as any),
      ).toBe(false);
    });
  });

  describe("comportamento do middleware", () => {
    it("deve chamar next() se a rota for isenta mesmo com manutenção ativa", async () => {
      mockReq.originalUrl = "/tesouraria/checkout/pix/webhook";
      await manutencaoMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockObterStatusManutencao).not.toHaveBeenCalled();
    });

    it("deve chamar next() se o sistema não estiver em manutenção", async () => {
      mockObterStatusManutencao.mockResolvedValueOnce({ emManutencao: false });

      await manutencaoMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("deve retornar 503 com MANUTENCAO_ATIVA se em manutenção e sem token", async () => {
      mockObterStatusManutencao.mockResolvedValueOnce({
        emManutencao: true,
        mensagem: "Manutenção",
      });

      await manutencaoMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "MANUTENCAO_ATIVA",
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("deve liberar next() se em manutenção mas o usuário for Super Admin", async () => {
      mockObterStatusManutencao.mockResolvedValueOnce({ emManutencao: true });
      mockReq.headers = { authorization: "Bearer token-super-admin" };
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: "super-1",
        email: "super@teste.com",
      });

      await manutencaoMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("deve liberar next() se em manutenção mas o usuário tiver cargo de admin no Firestore", async () => {
      mockObterStatusManutencao.mockResolvedValueOnce({ emManutencao: true });
      mockReq.headers = { authorization: "Bearer token-admin" };
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: "admin-uid",
        email: "comum@teste.com",
      });
      mockUserDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ cargo: "admin" }),
      });

      await manutencaoMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("deve liberar next() via fallback de email quando doc por UID não existir", async () => {
      mockObterStatusManutencao.mockResolvedValueOnce({ emManutencao: true });
      mockReq.headers = { authorization: "Bearer token-admin-email" };
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: "uid-novo",
        email: "presidencia@teste.com",
      });
      mockUserDocGet.mockResolvedValueOnce({ exists: false });
      mockUsersWhereGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ cargo: "presidencia" }) }],
      });

      await manutencaoMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("isRequestDeAdmin deve retornar false se não houver cabeçalho de autorização", async () => {
      const isAdmin = await isRequestDeAdmin({ headers: {} } as any);
      expect(isAdmin).toBe(false);
    });
  });
});
