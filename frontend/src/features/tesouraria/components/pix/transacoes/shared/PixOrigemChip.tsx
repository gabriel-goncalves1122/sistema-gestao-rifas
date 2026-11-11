import PixIcon from "@mui/icons-material/Pix";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { Chip, SxProps, Theme } from "@mui/material";

export interface PixOrigemChipProps {
  /** Canal ou meio de origem da transação */
  origem?: "PIX" | "COMPROVANTE";
  /** Sobrescrita opcional de estilos SX */
  sx?: SxProps<Theme>;
}

/**
 * Chip indicador visual de canal de origem da transação na Tesouraria.
 * Distingue transações liquidadas via Gateway Pix daquelas submetidas via Comprovante manual.
 */
export function PixOrigemChip({ origem = "PIX", sx }: PixOrigemChipProps) {
  const ehPix = origem === "PIX";

  return (
    <Chip
      size="small"
      icon={
        ehPix ? (
          <PixIcon sx={{ fontSize: "14px !important", color: "inherit !important" }} />
        ) : (
          <ReceiptLongIcon sx={{ fontSize: "14px !important", color: "inherit !important" }} />
        )
      }
      label={ehPix ? "Pix" : "Comprovante"}
      sx={{
        height: 24,
        fontSize: "0.74rem",
        fontWeight: 800,
        letterSpacing: "0.02em",
        borderRadius: "6px",
        bgcolor: ehPix ? "#E6F4EA" : "#E8F0FE",
        color: ehPix ? "#137333" : "#1A73E8",
        border: `1px solid ${ehPix ? "#CEEAD6" : "#D2E3FC"}`,
        px: 0.25,
        "& .MuiChip-label": {
          px: 0.75,
        },
        ...sx,
      }}
    />
  );
}
