import CloseIcon from "@mui/icons-material/Close";
import PixIcon from "@mui/icons-material/Pix";
import { Box, IconButton, Stack, Typography, CircularProgress, Button } from "@mui/material";

import type { CheckoutPixCobranca } from "../../types/checkoutPix";
import type { PixStatus } from "../../hooks/usePixStateMachine";
import {
  CheckoutPixActions,
  CheckoutPixCopiaECola,
  CheckoutPixConfirmed,
  CheckoutPixCanceledNotice,
  CheckoutPixEmpty,
  CheckoutPixError,
  CheckoutPixExpiredNotice,
  CheckoutPixLoading,
  CheckoutPixPollingNotice,
  CheckoutQrCodeDisplay,
} from "./CheckoutPixBoxStates";
import { colors } from "@/shared/tokens/colors";

interface CheckoutPixBoxProps {
  cobranca?: CheckoutPixCobranca | null;
  gerando?: boolean;
  erro?: string | null;
  pollingStatus?: PixStatus;
  cancelando?: boolean;
  onCopiarPix: () => void;
  onCancelarPix?: () => void;
  onExpirarPix?: () => void;
  onResetPix?: () => void;
  onSuccess?: () => void;
}

function obterQrCodeSrc(cobranca: CheckoutPixCobranca) {
  if (cobranca.qrCodeImagemUrl) return cobranca.qrCodeImagemUrl;
  if (cobranca.qrCodeBase64) {
    return `data:image/png;base64,${cobranca.qrCodeBase64}`;
  }

  return "";
}

export function CheckoutPixBox({
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
}: CheckoutPixBoxProps) {
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
            Pagamento via Pix
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

      {gerando && <CheckoutPixLoading />}

      {!gerando && erro && (
        <Box sx={{ mb: 1.5 }}>
          <CheckoutPixError erro={erro} />
        </Box>
      )}

      {!gerando && !erro && !cobranca && <CheckoutPixEmpty />}

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
