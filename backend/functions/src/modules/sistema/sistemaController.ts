import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authMiddleware";
import * as sistemaService from "./sistemaService";
import { AtualizarManutencaoPayload } from "./sistemaTypes";

/**
 * Controller para operações globais de sistema e modo de manutenção.
 */
export const sistemaController = {
  /**
   * Endpoint público para consulta do status atual do modo de manutenção.
   * Não exige autenticação para permitir que a tela de login/visitantes verifiquem o estado.
   *
   * @param {Request} _req - Requisição Express.
   * @param {Response} res - Resposta Express contendo `ManutencaoStatusDto`.
   * @returns {Promise<void>}
   */
  async obterManutencao(_req: Request, res: Response): Promise<void> {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const status = await sistemaService.obterStatusManutencao();
    res.status(200).json(status);
  },

  /**
   * Endpoint administrativo para ativar ou desativar o modo de manutenção do sistema.
   * Exige autenticação de administrador (validada previamente por middleware).
   *
   * @param {AuthRequest} req - Requisição Express autenticada contendo o payload validado.
   * @param {Response} res - Resposta Express com o status atualizado.
   * @returns {Promise<void>}
   */
  async atualizarManutencao(req: AuthRequest, res: Response): Promise<void> {
    const payload = req.body as AtualizarManutencaoPayload;
    const adminEmail = req.user?.email;

    const manutencao = await sistemaService.atualizarStatusManutencao(
      payload,
      adminEmail,
    );

    res.status(200).json({
      success: true,
      manutencao,
    });
  },
};
