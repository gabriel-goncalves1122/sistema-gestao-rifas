// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/mercadopago/CheckoutMercadoPagoPixBox.tsx
// ============================================================================
import { Stack } from "@mui/material";

import type { CheckoutPixCobranca } from "../../../types/checkoutPix";
import type { PixStatus } from "../../../hooks/usePixStateMachine";
import { CheckoutPixPollingNotice } from "../states/CheckoutPixFeedbackStates";
import {
  CheckoutPixActions,
  CheckoutPixCopiaECola,
  CheckoutQrCodeDisplay,
} from "../states/CheckoutPixPaymentControls";
import {
  CheckoutPixBoxShell,
  CheckoutPixTerminalNotice,
  obterQrCodeSrc,
} from "../CheckoutPixBoxShell";

/**
 * Propriedades do componente CheckoutMercadoPagoPixBox.
 */
interface CheckoutMercadoPagoPixBoxProps {
  /** Objeto da cobrança Pix ativa */
  cobranca?: CheckoutPixCobranca | null;
  /** Se `true`, indica que o gateway está gerando a cobrança */
  gerando?: boolean;
  /** Mensagem de erro caso a geração falhe */
  erro?: string | null;
  /** Estado atual da máquina de estados do Pix */
  pollingStatus?: PixStatus;
  /** Se `true`, indica cancelamento em processamento */
  cancelando?: boolean;
  /** Callback para copiar o código Pix para a área de transferência */
  onCopiarPix: () => void;
  /** Callback para cancelar o Pix e liberar rifas */
  onCancelarPix?: () => void;
  /** Callback disparado quando o tempo limite do gateway expirar */
  onExpirarPix?: () => void;
  /** Callback para resetar o fluxo */
  onResetPix?: () => void;
  /** Callback disparado ao concluir com sucesso */
  onSuccess?: () => void;
}

/**
 * Painel Pix para o Gateway Mercado Pago.
 * Implementa confirmação em tempo real via webhook / listener Firestore, com contagem
 * regressiva de expiração e sem necessidade de upload de comprovante.
 *
 * @param {CheckoutMercadoPagoPixBoxProps} props - Propriedades do componente.
 */
export function CheckoutMercadoPagoPixBox({
  cobranca,
  gerando = false,
  erro,
  pollingStatus = "idle",
  cancelando = false,
  onCopiarPix,
  onCancelarPix,
  onExpirarPix,
  onResetPix,
  onSuccess,
}: CheckoutMercadoPagoPixBoxProps) {
  const qrCodeSrc = cobranca ? obterQrCodeSrc(cobranca) : "";

  return (
    <CheckoutPixBoxShell
      titulo="Pix Dinâmico Automático (Mercado Pago)"
      cobranca={cobranca}
      gerando={gerando}
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
