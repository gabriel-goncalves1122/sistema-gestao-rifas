import { useCallback } from "react";
import { checkoutStorage } from "../utils/checkoutStorage";

interface UseCheckoutFlowParams {
  fecharCheckout: () => void;
  limparSelecao: () => void;
  invalidarDadosPainel: () => Promise<void>;
}

/**
 * Hook de encerramento do fluxo de Checkout.
 * Executa as ações pós-compra bem-sucedida:
 * 1. Limpa o storage local do checkout (`checkoutStorage.clear()`);
 * 2. Fecha o modal de checkout;
 * 3. Limpa a seleção de bilhetes no carrinho;
 * 4. Dispara a revalidação dos dados do painel do aderido.
 *
 * @param {UseCheckoutFlowParams} params - Callbacks de controle da interface.
 * @returns {{ finalizarVendaComSucesso: () => Promise<void> }}
 */
export function useCheckoutFlow({
  fecharCheckout,
  limparSelecao,
  invalidarDadosPainel,
}: UseCheckoutFlowParams) {
  const finalizarVendaComSucesso = useCallback(async () => {
    // Limpa toda a persistência do checkout ao finalizar com sucesso.
    checkoutStorage.clear();

    fecharCheckout();
    limparSelecao();

    await invalidarDadosPainel();
  }, [fecharCheckout, invalidarDadosPainel, limparSelecao]);

  return {
    finalizarVendaComSucesso,
  };
}
