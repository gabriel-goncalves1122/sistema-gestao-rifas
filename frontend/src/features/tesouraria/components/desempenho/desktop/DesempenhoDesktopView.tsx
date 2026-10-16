import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import SearchIcon from "@mui/icons-material/Search";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import { Box, InputAdornment, Stack, TextField, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { typographyScale as typography } from "@/shared/tokens/typography";

import { TesourariaSectionHeader } from "../../shared/TesourariaSectionHeader";
import {
  formatarInteiroDesempenho,
  formatarMoedaDesempenho,
} from "../../../utils/desempenhoFormatters";
import {
  AderidoRankingDesempenho,
  DesempenhoDados,
} from "../../../types/desempenho";
import { DesempenhoChartCard } from "../shared/DesempenhoChartCard";
import { DesempenhoKpiCard } from "../shared/DesempenhoKpiCard";
import { ReceitaAreaChart } from "../shared/ReceitaAreaChart";
import { ResumoBarChart } from "../shared/ResumoBarChart";
import { DesempenhoRankingTable } from "./DesempenhoRankingTable";

/**
 * Propriedades para renderização da visão desktop de Desempenho.
 */
export interface DesempenhoDesktopViewProps {
  /** Dados agregados financeiros e analíticos de desempenho. */
  dados: DesempenhoDados;
  /** Lista filtrada de ranking de aderidos. */
  rankingFiltrado?: AderidoRankingDesempenho[];
  /** Termo atual do campo de busca do ranking. */
  buscaRanking?: string;
  /** Callback para alteração do termo de busca. */
  onBuscaRankingChange?: (termo: string) => void;
}

/**
 * Visualização completa em desktop da tela de Desempenho Financeiro da Tesouraria.
 *
 * @param {DesempenhoDesktopViewProps} props - Propriedades do componente.
 * @returns {JSX.Element} Painel analítico de desempenho com gráficos e ranking.
 */
export function DesempenhoDesktopView({
  dados,
  rankingFiltrado,
  buscaRanking = "",
  onBuscaRankingChange,
}: DesempenhoDesktopViewProps) {
  const percentualMeta =
    dados.metas.total > 0
      ? Math.round((dados.metas.bateramMeta / dados.metas.total) * 100)
      : 0;

  const rankingExibido = rankingFiltrado ?? dados.rankingAderidos;

  return (
    <Box sx={{ pb: 4, px: { xs: 1.5, md: 0.5 } }}>
      <TesourariaSectionHeader
        eyebrow="Comissão"
        titulo="Desempenho financeiro"
        subtitulo="Leitura consolidada da arrecadação, rifas e metas da comissão."
      />

      <Box sx={{ mb: 2.75 }}>
        <DesempenhoKpiCard
          titulo="Receita validada (Líquida)"
          valor={formatarMoedaDesempenho(
            dados.resumoGeral.totalArrecadadoLiquido ??
              dados.resumoGeral.totalArrecadado,
          )}
          detalhe={`Bruto: ${formatarMoedaDesempenho(
            dados.resumoGeral.totalArrecadado,
          )} • Pix: ${formatarMoedaDesempenho(
            dados.resumoGeral.valorArrecadadoPixLiquido ?? 0,
          )} • Comprovantes: ${formatarMoedaDesempenho(
            dados.resumoGeral.valorArrecadadoComprovante ?? 0,
          )}`}
          icon={<AttachMoneyOutlinedIcon fontSize="small" />}
          cor={colors.verdeEscuro}
          destaque
        />
      </Box>

      <DesempenhoChartCard
        titulo="Arrecadação validada por dia (Pix vs Comprovante)"
        subtitulo="Receita diária confirmada com distinção entre Pix automatizado e comprovantes manuais."
      >
        <ReceitaAreaChart data={dados.receitaPorDia} />
      </DesempenhoChartCard>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 2.25,
          my: 2.75,
        }}
      >
        <DesempenhoKpiCard
          titulo="Rifas vendidas"
          valor={`${formatarInteiroDesempenho(
            dados.resumoGeral.rifasPagas,
          )} rifas`}
          detalhe={`${dados.resumoGeral.rifasPagasPix ?? 0} Pix • ${
            dados.resumoGeral.rifasPagasComprovante ?? 0
          } Comp. (${dados.resumoGeral.rifasPendentes ?? 0} pendentes)`}
          icon={<ConfirmationNumberOutlinedIcon fontSize="small" />}
          cor={colors.verdeMedio}
        />
        <DesempenhoKpiCard
          titulo="Aderidos ativos"
          valor={`${formatarInteiroDesempenho(
            dados.resumoGeral.aderidosAtivos,
          )} alunos`}
          detalhe={`${formatarInteiroDesempenho(
            dados.metas.bateramMeta,
          )} na meta individual`}
          icon={<GroupsOutlinedIcon fontSize="small" />}
          cor={colors.dourado}
        />
        <DesempenhoKpiCard
          titulo="Meta atingida"
          valor={`${percentualMeta}%`}
          detalhe={`${formatarInteiroDesempenho(
            dados.metas.bateramMeta,
          )} de ${formatarInteiroDesempenho(dados.metas.total)} formandos`}
          icon={<TaskAltOutlinedIcon fontSize="small" />}
          cor={colors.verdeEscuro}
        />
      </Box>

      {/* Grid de Gráficos de Barras com Origem */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2.5,
          mb: 4,
        }}
      >
        <DesempenhoChartCard
          titulo="Status das rifas"
          subtitulo="Distribuição entre pagamentos confirmados, pendentes e recusados."
        >
          <ResumoBarChart
            data={dados.status.barras}
            total={dados.status.total}
            emptyMessage="Sem transações registradas."
          />
        </DesempenhoChartCard>

        <DesempenhoChartCard
          titulo="Origem das vendas"
          subtitulo="Comparativo de rifas por canal de entrada."
        >
          <ResumoBarChart
            data={dados.origem.barras}
            total={dados.origem.total}
            emptyMessage="Sem vendas registradas."
          />
        </DesempenhoChartCard>

        <DesempenhoChartCard
          titulo="Metas da comissão"
          subtitulo="Aderidos que já alcançaram a meta individual."
        >
          <ResumoBarChart
            data={dados.metas.barras}
            total={dados.metas.total}
            emptyMessage="Sem aderidos registrados."
          />
        </DesempenhoChartCard>
      </Box>

      {/* Seção de Ranking de Aderidos */}
      <Box sx={{ mt: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography
              sx={{
                ...typography.sectionTitle,
                color: colors.pretoEsverdeado,
                fontSize: "1.25rem",
                fontWeight: 900,
              }}
            >
              Ranking de Arrecadação por Aderido
            </Typography>
            <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.85rem" }}>
              Desempenho individual, cumprimento de metas e canais de venda de cada formando.
            </Typography>
          </Box>

          <TextField
            size="small"
            placeholder="Buscar por nome, curso ou CPF..."
            value={buscaRanking}
            onChange={(e) => onBuscaRankingChange?.(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: colors.cinzaIcone, fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: { xs: "100%", sm: 280 } }}
          />
        </Stack>

        <DesempenhoRankingTable ranking={rankingExibido} />
      </Box>
    </Box>
  );
}
