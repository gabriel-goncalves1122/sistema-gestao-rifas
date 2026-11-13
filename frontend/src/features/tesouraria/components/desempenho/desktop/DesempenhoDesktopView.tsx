import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import { Box } from "@mui/material";

import { colors } from "@/shared/tokens/colors";

import { TesourariaSectionHeader } from "../../shared/TesourariaSectionHeader";
import {
  formatarInteiro,
  formatarMoeda,
} from "@/shared/utils/formatadores";
import {
  AderidoRankingDesempenho,
  DesempenhoDados,
} from "../../../types/desempenho";
import { DesempenhoChartCard } from "../shared/DesempenhoChartCard";
import { DesempenhoKpiCard } from "../shared/DesempenhoKpiCard";
import { ReceitaAreaChart } from "../shared/ReceitaAreaChart";
import { ResumoBarChart } from "../shared/ResumoBarChart";

/**
 * Propriedades para renderização da visão desktop de Desempenho.
 */
export interface DesempenhoDesktopViewProps {
  /** Dados agregados financeiros e analíticos de desempenho. */
  dados: DesempenhoDados;
  /** Lista filtrada de ranking de aderidos (mantida para compatibilidade de contrato). */
  rankingFiltrado?: AderidoRankingDesempenho[];
  /** Termo atual do campo de busca do ranking (mantido para compatibilidade). */
  buscaRanking?: string;
  /** Callback para alteração do termo de busca (mantido para compatibilidade). */
  onBuscaRankingChange?: (termo: string) => void;
}

/**
 * Visualização completa em desktop da tela de Desempenho Financeiro da Tesouraria.
 * Foca nos indicadores macro e gráficos analíticos da comissão (o detalhamento individual
 * de aderidos fica na aba Aderidos da tela de Transações).
 *
 * @param {DesempenhoDesktopViewProps} props - Propriedades do componente.
 * @returns {JSX.Element} Painel analítico de desempenho com KPIs e gráficos.
 */
export function DesempenhoDesktopView({
  dados,
}: DesempenhoDesktopViewProps) {
  const percentualMeta =
    dados.metas.total > 0
      ? Math.round((dados.metas.bateramMeta / dados.metas.total) * 100)
      : 0;

  return (
    <Box sx={{ pb: 4, px: { xs: 1.5, md: 0.5 } }}>
      <TesourariaSectionHeader
        eyebrow="Comissão"
        titulo="Desempenho financeiro"
        subtitulo="Leitura consolidada da arrecadação, rifas e metas da comissão."
      />

      <Box sx={{ mb: 2.75 }}>
        <DesempenhoKpiCard
          titulo="Receita validada"
          valor={formatarMoeda(
            dados.resumoGeral.totalArrecadadoLiquido ??
              dados.resumoGeral.totalArrecadado,
          )}
          detalhe={
            Math.abs(
              (dados.resumoGeral.totalArrecadado ?? 0) -
                (dados.resumoGeral.totalArrecadadoLiquido ??
                  dados.resumoGeral.totalArrecadado ??
                  0),
            ) > 0.009
              ? `Bruto: ${formatarMoeda(
                  dados.resumoGeral.totalArrecadado,
                )} • Pix: ${formatarMoeda(
                  dados.resumoGeral.valorArrecadadoPixLiquido ?? 0,
                )} • Comprovantes: ${formatarMoeda(
                  dados.resumoGeral.valorArrecadadoComprovante ?? 0,
                )}`
              : `Pix: ${formatarMoeda(
                  dados.resumoGeral.valorArrecadadoPixLiquido ?? 0,
                )} • Comprovantes: ${formatarMoeda(
                  dados.resumoGeral.valorArrecadadoComprovante ?? 0,
                )}`
          }
          icon={<AttachMoneyOutlinedIcon fontSize="small" />}
          cor={colors.verdeEscuro}
          destaque
        />
      </Box>

      <DesempenhoChartCard
        titulo="Arrecadação validada por dia"
        subtitulo="Evolução diária da receita confirmada da comissão."
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
          valor={`${formatarInteiro(
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
          valor={`${formatarInteiro(
            dados.resumoGeral.aderidosAtivos,
          )} alunos`}
          detalhe={`${formatarInteiro(
            dados.metas.bateramMeta,
          )} na meta individual`}
          icon={<GroupsOutlinedIcon fontSize="small" />}
          cor={colors.dourado}
        />
        <DesempenhoKpiCard
          titulo="Meta atingida"
          valor={`${percentualMeta}%`}
          detalhe={`${formatarInteiro(
            dados.metas.bateramMeta,
          )} de ${formatarInteiro(dados.metas.total)} formandos`}
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
    </Box>
  );
}
