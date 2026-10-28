import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

import type { CheckoutPixCobranca } from "../../types/checkoutPix";
import { CheckoutPixCountdown } from "./CheckoutPixCountdown";
import { colors } from "@/shared/tokens/colors";

export function CheckoutPixLoading() {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: colors.fundoSuave,
        color: colors.cinzaTexto,
      }}
    >
      <CircularProgress size={18} sx={{ color: colors.verdeEscuro }} />
      <Typography sx={{ fontWeight: 800, fontSize: "0.88rem" }}>
        Gerando pagamento via Pix...
      </Typography>
    </Stack>
  );
}

export function CheckoutPixError({ erro }: { erro: string }) {
  return (
    <Alert
      severity="warning"
      sx={{
        borderRadius: 2,
        bgcolor: colors.alertaSuave,
        color: colors.alertaTexto,
        "& .MuiAlert-icon": {
          color: colors.alertaTexto,
        },
      }}
    >
      {erro}
    </Alert>
  );
}

export function CheckoutPixEmpty() {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: colors.fundoSuave,
        border: `1px dashed ${colors.bordaDestaque}`,
        color: colors.cinzaTexto,
      }}
    >
      <Typography sx={{ fontSize: "0.88rem", lineHeight: 1.45 }}>
        O pagamento via Pix será gerado quando os dados forem confirmados.
      </Typography>
    </Box>
  );
}

export function CheckoutPixConfirmed() {
  return (
    <Stack
      spacing={1.5}
      alignItems="center"
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: colors.verdeClaro,
        border: `2px solid ${colors.verdeForteEscuro}`,
      }}
    >
      <CheckCircleIcon sx={{ fontSize: 48, color: colors.verdeForteEscuro }} />
      <Typography
        sx={{
          fontWeight: 950,
          color: colors.verdeForteEscuro,
          fontSize: "1.1rem",
          textAlign: "center",
        }}
      >
        Pagamento confirmado!
      </Typography>
      <Typography
        sx={{
          color: colors.cinzaTexto,
          fontSize: "0.88rem",
          textAlign: "center",
        }}
      >
        O pagamento via Pix foi confirmado. As rifas estão em análise pela
        tesouraria.
      </Typography>
    </Stack>
  );
}

export function CheckoutPixPollingNotice() {
  return (
    <Stack
      spacing={0.5}
      sx={{
        p: 1.25,
        borderRadius: 2,
        bgcolor: colors.alertaSuave,
        border: "1px solid rgba(203, 166, 77, 0.4)",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <CircularProgress size={16} sx={{ color: colors.dourado }} />
        <Typography
          sx={{
            fontWeight: 800,
            color: colors.alertaTexto,
            fontSize: "0.84rem",
          }}
        >
          Aguardando confirmação do pagamento...
        </Typography>
      </Stack>
      <Typography
        sx={{
          color: colors.cinzaTexto,
          fontSize: "0.76rem",
          lineHeight: 1.35,
        }}
      >
        Você pode fechar esta janela para enviar o código ao comprador no WhatsApp; o Pix continuará válido até expirar.
      </Typography>
    </Stack>
  );
}

export function CheckoutPixExpiredNotice() {
  return (
    <Alert
      severity="warning"
      sx={{
        borderRadius: 2,
        bgcolor: colors.alertaSuave,
        color: colors.alertaTexto,
        "& .MuiAlert-icon": { color: colors.alertaTexto },
      }}
    >
      O tempo de espera expirou. Verifique o status da cobrança no painel de
      rifas.
    </Alert>
  );
}

export function CheckoutPixCanceledNotice() {
  return (
    <Alert
      severity="error"
      sx={{
        borderRadius: 2,
        bgcolor: colors.erroSuave,
        color: colors.erroTexto,
        "& .MuiAlert-icon": { color: colors.erroTexto },
      }}
    >
      O pagamento foi cancelado ou recusado pelo banco. As rifas voltam a ficar
      disponíveis.
    </Alert>
  );
}

export function CheckoutQrCodeDisplay({ qrCodeSrc }: { qrCodeSrc: string }) {
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

export function CheckoutPixCopiaECola({ codigo }: { codigo?: string }) {
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

interface CheckoutPixActionsProps {
  cobranca: CheckoutPixCobranca;
  cancelando?: boolean;
  onCopiarPix: () => void;
  onCancelarPix?: () => void;
  onExpirarPix?: () => void;
}

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
