// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/mercadopago/CheckoutMercadoPagoPixBox.tsx
// ============================================================================
import CloseIcon from "@mui/icons-material/Close";
import PixIcon from "@mui/icons-material/Pix";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";

import type { CheckoutPixCobranca } from "../../../types/checkoutPix";
import type { PixStatus } from "../../../hooks/usePixStateMachine";
import {
  CheckoutPixActions,
  CheckoutPixCanceledNotice,
  CheckoutPixConfirmed,
  CheckoutPixCopiaECola,
  CheckoutPixEmpty,
  CheckoutPixError,
  CheckoutPixExpiredNotice,
  CheckoutPixLoading,
  CheckoutPixPollingNotice,
  CheckoutQrCodeDisplay,
} from "../CheckoutPixBoxStates";
import { colors } from "@/shared/tokens/colors";

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
 * Extrai a fonte da imagem do QR Code a partir da cobrança.
 *
 * @param {CheckoutPixCobranca} cobranca - Objeto da cobrança.
 * @returns {string} URI da imagem Base64 ou URL HTTP.
 */
function obterQrCodeSrc(cobranca: CheckoutPixCobranca): string {
  if (cobranca.qrCodeImagemUrl) return cobranca.qrCodeImagemUrl;
  if (cobranca.qrCodeBase64) {
    return `data:image/png;base64,${cobranca.qrCodeBase64}`;
  }
  return "";
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
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: colors.branco,
        border: `1px solid ${colors.borda}`,
      }}
    >
      {/* Header do Box */}
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25 }}>
        <PixIcon sx={{ color: colors.verdeEscuro }} />

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontWeight: 900,
              color: colors.pretoEsverdeado,
              fontSize: "0.98rem",
              lineHeight: 1.2,
            }}
          >
            Pix Dinâmico Automático (Mercado Pago)
          </Typography>
        </Box>

        {!gerando && cobranca && pollingStatus !== "sucesso" && onCancelarPix && (
          <IconButton
            onClick={onCancelarPix}
            disabled={cancelando}
            size="small"
            sx={{ color: colors.erroForte }}
            aria-label="Cancelar pagamento"
            title="Cancelar cobrança Pix e liberar rifas"
          >
            {cancelando ? <CircularProgress size={18} color="inherit" /> : <CloseIcon />}
          </IconButton>
        )}
      </Stack>

      {/* Estado: Carregando */}
      {gerando && <CheckoutPixLoading />}

      {/* Estado: Erro */}
      {!gerando && erro && (
        <Box sx={{ mb: 1.5 }}>
          <CheckoutPixError erro={erro} />
        </Box>
      )}

      {/* Estado: Vazio */}
      {!gerando && !erro && !cobranca && <CheckoutPixEmpty />}

      {/* Estado: Sucesso */}
      {!gerando && cobranca && pollingStatus === "sucesso" && (
        <Stack spacing={2} sx={{ mt: 1 }}>
          <CheckoutPixConfirmed />
          {onSuccess && (
            <Button
              onClick={onSuccess}
              variant="contained"
              fullWidth
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 900,
                bgcolor: colors.verdeForteEscuro,
                color: colors.branco,
                py: 1.25,
                "&:hover": { bgcolor: colors.verdeEscuro },
              }}
            >
              Concluir Venda
            </Button>
          )}
        </Stack>
      )}

      {/* Estado: Aguardando Pagamento */}
      {!gerando && cobranca && pollingStatus !== "sucesso" && (
        <Stack spacing={1.5}>
          {pollingStatus === "aguardando_pagamento" && (
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
            <Stack spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
              {pollingStatus === "expirado" ? (
                <CheckoutPixExpiredNotice />
              ) : (
                <CheckoutPixCanceledNotice />
              )}

              {onResetPix && (
                <Button
                  onClick={onResetPix}
                  variant="contained"
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 900,
                    bgcolor: colors.verdeEscuro,
                    color: colors.branco,
                    px: 3,
                    py: 1.25,
                    "&:hover": { bgcolor: colors.verdeEscuroHover },
                  }}
                >
                  Tentar novamente
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      )}
    </Box>
  );
}
