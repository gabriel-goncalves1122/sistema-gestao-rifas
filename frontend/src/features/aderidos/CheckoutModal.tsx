// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/CheckoutModal.tsx
// ============================================================================
import {
  Alert,
  Dialog,
  DialogContent,
  Snackbar,
  Stack,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

import { CheckoutModalHeader } from "./components/checkout/CheckoutModalHeader";
import { CheckoutResumoVenda } from "./components/checkout/CheckoutResumoVenda";
import { CheckoutNovaApiView } from "./components/checkout/novaApi/CheckoutNovaApiView";
import { usePixStateMachine } from "./hooks/usePixStateMachine";
import { checkoutStorage } from "./utils/checkoutStorage";

/**
 * Modos de Checkout suportados pela interface:
 * - `nova_api`: Chave direta / InfinitePay com foco em Copia-e-Cola e Comprovante (sem CPF, sem e-mail obrigatório).
 * - `mercadopago`: Gateway com confirmação automática via Webhook (exige CPF e E-mail).
 */
export type ModoCheckout = "nova_api" | "mercadopago";

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
  /** Modo inicial selecionado (padrão: "nova_api") */
  modoInicial?: ModoCheckout;
}

/**
 * Conteúdo interno do modal de Checkout.
 * Orquestra a troca entre a Nova API e o Mercado Pago, preservando a máquina de estados Pix.
 */
function CheckoutModalContent({
  open,
  onClose,
  onSuccess,
  numerosRifas,
  invalidarDadosPainel,
}: CheckoutModalProps) {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
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
    marcarComoExpiradoLocal,
    liberarReservaTotal,
    abortarGeracaoPendente,
  } = usePixStateMachine({ numerosRifas, sessaoCheckoutId, invalidarDadosPainel });

  const prevOpen = useRef(open);

  useEffect(() => {
    if (open && !prevOpen.current) {
      const cobrancaAtual = checkoutStorage.get().cobrancaPix;
      const temMesmasRifas =
        cobrancaAtual &&
        JSON.stringify([...cobrancaAtual.numerosRifas].sort()) ===
          JSON.stringify([...numerosRifas].sort());

      if (cobrancaAtual && cobrancaAtual.status === "aguardando_pagamento" && temMesmasRifas) {
        // Retoma o fluxo silenciosamente
      } else {
        resetarFluxoPix();
      }
    }
    prevOpen.current = open;
  }, [open, resetarFluxoPix, numerosRifas]);

  const fecharModal = () => {
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
      // Fecha a janela mantendo o Pix ativo no storage para envio pelo WhatsApp
      onClose();
      return;
    }

    liberarReservaTotal().catch(console.error);
    onClose();
  };

  const numerosRifasEfetivos = cobrancaPix?.numerosRifas?.length
    ? cobrancaPix.numerosRifas
    : numerosRifas;

  return (
    <>
      <CheckoutModalHeader
        gerandoPix={pollingStatus === "gerando"}
        onClose={fecharModal}
      />

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.25}>
          {/* Resumo visual do lote de rifas e valor total */}
          <CheckoutResumoVenda numerosRifas={numerosRifasEfetivos} />

          {/* Fluxo de Checkout Pix Direto / Chave Rápida */}
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

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2200}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          sx={{
            borderRadius: 2,
            fontWeight: 800,
          }}
        >
          Pix copia-e-cola copiado.
        </Alert>
      </Snackbar>
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
