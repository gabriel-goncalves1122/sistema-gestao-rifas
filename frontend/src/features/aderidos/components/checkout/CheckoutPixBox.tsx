// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/CheckoutPixBox.tsx
// ============================================================================
import { useState } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Button, CircularProgress, Stack } from "@mui/material";

import type { CheckoutPixCobranca } from "../../types/checkoutPix";
import type { PixStatus } from "../../hooks/usePixStateMachine";
import { CheckoutPixPollingNotice } from "./states/CheckoutPixFeedbackStates";
import {
  CheckoutPixActions,
  CheckoutPixCopiaECola,
  CheckoutQrCodeDisplay,
} from "./states/CheckoutPixPaymentControls";
import {
  CheckoutPixBoxShell,
  CheckoutPixTerminalNotice,
  obterQrCodeSrc,
} from "./CheckoutPixBoxShell";
import { CheckoutComprovanteUpload } from "./CheckoutComprovanteUpload";
import { ResultadoValidacaoArquivo } from "@/shared/utils/validadorComprovante";
import { colors } from "@/shared/tokens/colors";

/**
 * Propriedades do painel padrão de checkout Pix (legado compatível com testes e fluxos combinados).
 */
export interface CheckoutPixBoxProps {
  /** Cobrança Pix ativa. */
  cobranca?: CheckoutPixCobranca | null;
  /** Indica se a geração da cobrança está em curso. */
  gerando?: boolean;
  /** Indica se o upload de comprovante está em andamento. */
  enviandoComprovante?: boolean;
  /** Mensagem de erro caso ocorra falha. */
  erro?: string | null;
  /** Status atual da máquina de estados Pix. */
  pollingStatus?: PixStatus;
  /** Indica cancelamento em andamento. */
  cancelando?: boolean;
  /** Callback para copiar o código copia-e-cola. */
  onCopiarPix: () => void;
  /** Callback para cancelar a cobrança. */
  onCancelarPix?: () => void;
  /** Callback acionado na expiração do tempo. */
  onExpirarPix?: () => void;
  /** Callback para tentar gerar nova cobrança. */
  onResetPix?: () => void;
  /** Callback acionado ao concluir venda paga. */
  onSuccess?: () => void;
  /** Callback para enviar comprovante ou confirmar pagamento. */
  onConfirmarEnvio?: (
    arquivo: File | null,
    resultado: ResultadoValidacaoArquivo | null,
  ) => void;
}

/**
 * Renderiza o painel de pagamento via Pix com QR Code, copia-e-cola, envio opcional
 * de comprovante e tratamento de estados de espera, expiração ou cancelamento.
 *
 * @param {CheckoutPixBoxProps} props - Estado da cobrança e handlers do fluxo Pix.
 * @returns {JSX.Element} Painel de pagamento via Pix.
 */
export function CheckoutPixBox({
  cobranca,
  gerando = false,
  enviandoComprovante = false,
  erro,
  pollingStatus = "idle",
  cancelando = false,
  onCopiarPix,
  onCancelarPix,
  onExpirarPix,
  onResetPix,
  onSuccess,
  onConfirmarEnvio,
}: CheckoutPixBoxProps) {
  const qrCodeSrc = cobranca ? obterQrCodeSrc(cobranca) : "";
  const [arquivoComprovante, setArquivoComprovante] = useState<File | null>(null);
  const [resultadoValidacao, setResultadoValidacao] =
    useState<ResultadoValidacaoArquivo | null>(null);

  const handleArquivoValido = (
    arquivo: File | null,
    resultado: ResultadoValidacaoArquivo | null,
  ) => {
    setArquivoComprovante(arquivo);
    setResultadoValidacao(resultado);
  };

  const handleSubmeterEnvio = () => {
    if (onConfirmarEnvio) {
      onConfirmarEnvio(arquivoComprovante, resultadoValidacao);
    }
  };

  return (
    <CheckoutPixBoxShell
      titulo="Pagamento via Pix"
      cobranca={cobranca}
      gerando={gerando}
      ocupado={enviandoComprovante}
      erro={erro}
      pollingStatus={pollingStatus}
      cancelando={cancelando}
      onCancelarPix={onCancelarPix}
      onResetPix={onResetPix}
      onSuccess={onSuccess}
    >
      <Stack spacing={1.5}>
        {cobranca && pollingStatus === "aguardando_pagamento" && (
          <>
            <CheckoutPixPollingNotice />
            <CheckoutQrCodeDisplay qrCodeSrc={qrCodeSrc} />
            <CheckoutPixCopiaECola codigo={cobranca.copiaECola} />
            <CheckoutPixActions
              cobranca={cobranca}
              cancelando={cancelando}
              onCopiarPix={onCopiarPix}
              onCancelarPix={onCancelarPix}
              onExpirarPix={onExpirarPix}
            />

            <CheckoutComprovanteUpload
              arquivoSelecionado={arquivoComprovante}
              onArquivoValido={handleArquivoValido}
              disabled={enviandoComprovante || cancelando}
            />

            {onConfirmarEnvio && (
              <Button
                onClick={handleSubmeterEnvio}
                variant="contained"
                fullWidth
                disabled={enviandoComprovante || cancelando}
                startIcon={
                  enviandoComprovante ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <CheckCircleIcon />
                  )
                }
                sx={{
                  mt: 1,
                  py: 1.35,
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 900,
                  fontSize: "0.95rem",
                  bgcolor: colors.verdeForteEscuro,
                  color: colors.branco,
                  "&:hover": { bgcolor: colors.verdeEscuro },
                }}
              >
                {enviandoComprovante
                  ? "Enviando comprovante..."
                  : arquivoComprovante
                    ? "Confirmar com Comprovante"
                    : "Já realizei o pagamento (Confirmar)"}
              </Button>
            )}
          </>
        )}

        {(pollingStatus === "cancelado" || pollingStatus === "expirado") && (
          <CheckoutPixTerminalNotice
            status={pollingStatus}
            onResetPix={onResetPix}
          />
        )}
      </Stack>
    </CheckoutPixBoxShell>
  );
}
