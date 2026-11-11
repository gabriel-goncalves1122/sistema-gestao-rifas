import {
  MinhasRifasViewContent,
  type MinhasRifasViewProps,
} from "../shared/MinhasRifasViewContent";

/**
 * Propriedades para renderização da visão Mobile do painel de rifas do aderido.
 */
export type MinhasRifasMobileViewProps = MinhasRifasViewProps;

/**
 * Wrapper mobile do painel de rifas do aderido, delegando a renderização
 * estruturada ao componente compartilhado `MinhasRifasViewContent`.
 *
 * @param {MinhasRifasMobileViewProps} props - Estado e callbacks do painel.
 * @returns {JSX.Element} Visão mobile renderizada.
 */
export function MinhasRifasMobileView(props: MinhasRifasMobileViewProps) {
  return <MinhasRifasViewContent {...props} />;
}
