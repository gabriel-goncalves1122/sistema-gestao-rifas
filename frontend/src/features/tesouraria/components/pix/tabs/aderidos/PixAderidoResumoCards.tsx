import {
  Box,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { formatarMoeda } from "@/shared/utils/formatadores";

import { colors } from "@/shared/tokens/colors";
import { typographyScale as typography } from "@/shared/tokens/typography";
import { PixAderidoResumo } from "../../../../utils/pixAderidosUtils";

/**
 * Propriedades dos cartões de resumo financeiro e meta do aderido.
 */
export interface PixAderidoResumoCardsProps {
  /** Resumo consolidado do aderido selecionado. */
  aderido: PixAderidoResumo;
}

/**
 * Renderiza o par de cartões de resumo financeiro (total arrecadado + split Pix/Comprovante)
 * e progresso da meta de rifas vendidas na gaveta de detalhes do aderido.
 *
 * @param {PixAderidoResumoCardsProps} props - Dados consolidados do aderido.
 * @returns {JSX.Element} Grade responsiva com dois cartões de métricas.
 */
export function PixAderidoResumoCards({ aderido }: PixAderidoResumoCardsProps) {
  const temSplit =
    aderido.valorPix !== undefined || aderido.valorComprovante !== undefined;

  const metaRifas =
    aderido.meta ||
    ((aderido.rifasPagas || 0) + (aderido.rifasRestantes || 0) > 0
      ? (aderido.rifasPagas || 0) + (aderido.rifasRestantes || 0)
      : 120);

  const percentualMeta =
    aderido.percentualMeta !== undefined
      ? Math.round(aderido.percentualMeta)
      : Math.round(((aderido.rifasPagas || 0) / metaRifas) * 100);

  const percentualProgresso = Math.min(Math.max(percentualMeta, 0), 100);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 1.25,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          borderRadius: 3,
          background:
            "linear-gradient(135deg, rgba(11, 122, 97, 0.08) 0%, rgba(11, 122, 97, 0.02) 100%)",
          border: "1px solid rgba(11, 122, 97, 0.2)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography
            sx={{
              color: colors.verdeEscuro,
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Arrecadado
          </Typography>
          <Typography
            sx={{
              ...typography.valorMonetario,
              fontSize: { xs: "1.28rem", sm: "1.42rem" },
              color: colors.pretoEsverdeado,
              fontWeight: 950,
              mt: 0.25,
            }}
          >
            {formatarMoeda(aderido.totalArrecadado)}
          </Typography>
        </Box>

        {temSplit && (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ mt: 1 }}
            flexWrap="wrap"
            gap={0.5}
          >
            <Chip
              size="small"
              label={`Pix: ${formatarMoeda(aderido.valorPix || 0)}`}
              sx={{
                height: 20,
                fontSize: "0.68rem",
                fontWeight: 700,
                bgcolor: "rgba(11, 122, 97, 0.12)",
                color: colors.verdeForte,
              }}
            />
            <Chip
              size="small"
              label={`Comp: ${formatarMoeda(aderido.valorComprovante || 0)}`}
              sx={{
                height: 20,
                fontSize: "0.68rem",
                fontWeight: 700,
                bgcolor: "rgba(82, 103, 96, 0.12)",
                color: colors.cinzaTexto,
              }}
            />
          </Stack>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          borderRadius: 3,
          background:
            "linear-gradient(135deg, rgba(2, 27, 22, 0.04) 0%, rgba(2, 27, 22, 0.01) 100%)",
          border: "1px solid rgba(2, 27, 22, 0.08)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography
              sx={{
                color: colors.cinzaTexto,
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Rifas restantes
            </Typography>
            <Typography
              sx={{
                color: colors.verdeEscuro,
                fontSize: "0.75rem",
                fontWeight: 800,
              }}
            >
              {percentualMeta}% da meta
            </Typography>
          </Stack>

          <Typography
            sx={{
              color: colors.pretoEsverdeado,
              fontWeight: 950,
              fontSize: { xs: "1.28rem", sm: "1.42rem" },
              mt: 0.25,
            }}
          >
            {aderido.rifasRestantes}
          </Typography>
        </Box>

        <Box sx={{ mt: 1 }}>
          <LinearProgress
            variant="determinate"
            value={percentualProgresso}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: "rgba(11, 122, 97, 0.12)",
              "& .MuiLinearProgress-bar": {
                bgcolor: colors.verdeForte,
                borderRadius: 3,
              },
            }}
          />
          <Typography
            sx={{
              color: colors.cinzaTexto,
              fontSize: "0.72rem",
              fontWeight: 600,
              mt: 0.5,
            }}
          >
            {aderido.rifasPagas} rifa(s) vendida(s) de {metaRifas}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
