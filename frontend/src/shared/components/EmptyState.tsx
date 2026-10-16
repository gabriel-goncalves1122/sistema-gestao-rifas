import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";

/**
 * Interface de propriedades do componente Dumb `EmptyState`.
 */
export interface EmptyStateProps {
  /** Ícone ilustrativo a ser exibido no centro do estado vazio. */
  icon: ReactNode;
  /** Título principal contextualizando a ausência de dados (ex: "Nenhum documento encontrado"). */
  title: string;
  /** Descrição complementar ou instrução orientando o usuário sobre como proceder. */
  description?: string;
  /** Elemento opcional de ação (ex: botão para cadastrar ou limpar filtros). */
  action?: ReactNode;
}

/**
 * Componente Dumb de apresentação visual para estados vazios (empty state), sem dados ou resultados de busca.
 * Exibe ícone estilizado, título, descrição e botão/ação opcional em layout centralizado com borda tracejada.
 *
 * @param {EmptyStateProps} props - Propriedades do estado vazio.
 * @returns {JSX.Element}
 */
export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <Box
    sx={{
      minHeight: 260,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      px: 2,
      py: 4,
      borderRadius: 2,
      border: "1px dashed rgba(6, 61, 49, 0.18)",
      bgcolor: "rgba(255, 255, 255, 0.72)",
    }}
  >
    <Box sx={{ fontSize: 56, color: "text.disabled", mb: 1.5 }}>
      {icon}
    </Box>
    <Typography color="text.secondary" variant="h6">
      {title}
    </Typography>
    {description && (
      <Typography color="text.disabled" variant="body2" sx={{ mt: 0.5 }}>
        {description}
      </Typography>
    )}
    {action && <Box sx={{ mt: 2 }}>{action}</Box>}
  </Box>
);
