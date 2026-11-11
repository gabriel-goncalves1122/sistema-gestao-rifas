import { ReactNode } from "react";
import { Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";

/**
 * Propriedades do título padrão de seção em modais e formulários.
 */
export interface SectionTitleProps {
  /** Texto ou conteúdo do título da seção. */
  children: ReactNode;
  /** Cor opcional em CSS/token para o texto (padrão `colors.verdeEscuro`). */
  color?: string;
}

/**
 * Renderiza título tipográfico padronizado para dividir blocos internos em modais e formulários.
 *
 * @param {SectionTitleProps} props - Propriedades visuais do título.
 * @returns {JSX.Element} Elemento de cabeçalho de seção em negrito.
 */
export function SectionTitle({
  children,
  color = colors.verdeEscuro,
}: SectionTitleProps) {
  return (
    <Typography
      variant="subtitle2"
      fontWeight={900}
      sx={{ color, letterSpacing: "0.01em" }}
    >
      {children}
    </Typography>
  );
}
