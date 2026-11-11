import { Box, LinearProgress, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";

/**
 * Propriedades do indicador compartilhado de progresso da meta de vendas de um aderido.
 */
export interface RankingMetaProgressProps {
  /** Percentual de conclusão da meta de rifas (0 a 100+). */
  percentualMeta: number;
  /** Indica se a meta foi atingida pelo aderido. */
  bateuMeta: boolean;
  /** Variante de layout para tabela desktop ou card mobile. */
  variante?: "table" | "card";
}

/**
 * Renderiza o rótulo percentual, selo de meta atingida e barra LinearProgress
 * padronizados entre a tabela desktop e os cards mobile do ranking de desempenho.
 *
 * @param {RankingMetaProgressProps} props - Dados de progresso e variante visual.
 * @returns {JSX.Element} Bloco visual de progresso da meta.
 */
export function RankingMetaProgress({
  percentualMeta,
  bateuMeta,
  variante = "card",
}: RankingMetaProgressProps) {
  const ehTable = variante === "table";

  return (
    <Box sx={ehTable ? { minWidth: 130 } : undefined}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: ehTable ? 0.5 : 0.4,
        }}
      >
        <Typography
          sx={{
            fontSize: ehTable ? "0.75rem" : "0.72rem",
            fontWeight: ehTable ? 800 : 700,
            color:
              ehTable && bateuMeta ? colors.verdeForte : colors.cinzaTexto,
          }}
        >
          {ehTable ? `${percentualMeta}% da meta` : `Meta: ${percentualMeta}%`}
        </Typography>
        {bateuMeta && (
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: ehTable ? 900 : 800,
              color: colors.verdeForte,
            }}
          >
            {ehTable ? "✓ Atingida" : "✓ Meta Atingida"}
          </Typography>
        )}
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(percentualMeta, 100)}
        sx={{
          height: ehTable ? 6 : 5,
          borderRadius: ehTable ? 3 : 2.5,
          bgcolor: "rgba(2, 27, 22, 0.08)",
          "& .MuiLinearProgress-bar": {
            bgcolor: bateuMeta ? colors.verdeForte : colors.cinzaTexto,
            borderRadius: ehTable ? 3 : 2.5,
          },
        }}
      />
    </Box>
  );
}
