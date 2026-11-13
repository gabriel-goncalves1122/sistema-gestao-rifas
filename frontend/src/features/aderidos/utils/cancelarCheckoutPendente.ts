import { checkoutPixService } from "../services/checkoutPixService";
import { checkoutStorage } from "./checkoutStorage";

/**
 * Cancela no backend qualquer cobrança Pix pendente armazenada na sessão local,
 * liberando os bilhetes no Firestore antes de logout, troca de conta ou descarte de sessão.
 *
 * @returns {Promise<boolean>} `true` se havia cobrança ativa e a requisição foi disparada; caso contrário `false`.
 * @sideEffects Dispara POST /tesouraria/checkout/pix/:id/cancelar no backend.
 */
export async function cancelarCheckoutPendente(): Promise<boolean> {
  try {
    const estado = checkoutStorage.get();
    const cobranca = estado?.cobrancaPix;

    if (
      cobranca?.id &&
      cobranca.status !== "pago" &&
      cobranca.status !== "cancelado"
    ) {
      await checkoutPixService.cancelarCobrancaPix(cobranca.id, false);
      return true;
    }
  } catch (error) {
    console.warn("[cancelarCheckoutPendente] Falha ao cancelar cobrança órfã:", error);
  }
  return false;
}
