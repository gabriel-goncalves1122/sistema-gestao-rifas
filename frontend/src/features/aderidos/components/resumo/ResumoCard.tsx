import { Box, Stack, Typography } from "@mui/material";
import { ReactNode } from "react";
import { colors } from "@/shared/tokens/colors";

import { painelAderidoStyles } from "../../styles/painelAderidoStyles";

/**
 * Propriedades para renderização do card de métrica/resumo do painel de aderidos.
 */
interface ResumoCardProps {
  /** Ícone indicador no topo do card */
  icon: ReactNode;
  /** Rótulo textual superior */
  label: string;
  /** Valor numérico ou monetário em destaque */
  valor: ReactNode;
  /** Descrição explicativa do indicador */
  descricao: string;
  /** Elemento ou botão de ação opcional posicionado no rodapé do card */
  acao?: ReactNode;
  /** Elemento ou botão de ação opcional posicionado no canto superior direito */
  acaoTopo?: ReactNode;
  /** Variante cromática visual do ícone e valores */
  variant?: "default" | "alert" | "success";
}

function obterIconStyle(variant: ResumoCardProps["variant"]) {
  if (variant === "alert") return painelAderidoStyles.resumoIconBoxAlerta;
  if (variant === "success") return painelAderidoStyles.resumoIconBoxOk;

  return {};
}

export function ResumoCard({
  icon,
  label,
  valor,
  descricao,
  acao,
  acaoTopo,
  variant = "default",
}: ResumoCardProps) {
  return (
    <Box sx={painelAderidoStyles.resumoCompactoItem}>
      <Stack sx={painelAderidoStyles.resumoMetaLinha}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <Box
            sx={{
              ...painelAderidoStyles.resumoIconBox,
              ...obterIconStyle(variant),
            }}
          >
            {icon}
          </Box>

          <Typography sx={painelAderidoStyles.resumoCardLabel}>
            {label}
          </Typography>
        </Stack>

        {acaoTopo}
      </Stack>

      <Box sx={painelAderidoStyles.resumoConteudoLinha}>
        <Typography
          sx={{
            ...painelAderidoStyles.resumoCardValor,
            ...(variant === "alert" ? { color: colors.alertaTextoForte } : {}),
          }}
        >
          {valor}
        </Typography>

        <Typography sx={painelAderidoStyles.resumoCardDescricao}>
          {descricao}
        </Typography>

        {acao}
      </Box>
    </Box>
  );
}
