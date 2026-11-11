// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/states/CheckoutPixPaymentControls.tsx
// ============================================================================
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import { Box, Button, Stack, Typography } from "@mui/material";

import type { CheckoutPixCobranca } from "../../../types/checkoutPix";
import { CheckoutPixCountdown } from "../CheckoutPixCountdown";
import { colors } from "@/shared/tokens/colors";

/**
 * Propriedades do exibidor visual de QR Code Pix.
 */
export interface CheckoutQrCodeDisplayProps {
  /** URL pública ou Data URI Base64 da imagem do QR Code gerado. */
  qrCodeSrc: string;
}

/**
 * Propriedades do bloco de código Pix Copia e Cola.
 */
export interface CheckoutPixCopiaEColaProps {
  /** Payload EMV do código Pix Copia e Cola, quando disponível. */
  codigo?: string;
}

/**
 * Propriedades dos controles de ação e contagem regressiva do checkout Pix.
 */
export interface CheckoutPixActionsProps {
  /** Dados da cobrança Pix ativa, incluindo o timestamp de expiração. */
  cobranca: CheckoutPixCobranca;
  /** Flag opcional mantida para compatibilidade de cancelamento em andamento. */
  cancelando?: boolean;
  /** Callback acionado ao clicar no botão de copiar o código Pix Copia e Cola. */
  onCopiarPix: () => void;
  /** Callback opcional acionado para cancelar a cobrança Pix. */
  onCancelarPix?: () => void;
  /** Callback opcional acionado automaticamente quando o cronômetro de expiração zera. */
  onExpirarPix?: () => void;
}

/**
 * Renderiza a imagem do QR Code Pix ou um fallback visual quando a imagem não estiver disponível.
 */
export function CheckoutQrCodeDisplay({ qrCodeSrc }: CheckoutQrCodeDisplayProps) {
  return (
    <Box
      sx={{
        display: "grid",
        placeItems: "center",
        minHeight: 164,
        borderRadius: 2,
        bgcolor: colors.fundoSuave,
        border: `1px solid ${colors.borda}`,
        overflow: "hidden",
      }}
    >
      {qrCodeSrc ? (
        <Box
          component="img"
          src={qrCodeSrc}
          alt="QR Code Pix"
          sx={{
            width: 152,
            height: 152,
            objectFit: "contain",
          }}
        />
      ) : (
        <Stack spacing={0.75} alignItems="center" sx={{ color: colors.verdeEscuro }}>
          <QrCode2Icon fontSize="large" />
          <Typography sx={{ fontWeight: 850, fontSize: "0.86rem" }}>
            QR Code indisponível
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

/**
 * Renderiza o container com o código EMV Pix Copia e Cola formatado para leitura e seleção.
 */
export function CheckoutPixCopiaECola({ codigo }: CheckoutPixCopiaEColaProps) {
  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        bgcolor: colors.fundoSuave,
        border: `1px dashed ${colors.bordaDestaque}`,
        wordBreak: "break-all",
      }}
    >
      <Typography
        sx={{
          fontWeight: 800,
          color: colors.verdeEscuro,
          fontSize: "0.82rem",
          lineHeight: 1.35,
        }}
      >
        {codigo}
      </Typography>
    </Box>
  );
}

/**
 * Renderiza o cronômetro de expiração e o botão para copiar o código Pix Copia e Cola.
 */
export function CheckoutPixActions({
  cobranca,
  onCopiarPix,
  onExpirarPix,
}: CheckoutPixActionsProps) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      alignItems={{ xs: "stretch", sm: "center" }}
      justifyContent="space-between"
    >
      <CheckoutPixCountdown expiraEm={cobranca.expiraEm} onExpire={onExpirarPix} />

      <Button
        type="button"
        variant="outlined"
        startIcon={<ContentCopyIcon />}
        onClick={onCopiarPix}
        sx={{
          borderRadius: 2,
          textTransform: "none",
          fontWeight: 900,
          color: colors.verdeEscuro,
          borderColor: colors.bordaDestaque,
          py: 1,
          "&:hover": {
            borderColor: colors.verdeEscuro,
            bgcolor: colors.verdeClaro,
          },
          "&:focus-visible": {
            outline: `4px solid ${colors.bordaDestaque}`,
            outlineOffset: "2px",
          },
        }}
      >
        Copiar Pix copia-e-cola
      </Button>
    </Stack>
  );
}
