import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { Chip } from "@mui/material";

import { AnaliseOcrDTO } from "../../../../types/pixTransacoes";
import { obterConfigVisualAnaliseOcr } from "../../../../utils/pixAnaliseOcrUtils";

/**
 * Propriedades do chip compacto de status da análise OCR.
 */
export interface PixAnaliseOcrChipProps {
  /** Resultado estruturado da análise OCR devolvido pelo backend. */
  analiseOcr?: AnaliseOcrDTO | null;
  /** Indica se a transação possui comprovante anexado elegível para OCR. */
  temComprovante?: boolean;
}

/**
 * Chip compacto de veredicto e score OCR para listagens desktop e cards mobile.
 * Quando não há análise nem comprovante anexado, retorna `null` para manter a UI limpa.
 *
 * @param {PixAnaliseOcrChipProps} props - Propriedades do componente.
 * @returns {JSX.Element | null} Chip estilizado ou `null`.
 */
export function PixAnaliseOcrChip({
  analiseOcr,
  temComprovante = false,
}: PixAnaliseOcrChipProps) {
  if (!analiseOcr && !temComprovante) {
    return null;
  }

  const visual = obterConfigVisualAnaliseOcr(analiseOcr);

  return (
    <Chip
      size="small"
      data-testid="pix-analise-ocr-chip"
      icon={
        <AutoFixHighIcon
          sx={{
            fontSize: 13,
            color: `${visual.corTexto} !important`,
          }}
        />
      }
      label={visual.labelCurto}
      title={visual.labelCompleto}
      sx={{
        height: 22,
        bgcolor: visual.corFundo,
        color: visual.corTexto,
        border: `1px solid ${visual.corBorda}`,
        fontWeight: 800,
        fontSize: "0.7rem",
        "& .MuiChip-label": {
          px: 0.9,
        },
        "& .MuiChip-icon": {
          ml: 0.6,
          mr: -0.25,
        },
      }}
    />
  );
}
