// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/ErrorRifasState.tsx
// ============================================================================
import ReplayIcon from "@mui/icons-material/Replay";
import WifiOffOutlinedIcon from "@mui/icons-material/WifiOffOutlined";
import { Box, Button, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { painelAderidoStyles } from "../styles/painelAderidoStyles";

/**
 * Propriedades para exibição do estado de erro ao carregar dados do painel do aderido.
 */
export interface ErrorRifasStateProps {
  /** Callback acionado ao clicar no botão para retentar a requisição */
  onTentarNovamente: () => void;
  /** Indica se a retentativa de recarga está em andamento */
  carregando?: boolean;
}

/**
 * Componente de estado de erro com mensagem contextual e botão de nova tentativa.
 *
 * @param {ErrorRifasStateProps} props - Propriedades do componente.
 * @returns {JSX.Element} Caixa de feedback de erro.
 */
export function ErrorRifasState({
  onTentarNovamente,
  carregando = false,
}: ErrorRifasStateProps) {
  return (
    <Box sx={painelAderidoStyles.emptyState} data-testid="error-rifas-state">
      <WifiOffOutlinedIcon sx={{ fontSize: 44, color: "#C84F4F", mb: 1 }} />

      <Typography fontWeight={850} color="text.primary" variant="h6">
        Não foi possível carregar suas rifas
      </Typography>

      <Typography
        color="text.secondary"
        sx={{ mt: 0.75, maxWidth: 420, textAlign: "center" }}
      >
        Houve uma instabilidade ao sincronizar seus bilhetes. Verifique sua
        conexão com a internet e tente novamente.
      </Typography>

      <Button
        variant="contained"
        startIcon={<ReplayIcon />}
        onClick={onTentarNovamente}
        disabled={carregando}
        data-testid="botao-tentar-novamente-rifas"
        sx={{
          mt: 2.5,
          borderRadius: 2,
          fontWeight: 800,
          textTransform: "none",
          bgcolor: colors.verdeEscuro,
          "&:hover": {
            bgcolor: colors.pretoEsverdeado,
          },
        }}
      >
        {carregando ? "Tentando novamente..." : "Tentar novamente"}
      </Button>
    </Box>
  );
}
