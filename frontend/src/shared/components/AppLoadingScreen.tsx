import { Box, CircularProgress, Stack, Typography } from "@mui/material";

/**
 * Interface de propriedades do componente `AppLoadingScreen`.
 */
export interface AppLoadingScreenProps {
  /** Texto descritivo exibido abaixo do spinner de carregamento (padrão: "Carregando"). */
  label?: string;
}

/**
 * Componente Dumb de tela cheia para carregamento inicial ou bloqueio de transição da aplicação.
 * Exibe spinner centralizado em círculo sombreado e mensagem de status com suporte a `100dvh` mobile.
 *
 * @param {AppLoadingScreenProps} props - Propriedades da tela de carregamento.
 * @returns {JSX.Element}
 */
export function AppLoadingScreen({
  label = "Carregando",
}: AppLoadingScreenProps) {
  return (
    <Box
      data-testid="app-loading-screen"
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "background.default",
        px: 2,
        "@supports (height: 100dvh)": {
          minHeight: "100dvh",
        },
      }}
    >
      <Stack
        alignItems="center"
        spacing={1.75}
        sx={{
          color: "#063D31",
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: "#F6F8F7",
            border: "1px solid rgba(6, 61, 49, 0.10)",
            boxShadow:
              "0 18px 46px rgba(2, 27, 22, 0.10), 0 3px 10px rgba(6, 61, 49, 0.08)",
          }}
        >
          <CircularProgress
            size={34}
            thickness={4}
            sx={{
              color: "#063D31",
            }}
          />
        </Box>

        <Typography
          sx={{
            color: "#526760",
            fontSize: "0.88rem",
            fontWeight: 750,
            letterSpacing: 0,
          }}
        >
          {label}
        </Typography>
      </Stack>
    </Box>
  );
}
