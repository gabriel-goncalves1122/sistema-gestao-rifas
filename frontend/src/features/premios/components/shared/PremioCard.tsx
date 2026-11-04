// ============================================================================
// ARQUIVO: frontend/src/features/premios/components/shared/PremioCard.tsx
// ============================================================================
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import EditIcon from "@mui/icons-material/Edit";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import { Box, Card, CardContent, CardMedia, IconButton, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { components } from "@/shared/tokens/components";
import { reduceMotionSx } from "@/shared/tokens/motion";
import { surfaces } from "@/shared/tokens/surfaces";
import { typographyScale as typography } from "@/shared/tokens/typography";
import type { PremioData } from "../../types/premio";

interface PremioCardProps {
  premio: PremioData;
  isAdmin: boolean;
  onEditClick: (premio: PremioData) => void;
}

/**
 * Retorna o esquema de cores semântico para a badge de colocação (Prata, Bronze, Esmeralda).
 */
function obterEstiloColocacao(colocacao?: string) {
  const c = (colocacao || "").trim().toLowerCase();

  if (c.startsWith("2")) {
    return {
      color: "#1E293B",
      bgcolor: "#F1F5F9",
      borderColor: "#CBD5E1",
      iconColor: "#64748B",
    };
  }

  if (c.startsWith("3")) {
    return {
      color: "#92400E",
      bgcolor: "#FEF3C7",
      borderColor: "#FDE68A",
      iconColor: "#D97706",
    };
  }

  if (c.startsWith("1")) {
    return {
      color: "#92400E",
      bgcolor: "#FEF3C7",
      borderColor: "#FDE68A",
      iconColor: "#D97706",
    };
  }

  // 4º Lugar em diante: Verde Esmeralda suave
  return {
    color: "#064532",
    bgcolor: "#EAF7F1",
    borderColor: "#A7F3D0",
    iconColor: colors.verdeForte,
  };
}

/**
 * Card para exibição de prêmio na vitrine de sorteio.
 *
 * @param {PremioCardProps} props - Propriedades do card de prêmio.
 * @returns {JSX.Element} Card vertical com badge cromática de pódio, mídia e botão de editar fixado.
 */
export const PremioCard = ({ premio, isAdmin, onEditClick }: PremioCardProps) => {
  const estiloBadge = obterEstiloColocacao(premio.colocacao);

  return (
    <Card
      elevation={0}
      sx={{
        ...surfaces.premioCard,
        position: "relative",
        border: "1.5px solid rgba(6, 61, 49, 0.12)",
        borderRadius: 2.5,
        boxShadow: "0 8px 24px rgba(2, 27, 22, 0.05)",
        transition: "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
        overflow: "hidden",
        ...reduceMotionSx,
        "&:hover": {
          transform: "translateY(-3px)",
          borderColor: "rgba(6, 61, 49, 0.28)",
          boxShadow: "0 16px 36px rgba(2, 27, 22, 0.10)",
          "& .premio-card-img": {
            transform: "scale(1.04)",
          },
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
            border: "1.5px solid rgba(6, 61, 49, 0.16)",
            boxShadow: "0 4px 12px rgba(2, 27, 22, 0.14)",
            "&:hover": {
              bgcolor: colors.verdeClaro,
              borderColor: "rgba(6, 61, 49, 0.32)",
              color: colors.verdeForte,
              transform: "scale(1.08)",
            },
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      )}

      <Box
        sx={{
          height: 200,
          overflow: "hidden",
          bgcolor: "#FFFFFF",
          borderBottom: "1px solid rgba(6, 61, 49, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {premio.imagem_url ? (
          <CardMedia
            component="img"
            className="premio-card-img"
            image={premio.imagem_url}
            alt={premio.titulo}
            sx={{
              height: "100%",
              objectFit: "contain",
              p: 2,
              transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              bgcolor: colors.fundoSuave,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CardGiftcardIcon sx={{ fontSize: 52, color: colors.cinzaIcone }} />
          </Box>
        )}
      </Box>

      <CardContent
        sx={{
          textAlign: "center",
          pt: 2.25,
          pb: 3,
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
        }}
      >
        {/* Badge de Pódio comemorativa */}
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            mx: "auto",
            bgcolor: estiloBadge.bgcolor,
            border: `1px solid ${estiloBadge.borderColor}`,
            px: 1.25,
            py: 0.35,
            borderRadius: 1.75,
            boxShadow: "0 1px 4px rgba(2, 27, 22, 0.05)",
          }}
        >
          <EmojiEventsOutlinedIcon sx={{ fontSize: 16, color: estiloBadge.iconColor }} />
          <Typography
            sx={{
              color: estiloBadge.color,
              fontWeight: 900,
              fontSize: "0.76rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {premio.colocacao}
          </Typography>
        </Box>

        <Typography
          variant="h5"
          sx={{
            ...typography.cardTitulo,
            fontSize: "1.22rem",
            fontWeight: 800,
            color: colors.pretoEsverdeado,
            lineHeight: 1.3,
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
            fontSize: "0.88rem",
          }}
        >
          {premio.descricao}
        </Typography>
      </CardContent>
    </Card>
  );
};
