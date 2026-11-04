// ============================================================================
// ARQUIVO: frontend/src/features/premios/components/shared/HeroBanner.tsx
// ============================================================================
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EditIcon from "@mui/icons-material/Edit";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import { Box, Chip, IconButton, Paper, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { reduceMotionSx } from "@/shared/tokens/motion";
import { surfaces } from "@/shared/tokens/surfaces";
import { typographyScale as typography } from "@/shared/tokens/typography";
import type { InfoSorteio } from "../../types/sorteio";
import { calcularDiasRestantes, formatarDataExtenso } from "../../utils/dateUtils";

interface HeroBannerProps {
  infoSorteio: InfoSorteio;
  isAdmin: boolean;
  onEditClick: () => void;
}

/**
 * Banner de destaque oficial do sorteio com contagem regressiva e data formatada.
 *
 * @param {HeroBannerProps} props - Propriedades do banner.
 * @returns {JSX.Element} Superfície visual com acabamento esmeralda nobre.
 */
export const HeroBanner = ({ infoSorteio, isAdmin, onEditClick }: HeroBannerProps) => {
  const diasRestantes = calcularDiasRestantes(infoSorteio.data);

  const countdownLabel = () => {
    if (diasRestantes === null) return null;
    if (diasRestantes < 0) return "Sorteio realizado";
    if (diasRestantes === 0) return "Sorteio hoje!";
    if (diasRestantes === 1) return "Falta 1 dia";
    return `Faltam ${diasRestantes} dias`;
  };

  const countdownColor = () => {
    if (diasRestantes === null || diasRestantes! < 0) return "default";
    if (diasRestantes! <= 7) return "error";
    if (diasRestantes! <= 30) return "warning";
    return "success";
  };

  return (
    <Paper
      elevation={0}
      sx={{
        ...surfaces.premioBanner,
        p: { xs: 3, md: 5 },
        mb: { xs: 3.5, md: 5 },
        background: "linear-gradient(180deg, #FFFFFF 0%, #F5FBF8 100%)",
        border: "1.5px solid rgba(6, 61, 49, 0.14)",
        borderRadius: { xs: 2.25, md: 3 },
        color: colors.pretoEsverdeado,
        position: "relative",
        boxShadow: "0 18px 40px rgba(2, 27, 22, 0.06), 0 2px 6px rgba(6, 61, 49, 0.04)",
        overflow: "hidden",
      }}
    >
      {/* Marca d'água decorativa com gradiente sutil */}
      <Box
        sx={{
          position: "absolute",
          top: -45,
          right: -45,
          opacity: 0.045,
          color: colors.verdeForte,
          pointerEvents: "none",
        }}
      >
        <WorkspacePremiumIcon sx={{ fontSize: 240 }} />
      </Box>

      {isAdmin && (
        <IconButton
          onClick={onEditClick}
          aria-label="Editar Cabeçalho"
          sx={{
            position: "absolute",
            top: 14,
            right: 16,
            zIndex: 2,
            bgcolor: "rgba(6, 61, 49, 0.06)",
            border: "1px solid rgba(6, 61, 49, 0.12)",
            color: colors.verdeEscuro,
            borderRadius: 2,
            p: 1,
            transition: "all 0.2s ease",
            "&:hover": {
              bgcolor: "rgba(6, 61, 49, 0.12)",
              borderColor: "rgba(6, 61, 49, 0.25)",
              transform: "scale(1.05)",
            },
            ...reduceMotionSx,
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      )}

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          gap: 1.5,
        }}
      >
        {/* Ícone com halo comemorativo */}
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            bgcolor: "rgba(6, 61, 49, 0.06)",
            border: "2px solid rgba(6, 61, 49, 0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 20px rgba(6, 61, 49, 0.08)",
            mb: 0.5,
          }}
        >
          <WorkspacePremiumIcon
            sx={{
              fontSize: 42,
              color: colors.verdeEscuro,
            }}
          />
        </Box>

        <Typography
          sx={{
            ...typography.bannerTitulo,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            color: colors.pretoEsverdeado,
            fontSize: { xs: "1.5rem", sm: "1.9rem", md: "2.1rem" },
          }}
        >
          {infoSorteio.titulo}
        </Typography>

        <Typography
          sx={{
            ...typography.bannerData,
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            fontWeight: 700,
            color: "#3B5349",
            fontSize: { xs: "0.92rem", sm: "1rem" },
          }}
        >
          <CalendarMonthIcon sx={{ fontSize: 20, color: colors.verdeForte }} />
          Sorteio oficial: {formatarDataExtenso(infoSorteio.data)}
        </Typography>

        {countdownLabel() && (
          <Chip
            label={countdownLabel()}
            color={countdownColor()}
            size="small"
            variant="filled"
            sx={{
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              fontSize: "0.74rem",
              height: 30,
              px: 1,
              borderRadius: 2,
              boxShadow: "0 4px 12px rgba(2, 27, 22, 0.08)",
            }}
          />
        )}

        {infoSorteio.descricao && (
          <Typography
            sx={{
              ...typography.bannerDescricao,
              maxWidth: 620,
              color: "#52675E",
              lineHeight: 1.6,
              fontSize: { xs: "0.9rem", sm: "0.96rem" },
            }}
          >
            {infoSorteio.descricao}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
