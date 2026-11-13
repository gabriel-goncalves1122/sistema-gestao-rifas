// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/services/confirmarEnvioCheckoutPixService.ts
// ============================================================================

import {
  ConfirmarEnvioCheckoutInput,
  ConfirmarEnvioCheckoutOutput,
} from "../checkout/strategies/baseCheckoutStrategy";
import { CheckoutStrategyFactory } from "../checkout/checkoutStrategyFactory";
import { CheckoutPixRepository } from "../checkout/repositories/checkoutPixRepository";

export class ConfirmarEnvioCheckoutPixService {
  /**
   * Confirma atômica e transacionalmente o envio de comprovante / declaração de pagamento
   * de um checkout Pix Normal / EMV Offline delegando à estratégia correspondente.
   *
   * @param {ConfirmarEnvioCheckoutInput} params - Dados do usuário autenticado, ID do pagamento e comprovante.
   * @returns {Promise<ConfirmarEnvioCheckoutOutput>} Confirmação com lista de rifas atualizadas.
   * @transactional Executa leitura e escrita atômica dentro de `db.runTransaction` com proteção TOCTOU.
   * @throws {Error} `"UNAUTHORIZED"`, `"PAGAMENTO_NOT_FOUND"`, `"CONFIRMACAO_MANUAL_NAO_SUPORTADA"` ou `"TRANSACAO_JA_FINALIZADA"`.
   */
  static async executar(
    params: ConfirmarEnvioCheckoutInput,
  ): Promise<ConfirmarEnvioCheckoutOutput> {
    if (!params.uid || !params.emailLogado || !params.pagamentoId) {
      throw new Error("UNAUTHORIZED");
    }

    if (!params.comprovanteUrl || !params.comprovanteUrl.trim()) {
      throw new Error("COMPROVANTE_OBRIGATORIO");
    }

    const repository = new CheckoutPixRepository();
    const pagamento = await repository.buscarPagamentoPorId(params.pagamentoId);

    if (!pagamento) {
      throw new Error("PAGAMENTO_NOT_FOUND");
    }

    const strategy = CheckoutStrategyFactory.obterPorPagamento(pagamento, repository);
    return await strategy.confirmarEnvioComprovante(params);
  }
}
