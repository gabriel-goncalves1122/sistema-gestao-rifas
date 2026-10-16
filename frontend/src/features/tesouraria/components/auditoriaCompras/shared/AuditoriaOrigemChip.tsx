import { Chip } from "@mui/material";
import PixIcon from "@mui/icons-material/Pix";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import {
  origemLabelAuditoria,
  origemSxAuditoria,
} from "../../../utils/auditoriaComprasUtils";

/**
 * Propriedades para renderização do chip identificador do canal de origem da compra.
 */
export interface AuditoriaOrigemChipProps {
  /** Canal de origem da transação ('PIX' ou 'COMPROVANTE') */
  origem?: string;
  /** Tamanho do chip (padrão 'small') */
  size?: "small" | "medium";
}

/**
 * Componente dumb para exibição do canal de origem (Pix automatizado ou Comprovante manual)
 * na auditoria de compras da tesouraria.
 *
 * @param {AuditoriaOrigemChipProps} props - Propriedades do componente.
 * @returns {JSX.Element} Chip estilizado conforme a origem do pagamento.
 */
export function AuditoriaOrigemChip({
  origem,
  size = "small",
}: AuditoriaOrigemChipProps) {
  const isPix = String(origem || "").toUpperCase() === "PIX";
  const label = origemLabelAuditoria(origem);
  const sx = origemSxAuditoria(origem);

  return (
    <Chip
      size={size}
      icon={
        isPix ? (
          <PixIcon sx={{ fontSize: "14px !important", color: "inherit !important" }} />
        ) : (
          <ReceiptLongIcon sx={{ fontSize: "14px !important", color: "inherit !important" }} />
        )
      }
      label={label}
      sx={{
        ...sx,
        height: size === "small" ? 22 : 28,
        borderRadius: 1.5,
        fontSize: "0.74rem",
        "& .MuiChip-icon": {
          ml: 0.75,
          mr: -0.25,
        },
      }}
    />
  );
}
