// ============================================================================
// ARQUIVO: frontend/src/features/premios/components/desktop/HeroPremioCard.tsx
// ============================================================================
import EditIcon from "@mui/icons-material/Edit";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import { Box, Card, CardContent, CardMedia, IconButton, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { components } from "@/shared/tokens/components";
import { reduceMotionSx } from "@/shared/tokens/motion";
import { surfaces } from "@/shared/tokens/surfaces";
import { typographyScale as typography } from "@/shared/tokens/typography";
import type { PremioData } from "../../types/premio";

interface HeroPremioCardProps {
  premio: PremioData;
  isAdmin: boolean;
  onEditClick: (premio: PremioData) => void;
}

/**
 * Card destacado para o 1º Lugar (Prêmio Principal) em visualização Desktop.
 * Utiliza acabamento nobre com sutis reflexos dourados e botão de edição fixado com alto contraste.
 *
 * @param {HeroPremioCardProps} props - Propriedades do card hero.
 * @returns {JSX.Element} Card horizontal com ênfase visual de campeão.
 */
export const HeroPremioCard = ({ premio, isAdmin, onEditClick }: HeroPremioCardProps) => (
  <Card
    elevation={0}
    sx={{
      ...surfaces.premioCard,
      position: "relative",
      flexDirection: "row",
      border: "2px solid rgba(217, 119, 6, 0.26)",
      borderRadius: 2.75,
      boxShadow: "0 14px 34px rgba(217, 119, 6, 0.08), 0 2px 6px rgba(2, 27, 22, 0.04)",
      transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
      overflow: "hidden",
      ...reduceMotionSx,
      "&:hover": {
        transform: "translateY(-3px)",
        borderColor: "rgba(217, 119, 6, 0.45)",
        boxShadow: "0 22px 48px rgba(217, 119, 6, 0.16), 0 4px 12px rgba(6, 61, 49, 0.08)",
        "& .hero-premio-img": {
          transform: "scale(1.04)",
        },
      },
      "&:active": {
        transform: "scale(0.99)",
      },
    }}
  >
    {isAdmin && (
      <IconButton
        size="small"
        onClick={() => onEditClick(premio)}
        aria-label="Editar Prêmio"
        title="Editar Prêmio"
        sx={{
          ...components.iconeEditar,
          position: "absolute",
          top: 14,
          right: 14,
          zIndex: 10,
          bgcolor: "rgba(255, 255, 255, 0.95)",
          color: colors.verdeEscuro,
          border: "1.5px solid rgba(217, 119, 6, 0.35)",
          boxShadow: "0 4px 14px rgba(2, 27, 22, 0.14)",
          "&:hover": {
            bgcolor: "#FEF3C7",
            borderColor: "rgba(217, 119, 6, 0.60)",
            color: "#92400E",
            transform: "scale(1.08)",
          },
        }}
      >
        <EditIcon fontSize="small" />
      </IconButton>
    )}

    <Box
      sx={{
        position: "relative",
        width: 300,
        flexShrink: 0,
        overflow: "hidden",
        bgcolor: "#FFFFFF",
        borderRight: "1px solid rgba(217, 119, 6, 0.14)",
      }}
    >
      {premio.imagem_url ? (
        <CardMedia
          component="img"
          className="hero-premio-img"
          image={premio.imagem_url}
          alt={premio.titulo}
          sx={{
            height: 270,
            objectFit: "contain",
            p: 2,
            transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
      ) : (
        <Box
          sx={{
            height: 270,
            bgcolor: "rgba(254, 243, 199, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <WorkspacePremiumIcon sx={{ fontSize: 64, color: "#D97706" }} />
        </Box>
      )}
    </Box>

    <CardContent
      sx={{
        textAlign: "left",
        p: { xs: 2.5, md: 3.5 },
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
      }}
    >
      {/* Badge de Campeão / Ouro Nobre */}
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
          border: "1px solid rgba(217, 119, 6, 0.35)",
          px: 1.75,
          py: 0.6,
          borderRadius: 2,
          width: "fit-content",
          boxShadow: "0 2px 8px rgba(217, 119, 6, 0.10)",
        }}
      >
        <WorkspacePremiumIcon sx={{ fontSize: 18, color: "#92400E" }} />
        <Typography
          sx={{
            color: "#92400E",
            fontWeight: 900,
            fontSize: "0.82rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {premio.colocacao}
        </Typography>
      </Box>

      <Typography
        variant="h4"
        sx={{
          ...typography.cardTitulo,
          fontSize: { xs: "1.45rem", md: "1.75rem" },
          fontWeight: 900,
          color: colors.pretoEsverdeado,
        }}
      >
        {premio.titulo}
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          mt: "auto",
          lineHeight: 1.6,
          color: "#4B635B",
          fontSize: "0.95rem",
        }}
      >
        {premio.descricao}
      </Typography>
    </CardContent>
  </Card>
);
