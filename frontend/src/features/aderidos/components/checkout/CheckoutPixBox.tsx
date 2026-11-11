// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/CheckoutPixBox.tsx
// ============================================================================

import { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import PixIcon from "@mui/icons-material/Pix";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
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
import { CheckoutComprovanteUpload } from "./CheckoutComprovanteUpload";
import { ResultadoValidacaoArquivo } from "@/shared/utils/validadorComprovante";
import { colors } from "@/shared/tokens/colors";

interface CheckoutPixBoxProps {
  cobranca?: CheckoutPixCobranca | null;
  gerando?: boolean;
  enviandoComprovante?: boolean;
  erro?: string | null;
  pollingStatus?: PixStatus;
  cancelando?: boolean;
  onCopiarPix: () => void;
  onCancelarPix?: () => void;
  onExpirarPix?: () => void;
  onResetPix?: () => void;
  onSuccess?: () => void;
  onConfirmarEnvio?: (
    arquivo: File | null,
    resultado: ResultadoValidacaoArquivo | null,
  ) => void;
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
  const [resultadoValidacao, setResultadoValidacao] = useState<ResultadoValidacaoArquivo | null>(null);

  const handleArquivoValido = (arquivo: File | null, resultado: ResultadoValidacaoArquivo | null) => {
    setArquivoComprovante(arquivo);
    setResultadoValidacao(resultado);
  };

  const handleSubmeterEnvio = () => {
    if (onConfirmarEnvio) {
      onConfirmarEnvio(arquivoComprovante, resultadoValidacao);
    }
  };

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
            disabled={cancelando || enviandoComprovante}
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
