// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/hooks/useCheckoutPixViewController.ts
// ============================================================================
import { useEffect } from "react";
import type { UseFormWatch } from "react-hook-form";

import { checkoutStorage } from "../utils/checkoutStorage";

/**
 * Estrutura mínima compartilhada pelos formulários de checkout Pix (Nova API e Mercado Pago).
 */
export interface CamposBasicosFormularioCheckout {
  nome: string;
  telefone: string;
  email: string;
  documento?: string;
}

/**
 * Recupera os dados persistidos do formulário de checkout para hidratação inicial do React Hook Form.
 *
 * @returns {{ nome: string; telefone: string; email: string; documento: string }} Campos restaurados ou vazios.
 */
export function obterDadosFormularioCheckoutInicial() {
  const formRestaurado = checkoutStorage.get().formData;

  return {
    nome: formRestaurado?.nome || "",
    telefone: formRestaurado?.telefone || "",
    email: formRestaurado?.email || "",
    documento: formRestaurado?.documento || "",
  };
}

/**
 * Propriedades do hook controlador compartilhado entre as views de checkout Pix.
 */
export interface UseCheckoutPixViewControllerParams<
  TForm extends CamposBasicosFormularioCheckout,
> {
  /** Assinante `watch` do React Hook Form para sincronizar alterações em `localStorage`. */
  watch: UseFormWatch<TForm>;
  /** Define se o campo `documento` (CPF/CNPJ) também é sobrescrito na persistência. */
  incluirDocumento?: boolean;
  /** Mensagem exibida no diálogo de confirmação antes de cancelar a cobrança Pix ativa. */
  mensagemConfirmacaoCancelamento: string;
  /** Executa a cópia do código Pix copia-e-cola retornando sucesso booleano. */
  copiarPix: () => boolean;
  /** Cancela a cobrança Pix no backend liberando as rifas (`reter=false`). */
  cancelarPix: (reter: boolean) => void;
  /** Atualiza a visibilidade do feedback de cópia bem-sucedida. */
  setSnackbarOpen: (open: boolean) => void;
}

/**
 * Orquestra os efeitos colaterais comuns às views de checkout Pix (Nova API e Mercado Pago):
 * persistência contínua do formulário em `checkoutStorage`, feedback de cópia do código Pix
 * e confirmação explícita do cancelamento de cobrança ativa.
 *
 * @param {UseCheckoutPixViewControllerParams<TForm>} params - Dependências da view e callbacks da FSM Pix.
 * @returns {{ handleCopiarPix: () => void; handleCancelarPixExplicito: () => void }} Handlers compartilhados para os boxes Pix.
 * @sideEffects Subscreve alterações do formulário em `localStorage` e dispara `window.confirm` no cancelamento.
 */
export function useCheckoutPixViewController<
  TForm extends CamposBasicosFormularioCheckout,
>({
  watch,
  incluirDocumento = false,
  mensagemConfirmacaoCancelamento,
  copiarPix,
  cancelarPix,
  setSnackbarOpen,
}: UseCheckoutPixViewControllerParams<TForm>) {
  useEffect(() => {
    const subscription = watch((value) => {
      const current = obterDadosFormularioCheckoutInicial();
      checkoutStorage.update({
        formData: {
          ...current,
          nome: value.nome || "",
          telefone: value.telefone || "",
          email: value.email || "",
          ...(incluirDocumento ? { documento: value.documento || "" } : {}),
        },
      });
    });

    return () => subscription.unsubscribe();
  }, [watch, incluirDocumento]);

  const handleCopiarPix = () => {
    const copiado = copiarPix();
    if (copiado) setSnackbarOpen(true);
  };

  const handleCancelarPixExplicito = () => {
    const confirmar = window.confirm(mensagemConfirmacaoCancelamento);
    if (!confirmar) return;
    cancelarPix(false);
  };

  return {
    handleCopiarPix,
    handleCancelarPixExplicito,
  };
}
