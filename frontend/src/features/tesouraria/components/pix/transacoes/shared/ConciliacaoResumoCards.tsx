import { Grid, Paper, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { formatarMoeda } from "@/shared/utils/formatadores";
import type { ResultadoAnaliseExtrato } from "../../../../types/conciliacaoExtrato";

/**
 * Propriedades do painel de cartões de resumo da análise de conciliação.
 */
export interface ConciliacaoResumoCardsProps {
  /** Totais consolidados retornados pela análise do extrato. */
  resumo: ResultadoAnaliseExtrato["resumo"];
  /** Quantidade total de correspondências identificadas no arquivo. */
  totalMatches: number;
  /** Quantidade de correspondências atualmente marcadas para aprovação. */
  quantidadeSelecionados: number;
  /** Soma financeira das correspondências atualmente selecionadas. */
  valorTotalSelecionado: number;
}

/**
 * Exibe os três indicadores de resumo após a análise do extrato bancário:
 * matches exatos por TXID, matches sugeridos e total selecionado para baixa.
 *
 * @param {ConciliacaoResumoCardsProps} props - Totais de análise e seleção atual.
 * @returns {JSX.Element} Grade responsiva com três cartões de resumo.
 */
export function ConciliacaoResumoCards({
  resumo,
  totalMatches,
  quantidadeSelecionados,
  valorTotalSelecionado,
}: ConciliacaoResumoCardsProps) {
  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            border: `1px solid ${colors.borda}`,
            borderRadius: 2,
            bgcolor: colors.verdeClaro,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: colors.verdeForte, fontWeight: 700 }}
          >
            MATCHES EXATOS (TXID)
          </Typography>
          <Typography
            variant="h5"
            sx={{ fontWeight: 900, color: colors.verdeEscuro }}
          >
            {resumo.totalMatchesExatos}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.cinzaTexto }}>
            Identificação 100% garantida
          </Typography>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            border: `1px solid ${colors.borda}`,
            borderRadius: 2,
            bgcolor: colors.alertaSuave,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: colors.alertaTexto, fontWeight: 700 }}
          >
            MATCHES SUGERIDOS
          </Typography>
          <Typography
            variant="h5"
            sx={{ fontWeight: 900, color: colors.alertaTextoForte }}
          >
            {resumo.totalMatchesAproximados}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.cinzaTexto }}>
            Comprador ou Aderido similar
          </Typography>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            border: `1px solid ${colors.borda}`,
            borderRadius: 2,
            bgcolor: colors.fundoSuave,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: colors.cinzaTexto, fontWeight: 700 }}
          >
            TOTAL SELECIONADO
          </Typography>
          <Typography
            variant="h5"
            sx={{ fontWeight: 900, color: colors.verdeForte }}
          >
            {formatarMoeda(valorTotalSelecionado)}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.cinzaTexto }}>
            {quantidadeSelecionados} de {totalMatches} matches
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
}
