// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/services/cancelarCheckoutPixService.ts
// ============================================================================

import { CheckoutStrategyFactory } from "../checkout/checkoutStrategyFactory";
import { CheckoutPixRepository } from "../checkout/repositories/checkoutPixRepository";
import { CancelarCheckoutInput } from "../checkout/strategies/baseCheckoutStrategy";

export class CancelarCheckoutPixService {
  /**
   * Cancela um checkout Pix pendente delegando o fluxo à estratégia OO correspondente
   * ao provedor de pagamento daquela cobrança (Mercado Pago ou Pix Normal/EMV Offline).
   *
   * @param {CancelarCheckoutInput} params - Contexto autenticado e ID do pagamento.
   * @returns {Promise<void>}
   * @throws {Error} `"UNAUTHORIZED"`, `"PAGAMENTO_NOT_FOUND"`, `"PAGAMENTO_JA_APROVADO"` ou `"STATUS_INVALIDO_CANCELAMENTO"`.
   * @transactional Executa a liberação dos bilhetes e atualização do pagamento atomicamente.
   */
  static async executar(params: CancelarCheckoutInput): Promise<void> {
    if (!params.uid || !params.pagamentoId) {
      throw new Error("UNAUTHORIZED");
    }

    const repository = new CheckoutPixRepository();
    const pagamento = await repository.buscarPagamentoPorId(params.pagamentoId);

    if (!pagamento) {
      throw new Error("PAGAMENTO_NOT_FOUND");
    }

    const strategy = CheckoutStrategyFactory.obterPorPagamento(pagamento, repository);
    await strategy.cancelarCheckout(params, pagamento);
  }
}
