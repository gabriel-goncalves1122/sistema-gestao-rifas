import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import { Box, Paper, Stack, Typography } from "@mui/material";

import { PixAderidoResumo } from "../../../../utils/pixAderidosUtils";
import { formatarMoedaPix } from "../../../../utils/pixTransacoesUtils";
import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { typographyScale as typography } from "@/shared/tokens/typography";

/**
 * Propriedades para renderização do card individual de resumo de aderido.
 */
export interface PixAderidoResumoCardProps {
  /** Objeto de domínio consolidado do aderido com arrecadação e rifas */
  aderido: PixAderidoResumo;
  /** Callback acionado ao tocar/clicar no cartão para abrir a gaveta de detalhes */
  onSelecionar: (aderido: PixAderidoResumo) => void;
}

/**
 * Cartão de apresentação resumida do desempenho do aderido (vendedor),
 * destacando valor total arrecadado, divisão Pix vs Comprovante e progresso em relação à meta de rifas.
 *
 * @param {PixAderidoResumoCardProps} props - Propriedades do componente.
 * @returns {JSX.Element} Botão acessível estilizado como Paper.
 */
export function PixAderidoResumoCard({
  aderido,
  onSelecionar,
}: PixAderidoResumoCardProps) {
  const temSplit =
    aderido.valorPix !== undefined || aderido.valorComprovante !== undefined;

  return (
    <Paper
      component="button"
      type="button"
      elevation={0}
      aria-label={`Abrir detalhes de arrecadação de ${aderido.nome}`}
      onClick={() => onSelecionar(aderido)}
      sx={{
        ...surfaces.paper,
        width: "100%",
        p: { xs: 1.5, sm: 2 },
        boxShadow: "0 10px 24px rgba(2, 27, 22, 0.06)",
        textAlign: "left",
        cursor: "pointer",
        font: "inherit",
        color: "inherit",
        transition:
          "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
        "&:hover": {
          borderColor: "rgba(6, 61, 49, 0.28)",
          bgcolor: colors.fundoSuave,
          boxShadow: "0 16px 34px rgba(2, 27, 22, 0.12)",
          transform: "translateY(-2px)",
          "& .pix-aderido-seta": {
            opacity: 1,
            transform: "translateX(2px)",
          },
        },
        "&:focus-visible": {
          outline: `2px solid ${colors.verdeEscuro}`,
          outlineOffset: 2,
        },
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                ...typography.bodyDestaque,
                fontWeight: 900,
                fontSize: "1rem",
                overflowWrap: "anywhere",
              }}
            >
              {aderido.nome}
            </Typography>

            <Typography sx={{ ...typography.bodyPequeno, mt: 0.25 }}>
              {aderido.cpfLabel}
            </Typography>
          </Box>

          <Box
            className="pix-aderido-seta"
            sx={{
              ...surfaces.fundoVerdeClaro,
              width: 34,
              height: 34,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              opacity: 0.78,
              transition: "opacity 160ms ease, transform 160ms ease",
            }}
          >
            <ArrowRightIcon />
          </Box>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 1,
          }}
        >
          <Box>
            <Typography
              sx={{
                ...typography.label,
                fontSize: "0.7rem",
              }}
            >
              Arrecadado
            </Typography>
            <Typography
              sx={{
                ...typography.valorMonetario,
                fontSize: "1.12rem",
                mt: 0.35,
              }}
            >
              {formatarMoedaPix(aderido.totalArrecadado)}
            </Typography>
            {temSplit && (
              <Typography
                sx={{
                  color: colors.cinzaTexto,
                  fontSize: "0.7rem",
                  mt: 0.25,
                  fontStyle: "italic",
                }}
              >
                Pix: {formatarMoedaPix(aderido.valorPix || 0)} • Comp: {formatarMoedaPix(aderido.valorComprovante || 0)}
              </Typography>
            )}
          </Box>

          <Box>
            <Typography
              sx={{
                ...typography.label,
                fontSize: "0.7rem",
              }}
            >
              Restantes
            </Typography>
            <Typography
              sx={{
                color: colors.pretoEsverdeado,
                fontWeight: 950,
                fontSize: "1.12rem",
                mt: 0.35,
              }}
            >
              {aderido.rifasRestantes} rifas
            </Typography>
            <Typography
              sx={{
                color: colors.cinzaTexto,
                fontSize: "0.7rem",
                mt: 0.25,
              }}
            >
              {aderido.rifasPagas} vendida(s)
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}
