// ============================================================================
// ARQUIVO: frontend/src/features/premios/components/shared/PremioSkeleton.tsx
// ============================================================================
import { Box, Paper, Skeleton, Stack } from "@mui/material";

import { layout } from "../../styles/layout";

/**
 * Skeleton para um card individual de prêmio na vitrine.
 *
 * @returns {JSX.Element} Card placeholder com animação shimmer wave.
 */
export const PremioSkeleton = () => (
  <Box
    sx={{
      borderRadius: 2.5,
      border: "1.5px solid rgba(6, 61, 49, 0.10)",
      overflow: "hidden",
      bgcolor: "#FFFFFF",
      boxShadow: "0 6px 18px rgba(2, 27, 22, 0.04)",
    }}
  >
    <Skeleton variant="rectangular" height={200} animation="wave" />
    <Box sx={{ p: 2.5, textAlign: "center" }}>
      <Skeleton
        variant="rounded"
        width={70}
        height={22}
        sx={{ mx: "auto", mb: 1.5, borderRadius: 1.5 }}
        animation="wave"
      />
      <Skeleton
        variant="text"
        width="75%"
        height={30}
        sx={{ mx: "auto", mb: 1, borderRadius: 1 }}
        animation="wave"
      />
      <Skeleton
        variant="text"
        width="90%"
        height={16}
        sx={{ mx: "auto" }}
        animation="wave"
      />
      <Skeleton
        variant="text"
        width="60%"
        height={16}
        sx={{ mx: "auto" }}
        animation="wave"
      />
    </Box>
  </Box>
);

/**
 * Skeleton completo para a tela de Prêmios (Banner + Hero 1º Lugar + Grid de Cards).
 * Elimina qualquer salto visual de layout (Zero Cumulative Layout Shift - CLS).
 *
 * @returns {JSX.Element} Visualização em esqueleto completa da vitrine de prêmios.
 */
export const PremiosViewSkeleton = () => (
  <Box sx={layout.container}>
    {/* 1. Esqueleto do HeroBanner oficial */}
    <Paper
      elevation={0}
      sx={{
        p: { xs: 3, md: 5 },
        mb: { xs: 3.5, md: 5 },
        border: "1.5px solid rgba(6, 61, 49, 0.10)",
        borderRadius: { xs: 2.25, md: 3 },
        bgcolor: "#FFFFFF",
        textAlign: "center",
      }}
    >
      <Stack alignItems="center" spacing={1.5}>
        <Skeleton
          variant="circular"
          width={64}
          height={64}
          animation="wave"
        />
        <Skeleton
          variant="text"
          width="50%"
          height={38}
          animation="wave"
          sx={{ borderRadius: 1 }}
        />
        <Skeleton
          variant="text"
          width="35%"
          height={22}
          animation="wave"
          sx={{ borderRadius: 0.5 }}
        />
        <Skeleton
          variant="rounded"
          width={130}
          height={28}
          animation="wave"
          sx={{ borderRadius: 2 }}
        />
      </Stack>
    </Paper>

    {/* 2. Esqueleto do Section Header ("Prêmios") */}
    <Box sx={layout.sectionHeader}>
      <Skeleton
        variant="text"
        width={140}
        height={34}
        animation="wave"
        sx={{ borderRadius: 1 }}
      />
    </Box>

    {/* 3. Esqueleto do HeroPremioCard (1º Lugar) */}
    <Box
      sx={{
        mb: 3,
        border: "2px solid rgba(217, 119, 6, 0.18)",
        borderRadius: 2.75,
        overflow: "hidden",
        bgcolor: "#FFFFFF",
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} sx={{ minHeight: 250 }}>
        <Box sx={{ width: { xs: "100%", md: 300 }, height: { xs: 200, md: "auto" } }}>
          <Skeleton
            variant="rectangular"
            width="100%"
            height="100%"
            animation="wave"
          />
        </Box>
        <Box sx={{ p: 3, flex: 1 }}>
          <Stack spacing={1.5}>
            <Skeleton
              variant="rounded"
              width={90}
              height={24}
              animation="wave"
              sx={{ borderRadius: 1.5 }}
            />
            <Skeleton
              variant="text"
              width="60%"
              height={36}
              animation="wave"
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="text"
              width="85%"
              height={20}
              animation="wave"
            />
            <Skeleton
              variant="text"
              width="70%"
              height={20}
              animation="wave"
            />
          </Stack>
        </Box>
      </Stack>
    </Box>

    {/* 4. Grid de Skeletons dos demais prêmios */}
    <Box sx={layout.cardsGrid}>
      {[1, 2, 3].map((i) => (
        <PremioSkeleton key={i} />
      ))}
    </Box>
  </Box>
);
