// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/services/criarCheckoutPixService.ts
// ============================================================================

import { CheckoutPixResposta, CriarCheckoutPixPayload } from "../types/checkoutPixTypes";
import { CheckoutStrategyFactory } from "../checkout/checkoutStrategyFactory";

export class CriarCheckoutPixService {
  /**
   * Cria uma nova cobrança Pix para o conjunto de rifas selecionadas delegando
   * para a estratégia orientada a objetos configurada (Mercado Pago ou Pix Normal/EMV Offline).
   *
   * @param {string} uid - Identificador do aderido vendedor.
   * @param {string} emailLogado - E-mail do aderido autenticado.
   * @param {CriarCheckoutPixPayload} payload - Dados cadastrais do comprador e lista de rifas.
   * @returns {Promise<CheckoutPixResposta>} Resposta com ID do pagamento, QR Code e Copia-e-Cola.
   * @throws {Error} `"UNAUTHORIZED"`, `"RIFA_NOT_FOUND"` ou `"RIFA_INDISPONIVEL"`.
   * @transactional Executa validação de concorrência e reserva atômica no Firestore via estratégia.
   */
  static async executar(
    uid: string,
    emailLogado: string,
    payload: CriarCheckoutPixPayload,
  ): Promise<CheckoutPixResposta> {
    const strategy = CheckoutStrategyFactory.obterParaCriacao();
    return await strategy.criarCheckout(uid, emailLogado, payload);
  }
}
