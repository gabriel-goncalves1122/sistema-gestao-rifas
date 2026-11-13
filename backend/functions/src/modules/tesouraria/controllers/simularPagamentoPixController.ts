// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/controllers/simularPagamentoPixController.ts
// ============================================================================
import { Request, Response } from "express";

import { CheckoutPixRepository } from "../checkout/repositories/checkoutPixRepository";

/**
 * Controller de desenvolvimento/emulador para simular a confirmação bancária
 * de um pagamento Pix e transicionar os bilhetes para análise da Tesouraria.
 *
 * @param {Request} req - Requisição Express contendo `params.id`.
 * @param {Response} res - Resposta HTTP.
 */
export async function simularPagamentoPix(req: Request, res: Response) {
  try {
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
    if (!isEmulator) {
      return res
        .status(403)
        .json({ error: "Endpoint disponível apenas em ambiente de desenvolvimento." });
    }

    const id = String(req.params.id || "");
    if (!id) {
      return res.status(400).json({ error: "ID do pagamento obrigatório." });
    }

    const repository = new CheckoutPixRepository();
    await repository.simularPagamento(id);

    return res.status(200).json({ message: "Pagamento simulado com sucesso." });
  } catch (error: any) {
    if (error.message === "PAGAMENTO_NOT_FOUND") {
      return res.status(404).json({ error: "Pagamento não encontrado." });
    }

    console.error("[SimularPagamentoPix] Erro:", error);
    return res.status(500).json({ error: "Erro ao simular pagamento." });
  }
}
