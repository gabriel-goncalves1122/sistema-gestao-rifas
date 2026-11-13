import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { Chip, Stack, Typography } from "@mui/material";

import { ResumoAuditoriaCompras } from "../../../types/auditoriaCompras";
import { colors } from "@/shared/tokens/colors";

/**
 * Propriedades para renderização da barra compacta de resumo quantitativo da auditoria.
 */
export interface AuditoriaComprasResumoProps {
  /** Estrutura com quantidades consolidadas das compras filtradas */
  resumo: ResumoAuditoriaCompras;
}

/**
 * Barra compacta de resumo quantitativo das compras filtradas na auditoria (sem valores monetários),
 * exibindo total de compras e rifas encontradas e divisão por canal (Pix vs Comprovante).
 *
 * @param {AuditoriaComprasResumoProps} props - Propriedades contendo o resumo calculado.
 * @returns {JSX.Element} Faixa enxuta de resumo contextual.
 */
export function AuditoriaComprasResumo({
  resumo,
}: AuditoriaComprasResumoProps) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
      spacing={1}
      sx={{
        mb: 1.5,
        px: { xs: 0.5, sm: 0.25 },
      }}
    >
      <Typography
        sx={{
          color: colors.pretoEsverdeado,
          fontWeight: 900,
          fontSize: "0.98rem",
          lineHeight: 1.2,
        }}
      >
        Compras Auditadas
      </Typography>

      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Chip
          size="small"
          icon={
            <ReceiptLongOutlinedIcon
              sx={{ fontSize: "15px !important", color: `${colors.verdeEscuro} !important` }}
            />
          }
          label={`${resumo.totalCompras} compras`}
          sx={{
            height: 26,
            borderRadius: 1.75,
            fontSize: "0.75rem",
            fontWeight: 800,
            bgcolor: "rgba(11, 122, 97, 0.08)",
            color: colors.verdeEscuro,
          }}
        />
        <Chip
          size="small"
          icon={
            <ConfirmationNumberOutlinedIcon
              sx={{ fontSize: "15px !important", color: `${colors.cinzaTexto} !important` }}
            />
          }
          label={`${resumo.totalRifas} rifas`}
          sx={{
            height: 26,
            borderRadius: 1.75,
            fontSize: "0.75rem",
            fontWeight: 800,
            bgcolor: colors.fundoSuave,
            color: colors.pretoEsverdeado,
            border: "1px solid rgba(2, 27, 22, 0.08)",
          }}
        />
      </Stack>
    </Stack>
  );
}
