import { useResponsiveLayout } from "@/shared/hooks/useResponsiveLayout";

/**
 * Hook de detecção responsiva da área de Tesouraria.
 * Delega para `useResponsiveLayout` mantendo compatibilidade com consumidores/testes locais.
 *
 * @returns {{ isMobile: boolean; isDesktop: boolean }} Flags booleanas complementares de viewport.
 */
export function useTesourariaLayout() {
  return useResponsiveLayout();
}
