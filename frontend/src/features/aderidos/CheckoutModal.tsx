// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/CheckoutModal.tsx
// ============================================================================
import {
  Dialog,
  DialogContent,
  Stack,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

import { FeedbackSnackbar } from "@/shared/components/FeedbackSnackbar";

import { CheckoutCancelarReservaDialog } from "./components/checkout/CheckoutCancelarReservaDialog";
import { CheckoutModalHeader } from "./components/checkout/CheckoutModalHeader";
import { CheckoutResumoVenda } from "./components/checkout/CheckoutResumoVenda";
import { CheckoutNovaApiView } from "./components/checkout/novaApi/CheckoutNovaApiView";
import { usePixStateMachine } from "./hooks/usePixStateMachine";
import { checkoutStorage } from "./utils/checkoutStorage";

/**
 * Propriedades do orquestrador modal de Checkout.
 */
interface CheckoutModalProps {
  /** Se o modal está aberto na tela */
  open: boolean;
  /** Disparado ao fechar a janela */
  onClose: () => void;
  /** Disparado após a conclusão com sucesso */
  onSuccess: () => void;
  /** Lista de bilhetes selecionados no carrinho */
  numerosRifas: string[];
  /** Callback para invalidar e recarregar dados do painel */
  invalidarDadosPainel: () => Promise<void>;
}

/**
 * Conteúdo interno do modal de Checkout.
 * Orquestra o fluxo único via InfinitePay (EMV Offline + Comprovante), preservando a máquina de estados Pix.
 */
function CheckoutModalContent({
  open,
  onClose,
  onSuccess,
  numerosRifas,
  invalidarDadosPainel,
}: CheckoutModalProps) {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [confirmarCancelamentoOpen, setConfirmarCancelamentoOpen] = useState(false);
  const sessaoCheckoutId = useRef(
    checkoutStorage.get().sessaoCheckoutId || `sessao_${Date.now()}`
  ).current;

  useEffect(() => {
    checkoutStorage.update({ sessaoCheckoutId });
  }, [sessaoCheckoutId]);

  const {
    status: pollingStatus,
    cobrancaPix,
    erro: erroPix,
    cancelando: cancelandoPix,
    enviandoComprovante,
    gerarCobranca,
    confirmarEnvioComprovante,
    copiarPix,
    cancelarCobranca: cancelarPix,
    resetarFluxo: resetarFluxoPix,
    liberarReservaTotal,
    abortarGeracaoPendente,
  } = usePixStateMachine({
    numerosRifas,
    sessaoCheckoutId,
    invalidarDadosPainel,
    onSuccess,
  });

  const prevOpen = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) {
      const cobrancaAtual = checkoutStorage.get().cobrancaPix;
      const temMesmasRifas =
        Boolean(cobrancaAtual?.numerosRifas?.length) &&
        JSON.stringify([...(cobrancaAtual?.numerosRifas || [])].sort()) ===
          JSON.stringify([...numerosRifas].sort());
      const naoExpirou =
        !cobrancaAtual?.expiraEm ||
        new Date(cobrancaAtual.expiraEm).getTime() > Date.now();

      if (
        cobrancaAtual &&
        cobrancaAtual.status === "aguardando_pagamento" &&
        temMesmasRifas &&
        naoExpirou
      ) {
        // Retoma o fluxo silenciosamente quando a cobrança ativa corresponde às mesmas rifas
      } else if (cobrancaAtual) {
        if (cobrancaAtual.status === "aguardando_pagamento") {
          liberarReservaTotal().catch(console.warn);
        } else {
          resetarFluxoPix();
        }
      }
    }
    prevOpen.current = open;
  }, [open, resetarFluxoPix, liberarReservaTotal, numerosRifas]);

  const fecharModal = () => {
    if (enviandoComprovante) {
      return;
    }

    if (pollingStatus === "gerando") {
      abortarGeracaoPendente();
      onClose();
      return;
    }

    if (pollingStatus === "sucesso") {
      onSuccess();
      return;
    }

    if (pollingStatus === "aguardando_pagamento") {
      setConfirmarCancelamentoOpen(true);
      return;
    }

    liberarReservaTotal().catch(console.error);
    onClose();
  };

  const handleConfirmarCancelamento = async () => {
    setConfirmarCancelamentoOpen(false);
    await liberarReservaTotal();
    onClose();
  };

  const temMesmasRifasNaCobranca =
    Boolean(cobrancaPix?.numerosRifas?.length) &&
    JSON.stringify([...(cobrancaPix?.numerosRifas || [])].sort()) ===
      JSON.stringify([...numerosRifas].sort());

  const numerosRifasEfetivos =
    temMesmasRifasNaCobranca && cobrancaPix
      ? cobrancaPix.numerosRifas || numerosRifas
      : numerosRifas;

  return (
    <>
      <CheckoutModalHeader
        gerandoPix={pollingStatus === "gerando"}
        desabilitado={enviandoComprovante}
        onClose={fecharModal}
      />

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.25}>
          {/* Resumo visual do lote de rifas e valor total */}
          <CheckoutResumoVenda numerosRifas={numerosRifasEfetivos} />

          {/* Fluxo único de Checkout via InfinitePay (EMV Offline + Comprovante) */}
          <CheckoutNovaApiView
            numerosRifas={numerosRifasEfetivos}
            cobrancaPix={cobrancaPix}
            pollingStatus={pollingStatus}
            cancelandoPix={cancelandoPix}
            enviandoComprovante={enviandoComprovante}
            erroPix={erroPix}
            gerarCobranca={gerarCobranca}
            copiarPix={copiarPix}
            cancelarPix={cancelarPix}
            resetarFluxoPix={resetarFluxoPix}
            onSuccess={onSuccess}
            confirmarEnvioComprovante={confirmarEnvioComprovante}
            setSnackbarOpen={setSnackbarOpen}
          />
        </Stack>
      </DialogContent>

      <FeedbackSnackbar
        open={snackbarOpen}
        mensagem="Pix copia-e-cola copiado."
        severidade="success"
        autoHideDuration={2200}
        onClose={() => setSnackbarOpen(false)}
      />

      <CheckoutCancelarReservaDialog
        open={confirmarCancelamentoOpen}
        cancelando={cancelandoPix}
        onConfirmar={handleConfirmarCancelamento}
        onVoltar={() => setConfirmarCancelamentoOpen(false)}
      />
    </>
  );
}

/**
 * Modal flutuante de Checkout para venda de rifas.
 *
 * @param {CheckoutModalProps} props - Propriedades do modal.
 */
export function CheckoutModal(props: CheckoutModalProps) {
  if (!props.open) return null;

  return (
    <Dialog
      open={props.open}
      disableEscapeKeyDown={false}
      onClose={(_, reason) => {
        if (reason === "backdropClick") return;
        if (reason === "escapeKeyDown") {
          return;
        }
      }}
      fullWidth
      maxWidth="sm"
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(4px)",
        },
      }}
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: { xs: "20px 20px 0 0", sm: 3 },
          m: { xs: 0, sm: 2 },
          position: { xs: "absolute", sm: "relative" },
          bottom: { xs: 0, sm: "auto" },
          width: "100%",
          maxHeight: { xs: "calc(100% - 64px)", sm: "calc(100% - 64px)" },
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        },
      }}
    >
      <CheckoutModalContent {...props} />
    </Dialog>
  );
}
