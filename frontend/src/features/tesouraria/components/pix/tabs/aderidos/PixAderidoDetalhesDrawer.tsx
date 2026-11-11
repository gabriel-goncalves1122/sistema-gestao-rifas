import { Box, Stack, SwipeableDrawer } from "@mui/material";

import { layout } from "../../../../styles/layout";
import { PixAderidoResumo } from "../../../../utils/pixAderidosUtils";
import { PixAderidoDrawerHeader } from "./PixAderidoDrawerHeader";
import { PixAderidoResumoCards } from "./PixAderidoResumoCards";
import { PixAderidoTransacoesLista } from "./PixAderidoTransacoesLista";

/**
 * Propriedades para renderização da gaveta inferior de detalhes do aderido.
 */
export interface PixAderidoDetalhesDrawerProps {
  /** Resumo do aderido selecionado ou `null` se fechado */
  aderido: PixAderidoResumo | null;
  /** Callback para fechamento da gaveta */
  onClose: () => void;
}

/**
 * Gaveta inferior interativa (BottomDrawer / BottomSheet) para exibição do histórico
 * e desempenho detalhado de um aderido na tesouraria Pix.
 *
 * Suporta fechamento nativo por toque via botão 'X' proeminente e gesto de arrastar para baixo (SwipeableDrawer).
 *
 * @param {PixAderidoDetalhesDrawerProps} props - Propriedades do componente.
 * @returns {JSX.Element} BottomDrawer responsivo e polido.
 */
export function PixAderidoDetalhesDrawer({
  aderido,
  onClose,
}: PixAderidoDetalhesDrawerProps) {
  return (
    <SwipeableDrawer
      anchor="bottom"
      open={Boolean(aderido)}
      onClose={onClose}
      onOpen={() => undefined}
      disableSwipeToOpen
      disableDiscovery
      swipeAreaWidth={48}
      ModalProps={{
        keepMounted: false,
      }}
      PaperProps={{
        sx: {
          ...layout.drawerPaper,
          maxWidth: { xs: "100%", sm: 580, md: 660 },
          mx: "auto",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          p: { xs: 2, sm: 2.75 },
          pb: "calc(env(safe-area-inset-bottom) + 20px)",
          boxShadow: "0 -10px 40px rgba(2, 27, 22, 0.16)",
          bgcolor: "#FFFFFF",
        },
      }}
    >
      {aderido && (
        <Stack spacing={2} sx={{ minHeight: 0 }}>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              pt: 0.25,
              pb: 0.75,
            }}
          >
            <Box sx={layout.drawerPullHandle} />
          </Box>

          <PixAderidoDrawerHeader aderido={aderido} onClose={onClose} />

          <PixAderidoResumoCards aderido={aderido} />

          <PixAderidoTransacoesLista aderido={aderido} />
        </Stack>
      )}
    </SwipeableDrawer>
  );
}
