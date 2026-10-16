import { Chip, Tooltip } from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { correcaoPendenteSxAuditoria } from "../../../utils/auditoriaComprasUtils";

/**
 * Propriedades do componente de sinalização de correção cadastral pendente.
 */
export interface AuditoriaCorrecaoChipProps {
  /** Se `true`, exibe a badge de correção pendente */
  pendente?: boolean;
  /** Tamanho do chip (padrão 'small') */
  size?: "small" | "medium";
}

/**
 * Componente dumb para sinalizar visualmente que uma transação de compra possui
 * pendência de correção cadastral solicitada ou em andamento.
 *
 * @param {AuditoriaCorrecaoChipProps} props - Propriedades do componente.
 * @returns {JSX.Element | null} Badge/Chip de aviso ou `null` se não houver pendência.
 */
export function AuditoriaCorrecaoChip({
  pendente,
  size = "small",
}: AuditoriaCorrecaoChipProps) {
  if (!pendente) return null;

  const sx = correcaoPendenteSxAuditoria();

  return (
    <Tooltip title="Esta compra possui solicitação de correção cadastral pendente">
      <Chip
        size={size}
        icon={
          <WarningAmberRoundedIcon
            sx={{ fontSize: "14px !important", color: "inherit !important" }}
          />
        }
        label="Correção pendente"
        sx={{
          ...sx,
          height: size === "small" ? 22 : 28,
          borderRadius: 1.5,
          fontSize: "0.72rem",
          "& .MuiChip-icon": {
            ml: 0.75,
            mr: -0.25,
          },
        }}
      />
    </Tooltip>
  );
}
