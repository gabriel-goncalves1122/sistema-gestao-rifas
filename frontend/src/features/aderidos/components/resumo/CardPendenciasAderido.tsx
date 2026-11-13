// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/resumo/CardPendenciasAderido.tsx
// ============================================================================
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";

import { painelAderidoStyles } from "../../styles/painelAderidoStyles";

interface CardPendenciasAderidoProps {
  totalPendencias: number;
  onAbrirRecusadas: () => void;
}

export function CardPendenciasAderido({
  totalPendencias,
  onAbrirRecusadas,
}: CardPendenciasAderidoProps) {
  const possuiPendencias = totalPendencias > 0;

  if (!possuiPendencias) {
    return (
      <Box sx={painelAderidoStyles.pendenciaOk}>
        <TaskAltIcon fontSize="small" />
        <Typography sx={painelAderidoStyles.pendenciaOkTexto}>
          Sem pendências
        </Typography>
      </Box>
    );
  }

  return (
    <Button
      type="button"
      variant="text"
      onClick={onAbrirRecusadas}
      endIcon={<ArrowForwardIcon fontSize="small" />}
      sx={painelAderidoStyles.pendenciaAcao}
    >
      <Stack direction="row" alignItems="center" gap={1.2} sx={{ minWidth: 0 }}>
        <Box sx={painelAderidoStyles.pendenciaAcaoIcone}>
          <ErrorOutlineIcon fontSize="small" />
        </Box>

        <Box sx={{ minWidth: 0, textAlign: "left" }}>
          <Typography sx={painelAderidoStyles.pendenciaAcaoTitulo}>
            Vendas recusadas
          </Typography>
          <Typography sx={painelAderidoStyles.pendenciaAcaoSubtitulo}>
            Corrigir dados
          </Typography>
        </Box>

        <Chip
          size="small"
          label={totalPendencias}
          sx={painelAderidoStyles.pendenciaAcaoContador}
        />
      </Stack>
    </Button>
  );
}
