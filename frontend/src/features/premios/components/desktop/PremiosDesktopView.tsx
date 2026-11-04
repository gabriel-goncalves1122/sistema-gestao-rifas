// ============================================================================
// ARQUIVO: frontend/src/features/premios/components/desktop/PremiosDesktopView.tsx
// ============================================================================
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { Box, Button, Typography, useMediaQuery } from "@mui/material";
import { motion } from "framer-motion";

import { components } from "@/shared/tokens/components";
import { typographyScale as typography } from "@/shared/tokens/typography";
import { layout } from "../../styles/layout";
import type { PremioData } from "../../types/premio";
import type { InfoSorteio } from "../../types/sorteio";
import { HeroBanner } from "../shared/HeroBanner";
import { PremioCard } from "../shared/PremioCard";
import { PremiosViewSkeleton } from "../shared/PremioSkeleton";
import { HeroPremioCard } from "./HeroPremioCard";

interface PremiosDesktopViewProps {
  carregando: boolean;
  premioHero: PremioData | undefined;
  premiosRest: PremioData[];
  infoSorteio: InfoSorteio;
  isAdmin: boolean;
  onEditarHeader: () => void;
  onAbrirModalPremio: (premio?: PremioData) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: "easeOut" },
  },
};

export const PremiosDesktopView = ({
  carregando,
  premioHero,
  premiosRest,
  infoSorteio,
  isAdmin,
  onEditarHeader,
  onAbrirModalPremio,
}: PremiosDesktopViewProps) => {
  const reduzirMovimento = useMediaQuery("(prefers-reduced-motion: reduce)");

  if (carregando) {
    return <PremiosViewSkeleton />;
  }

  return (
    <Box
      component={motion.div}
      variants={reduzirMovimento ? undefined : containerVariants}
      initial={reduzirMovimento ? undefined : "hidden"}
      animate="show"
      sx={layout.container}
    >
      <Box
        component={motion.div}
        variants={reduzirMovimento ? undefined : itemVariants}
      >
        <HeroBanner
          infoSorteio={infoSorteio}
          isAdmin={isAdmin}
          onEditClick={onEditarHeader}
        />
      </Box>

      <Box
        component={motion.div}
        variants={reduzirMovimento ? undefined : itemVariants}
        sx={layout.sectionHeader}
      >
        <Typography
          sx={{
            ...typography.secaoTitulo,
            fontWeight: 900,
            fontSize: "1.5rem",
          }}
        >
          Prêmios
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => onAbrirModalPremio()}
            sx={{
              ...components.botaoNovoPremio,
              borderRadius: 2,
              fontWeight: 800,
              boxShadow: "0 4px 14px rgba(6, 61, 49, 0.18)",
            }}
          >
            Novo Prêmio
          </Button>
        )}
      </Box>

      {premioHero && (
        <Box
          component={motion.div}
          variants={reduzirMovimento ? undefined : itemVariants}
          sx={{ mb: 3 }}
        >
          <HeroPremioCard
            premio={premioHero}
            isAdmin={isAdmin}
            onEditClick={onAbrirModalPremio}
          />
        </Box>
      )}

      {premiosRest.length > 0 && (
        <Box sx={layout.cardsGrid}>
          {premiosRest.map((premio) => (
            <Box
              key={premio.id}
              component={motion.div}
              variants={reduzirMovimento ? undefined : itemVariants}
            >
              <PremioCard
                premio={premio}
                isAdmin={isAdmin}
                onEditClick={onAbrirModalPremio}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};
