// ============================================================================
// ARQUIVO: backend/functions/src/modules/auth/authController.ts
// ============================================================================
import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authMiddleware"; // Ajuste o caminho se necessário
import { authService } from "./authService";

/**
 * Controller responsável pelos endpoints de autenticação e ativação de contas no sistema.
 */
export const authController = {
  /**
   * Endpoint de verificação prévia de elegibilidade de e-mail institucional/Keeper.
   *
   * @param {Request} req - Requisição Express com `{ email }` no body.
   * @param {Response} res - Resposta HTTP 200 (elegível), 400 (parâmetro ausente) ou 403 (não autorizado).
   * @returns {Promise<Response>}
   */
  async verificarElegibilidade(req: Request, res: Response): Promise<any> {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "E-mail não fornecido." });
      }

      const ehElegivel = await authService.verificarElegibilidade(email);

      if (!ehElegivel) {
        return res.status(403).json({
          error:
            "E-mail não encontrado na lista oficial da comissão. Utilize o mesmo e-mail da Keeper.",
        });
      }

      return res
        .status(200)
        .json({ sucesso: true, mensagem: "Formando elegível." });
    } catch (error) {
      console.error("Erro ao verificar elegibilidade:", error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  },

  /**
   * Endpoint para conclusão do registro inicial de um formando autenticado.
   * Salva os dados cadastrais (nome, CPF, telefone) e ativa o registro no banco.
   *
   * @param {AuthRequest} req - Requisição autenticada contendo `req.user` e os dados no corpo.
   * @param {Response} res - Resposta HTTP 200 (sucesso), 401 (não autenticado), 404 (usuário inexistente) ou 500.
   * @returns {Promise<Response>}
   */
  async completarRegisto(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user || !req.user.email) {
        return res
          .status(401)
          .json({ error: "Sessão inválida ou não autorizado." });
      }

      const email = req.user.email;
      const uid = req.user.uid;
      const { nome, cpf, telefone } = req.body;

      // Delega a gravação no banco para o authService
      await authService.completarRegisto(email, uid, { nome, cpf, telefone });

      return res
        .status(200)
        .json({ sucesso: true, mensagem: "Registo concluído com sucesso!" });
    } catch (error: any) {
      console.error("Erro ao completar registo:", error);

      if (error.message === "USUARIO_NAO_ENCONTRADO") {
        return res
          .status(404)
          .json({ error: "Ficha de aderido não encontrada na base de dados." });
      }

      return res
        .status(500)
        .json({ error: "Falha interna ao gravar dados do formando." });
    }
  },

  /* 👇 DESATIVADO: Função nativa do Firebase SDK do Frontend é mais eficiente
  async solicitarRecuperacao(req: Request, res: Response): Promise<any> {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "E-mail obrigatório." });

      const link = await authService.gerarLinkRecuperacao(email);
      console.log(`[BACKEND] Link gerado para ${email}: ${link}`);

      return res.status(200).json({ sucesso: true, mensagem: "Processo de recuperação iniciado." });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return res.status(404).json({ error: "Utilizador não encontrado." });
      }
      return res.status(500).json({ error: "Erro interno." });
    }
  },
  */
};
