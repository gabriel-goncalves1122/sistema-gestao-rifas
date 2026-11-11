// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/CheckoutModal.tsx
// ============================================================================
import {
  Button,
  Dialog,
  DialogContent,
  Stack,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import { useEffect, useRef, useState } from "react";

import { FeedbackSnackbar } from "@/shared/components/FeedbackSnackbar";

import { CheckoutModalHeader } from "./components/checkout/CheckoutModalHeader";
import { CheckoutResumoVenda } from "./components/checkout/CheckoutResumoVenda";
import { CheckoutNovaApiView } from "./components/checkout/novaApi/CheckoutNovaApiView";
import { CheckoutMercadoPagoView } from "./components/checkout/mercadopago/CheckoutMercadoPagoView";
import { usePixStateMachine } from "./hooks/usePixStateMachine";
import { checkoutStorage } from "./utils/checkoutStorage";
import { colors } from "@/shared/tokens/colors";

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
  modoInicial = "nova_api",
}: CheckoutModalProps) {
  const [modoCheckout, setModoCheckout] = useState<ModoCheckout>(modoInicial);
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

  const temMesmasRifasNaCobranca =
    Boolean(cobrancaPix?.numerosRifas?.length) &&
    JSON.stringify([...(cobrancaPix?.numerosRifas || [])].sort()) ===
      JSON.stringify([...numerosRifas].sort());

  const numerosRifasEfetivos =
    temMesmasRifasNaCobranca && cobrancaPix
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

          {/* Seletor de Modo de Pagamento (Nova API vs Mercado Pago) */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              p: 0.5,
              bgcolor: colors.fundoSuave,
              borderRadius: 2.5,
              border: `1px solid ${colors.borda}`,
            }}
          >
            <Button
              fullWidth
              size="small"
              onClick={() => setModoCheckout("nova_api")}
              disabled={Boolean(cobrancaPix) || pollingStatus === "gerando"}
              startIcon={<FlashOnIcon fontSize="small" />}
              sx={{
                borderRadius: 2,
                py: 0.85,
                fontWeight: 800,
                fontSize: { xs: "0.78rem", sm: "0.82rem" },
                textTransform: "none",
                transition: "all 0.2s ease",
                ...(modoCheckout === "nova_api"
                  ? {
                      bgcolor: colors.branco,
                      color: colors.verdeEscuro,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      "&:hover": { bgcolor: colors.branco },
                    }
                  : {
                      color: colors.cinzaTexto,
                      "&:hover": { bgcolor: "transparent", color: colors.verdeEscuro },
                    }),
              }}
            >
              Pix Chave Rápida
            </Button>

            <Button
              fullWidth
              size="small"
              onClick={() => setModoCheckout("mercadopago")}
              disabled={Boolean(cobrancaPix) || pollingStatus === "gerando"}
              startIcon={<AccountBalanceIcon fontSize="small" />}
              sx={{
                borderRadius: 2,
                py: 0.85,
                fontWeight: 800,
                fontSize: { xs: "0.78rem", sm: "0.82rem" },
                textTransform: "none",
                transition: "all 0.2s ease",
                ...(modoCheckout === "mercadopago"
                  ? {
                      bgcolor: colors.branco,
                      color: colors.verdeEscuro,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      "&:hover": { bgcolor: colors.branco },
                    }
                  : {
                      color: colors.cinzaTexto,
                      "&:hover": { bgcolor: "transparent", color: colors.verdeEscuro },
                    }),
              }}
            >
              Mercado Pago
            </Button>
          </Stack>

          {/* Renderização Condicional do Fluxo de Checkout Escolhido */}
          {modoCheckout === "nova_api" ? (
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
          ) : (
            <CheckoutMercadoPagoView
              numerosRifas={numerosRifasEfetivos}
              cobrancaPix={cobrancaPix}
              pollingStatus={pollingStatus}
              cancelandoPix={cancelandoPix}
              erroPix={erroPix}
              gerarCobranca={gerarCobranca}
              copiarPix={copiarPix}
              cancelarPix={cancelarPix}
              resetarFluxoPix={resetarFluxoPix}
              marcarComoExpiradoLocal={marcarComoExpiradoLocal}
              onSuccess={onSuccess}
              setSnackbarOpen={setSnackbarOpen}
            />
          )}
        </Stack>
      </DialogContent>

      <FeedbackSnackbar
        open={snackbarOpen}
        mensagem="Pix copia-e-cola copiado."
        severidade="success"
        autoHideDuration={2200}
        onClose={() => setSnackbarOpen(false)}
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
