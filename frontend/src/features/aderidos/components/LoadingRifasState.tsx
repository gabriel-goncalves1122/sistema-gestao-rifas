// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/LoadingRifasState.tsx
// ============================================================================
import { Box, LinearProgress, Paper, Skeleton, Stack, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { painelAderidoStyles } from "../styles/painelAderidoStyles";

/**
 * Estado de carregamento fluido com esqueleto visual (shimmer) e indicador linear de progresso.
 * Replica a anatomia geométrica do painel de Aderidos para evitar qualquer salto de layout (layout shift)
 * e garantir uma transição orgânica para a tela carregada.
 *
 * @returns {JSX.Element} Visualização em Skeleton animada com onda (shimmer wave).
 */
export function LoadingRifasState() {
  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2.5, sm: 3 },
      }}
    >
      {/* Barra de progresso linear e sutil para leitores de tela e asserções de acessibilidade */}
      <Box sx={{ width: "100%" }}>
        <LinearProgress
          role="progressbar"
          aria-label="Carregando suas rifas..."
          sx={{
            height: 3,
            borderRadius: 1.5,
            bgcolor: "rgba(6, 61, 49, 0.08)",
            "& .MuiLinearProgress-bar": {
              bgcolor: colors.verdeEscuro,
            },
          }}
        />
        <Typography
          variant="caption"
          sx={{
            mt: 0.75,
            display: "inline-block",
            color: "text.secondary",
            fontWeight: 600,
            fontSize: "0.8rem",
          }}
        >
          Carregando suas rifas...
        </Typography>
      </Box>

      {/* 1. Header esqueleto: Saudação e Ações */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={2}
      >
        <Box sx={{ width: { xs: "60%", sm: 260 } }}>
          <Skeleton
            variant="text"
            animation="wave"
            width="85%"
            height={34}
            sx={{ borderRadius: 1 }}
          />
          <Skeleton
            variant="text"
            animation="wave"
            width="60%"
            height={20}
            sx={{ borderRadius: 0.5 }}
          />
        </Box>
        <Skeleton
          variant="rounded"
          animation="wave"
          width={40}
          height={40}
          sx={{ borderRadius: 2 }}
        />
      </Stack>

      {/* 2. Resumo Superior esqueleto (2 cards) */}
      <Paper elevation={0} sx={painelAderidoStyles.resumoCompactoCard}>
        <Box sx={{ flex: 1, p: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={1}>
            <Skeleton
              variant="text"
              animation="wave"
              width="45%"
              height={18}
            />
            <Skeleton
              variant="text"
              animation="wave"
              width="70%"
              height={36}
            />
            <Skeleton
              variant="rounded"
              animation="wave"
              width="100%"
              height={6}
              sx={{ borderRadius: 1 }}
            />
          </Stack>
        </Box>
        <Box sx={painelAderidoStyles.resumoDivisor} />
        <Box sx={{ flex: 1, p: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={1}>
            <Skeleton
              variant="text"
              animation="wave"
              width="50%"
              height={18}
            />
            <Skeleton
              variant="text"
              animation="wave"
              width="65%"
              height={36}
            />
            <Skeleton
              variant="text"
              animation="wave"
              width="80%"
              height={16}
            />
          </Stack>
        </Box>
      </Paper>

      {/* 3. Filtros e Campo de busca esqueleto */}
      <Stack spacing={1.5}>
        <Skeleton
          variant="rounded"
          animation="wave"
          height={42}
          sx={{ borderRadius: 2.5 }}
        />
        <Stack direction="row" spacing={1} sx={{ overflowX: "hidden" }}>
          {[80, 100, 95, 75, 85].map((w, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              animation="wave"
              width={w}
              height={34}
              sx={{ borderRadius: 2, flexShrink: 0 }}
            />
          ))}
        </Stack>
      </Stack>

      {/* 4. Grade de rifas esqueleto (30 itens com proporção exata) */}
      <Box sx={painelAderidoStyles.gridRifas}>
        {Array.from({ length: 30 }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rounded"
            animation="wave"
            sx={{
              ...painelAderidoStyles.rifaButton,
              border: "1px solid rgba(6, 61, 49, 0.08)",
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
