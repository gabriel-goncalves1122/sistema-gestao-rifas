import { useMediaQuery, useTheme } from "@mui/material";

/**
 * Breakpoints suportados pelo detector responsivo do sistema.
 */
export type BreakpointLayout = "sm" | "md";

/**
 * Hook compartilhado de detecção responsiva baseado em um breakpoint do tema MUI.
 * Evita acoplamento cruzado entre features ao decidir entre visões Desktop e Mobile.
 *
 * @param {BreakpointLayout} [breakpoint="md"] - Breakpoint MUI adotado como limiar móvel.
 * @returns {{ isMobile: boolean; isDesktop: boolean }} Flags booleanas complementares de viewport.
 */
export function useResponsiveLayout(breakpoint: BreakpointLayout = "md") {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(breakpoint));

  return {
    isMobile,
    isDesktop: !isMobile,
  };
}
