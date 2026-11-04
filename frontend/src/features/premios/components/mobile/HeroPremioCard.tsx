// ============================================================================
// ARQUIVO: frontend/src/features/premios/components/mobile/HeroPremioCard.tsx
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
 * Card destacado para o 1º Lugar (Prêmio Principal) em visualização Mobile.
 * Utiliza acabamento de campeão com contorno dourado suave e botão de edição fixado.
 *
 * @param {HeroPremioCardProps} props - Propriedades do card hero.
 * @returns {JSX.Element} Card em coluna com destaque visual nobre.
 */
export const HeroPremioCard = ({ premio, isAdmin, onEditClick }: HeroPremioCardProps) => (
  <Card
    elevation={0}
    sx={{
      ...surfaces.premioCard,
      position: "relative",
      border: "2px solid rgba(217, 119, 6, 0.26)",
      borderRadius: 2.5,
      boxShadow: "0 12px 30px rgba(217, 119, 6, 0.10), 0 2px 6px rgba(2, 27, 22, 0.04)",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      overflow: "hidden",
      ...reduceMotionSx,
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 18px 40px rgba(217, 119, 6, 0.16)",
      },
      "&:active": {
        transform: "scale(0.98)",
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
          top: 12,
          right: 12,
          zIndex: 10,
          bgcolor: "rgba(255, 255, 255, 0.95)",
          color: colors.verdeEscuro,
          border: "1.5px solid rgba(217, 119, 6, 0.35)",
          boxShadow: "0 4px 12px rgba(2, 27, 22, 0.14)",
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
        width: "100%",
        maxWidth: 320,
        mx: "auto",
        overflow: "hidden",
        pt: 1,
      }}
    >
      {premio.imagem_url ? (
        <CardMedia
          component="img"
          image={premio.imagem_url}
          alt={premio.titulo}
          sx={{
            height: 210,
            objectFit: "contain",
            bgcolor: colors.branco,
            p: 1.5,
          }}
        />
      ) : (
        <Box
          sx={{
            height: 190,
            bgcolor: "rgba(254, 243, 199, 0.35)",
            borderRadius: 2,
            mx: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <WorkspacePremiumIcon sx={{ fontSize: 56, color: "#D97706" }} />
        </Box>
      )}
    </Box>

    <CardContent
      sx={{
        textAlign: "center",
        pt: 1.75,
        pb: 3,
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      {/* Badge de Campeão / Ouro Nobre */}
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          mx: "auto",
          background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
          border: "1px solid rgba(217, 119, 6, 0.35)",
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          boxShadow: "0 2px 6px rgba(217, 119, 6, 0.10)",
        }}
      >
        <WorkspacePremiumIcon sx={{ fontSize: 18, color: "#92400E" }} />
        <Typography
          sx={{
            color: "#92400E",
            fontWeight: 900,
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {premio.colocacao}
        </Typography>
      </Box>

      <Typography
        variant="h5"
        sx={{
          ...typography.cardTitulo,
          fontSize: "1.4rem",
          fontWeight: 900,
          color: colors.pretoEsverdeado,
        }}
      >
        {premio.titulo}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          mt: "auto",
          px: 1,
          lineHeight: 1.5,
          color: "#4B635B",
        }}
      >
        {premio.descricao}
      </Typography>
    </CardContent>
  </Card>
);
