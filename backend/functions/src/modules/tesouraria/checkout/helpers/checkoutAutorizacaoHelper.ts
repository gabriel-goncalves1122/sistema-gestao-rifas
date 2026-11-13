// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/checkout/helpers/checkoutAutorizacaoHelper.ts
// ============================================================================

import { PagamentoPix } from "../../../types/models";
import { obterContextoAderidoPorEmail } from "../../../rifas/helpers/usuarioRifasHelper";

/**
 * Verifica se o usuário autenticado possui permissão para cancelar o pagamento informado
 * (super-admin, comprador titular, aderido dono do lote ou vendedor direto).
 *
 * @param {Object} params - Contexto do usuário autenticado e documento de pagamento.
 * @returns {Promise<boolean>} `true` se autorizado a cancelar.
 */
export async function verificarAutorizacaoCancelamentoCheckout(params: {
  uid: string;
  email: string;
  role: string;
  pagamento: PagamentoPix;
}): Promise<boolean> {
  const { uid, email, role, pagamento } = params;

  if (role === "super-admin") return true;
  if (pagamento.comprador_id === uid) return true;

  if (email) {
    try {
      const contextoAderido = await obterContextoAderidoPorEmail(email);
      if (contextoAderido && contextoAderido.idAderido === pagamento.vendedor_id) {
        return true;
      }
    } catch {
      // Fallback caso o usuário autenticado não possua cadastro de aderido
    }
  }

  return pagamento.vendedor_id === uid;
}

/**
 * Garante que apenas o vendedor dono da venda ou perfis administrativos/tesouraria
 * possam confirmar o envio manual do comprovante Pix.
 *
 * @param {PagamentoPix} pagamento - Documento do pagamento avaliado.
 * @param {string} idAderido - Identificador do aderido logado.
 * @param {string} [role] - Papel do usuário autenticado.
 * @throws {Error} `"UNAUTHORIZED"` caso não possua permissão.
 */
export function validarAutorizacaoConfirmacaoEnvio(
  pagamento: PagamentoPix,
  idAderido: string,
  role?: string,
): void {
  const isDono = pagamento.vendedor_id === idAderido;
  const isAdmin = ["admin", "presidencia", "tesouraria"].includes(role || "");

  if (!isDono && !isAdmin) {
    throw new Error("UNAUTHORIZED");
  }
}
