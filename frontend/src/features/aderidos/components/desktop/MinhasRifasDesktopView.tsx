import {
  MinhasRifasViewContent,
  type MinhasRifasViewProps,
} from "../shared/MinhasRifasViewContent";

/**
 * Propriedades para renderização da visão Desktop do painel de rifas do aderido.
 */
export type MinhasRifasDesktopViewProps = MinhasRifasViewProps;

/**
 * Wrapper desktop do painel de rifas do aderido, delegando a renderização
 * estruturada ao componente compartilhado `MinhasRifasViewContent`.
 *
 * @param {MinhasRifasDesktopViewProps} props - Estado e callbacks do painel.
 * @returns {JSX.Element} Visão desktop renderizada.
 */
export function MinhasRifasDesktopView(props: MinhasRifasDesktopViewProps) {
  return <MinhasRifasViewContent {...props} />;
}
