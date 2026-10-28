import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import { Box, Stack } from "@mui/material";

import { colors } from "@/shared/tokens/colors";

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

/**
 * Propriedades para renderização da visão móvel de Desempenho.
 */
export interface DesempenhoMobileViewProps {
  /** Dados agregados financeiros e analíticos de desempenho. */
  dados: DesempenhoDados;
  /** Lista filtrada de ranking de aderidos (mantida para compatibilidade). */
  rankingFiltrado?: AderidoRankingDesempenho[];
  /** Termo atual do campo de busca do ranking (mantido para compatibilidade). */
  buscaRanking?: string;
  /** Callback para alteração do termo de busca (mantido para compatibilidade). */
  onBuscaRankingChange?: (termo: string) => void;
}

/**
 * Visualização compacta e adaptada para dispositivos móveis da tela de Desempenho.
 *
 * @param {DesempenhoMobileViewProps} props - Propriedades do componente.
 * @returns {JSX.Element} Visualização mobile com safe areas e gráficos consolidados.
 */
export function DesempenhoMobileView({
  dados,
}: DesempenhoMobileViewProps) {
  return (
    <Box sx={{ pb: "max(24px, env(safe-area-inset-bottom))", px: { xs: 1.25, sm: 0 } }}>
      <TesourariaSectionHeader
        eyebrow="Comissão"
        titulo="Desempenho financeiro"
        subtitulo="Resumo da arrecadação e metas da comissão."
        compact
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 1.15,
          mb: 1.75,
        }}
      >
        <Box sx={{ gridColumn: "1 / -1" }}>
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
            )}`}
            icon={<AttachMoneyOutlinedIcon fontSize="small" />}
            cor={colors.verdeEscuro}
            destaque
          />
        </Box>

        <DesempenhoKpiCard
          titulo="Rifas vendidas"
          valor={formatarInteiroDesempenho(dados.resumoGeral.rifasPagas)}
          detalhe={`${dados.resumoGeral.rifasPagasPix ?? 0} Pix • ${
            dados.resumoGeral.rifasPagasComprovante ?? 0
          } Comp.`}
          icon={<ConfirmationNumberOutlinedIcon fontSize="small" />}
          cor={colors.verdeMedio}
        />

        <DesempenhoKpiCard
          titulo="Aderidos ativos"
          valor={formatarInteiroDesempenho(dados.resumoGeral.aderidosAtivos)}
          detalhe={`${dados.metas.bateramMeta} na meta`}
          icon={<GroupsOutlinedIcon fontSize="small" />}
          cor={colors.dourado}
        />
      </Box>

      <Stack spacing={1.65}>
        <DesempenhoChartCard titulo="Arrecadação diária (Pix vs Comp.)" compacto>
          <ReceitaAreaChart data={dados.receitaPorDia} compact />
        </DesempenhoChartCard>

        <DesempenhoChartCard titulo="Status das rifas" compacto>
          <ResumoBarChart
            data={dados.status.barras}
            total={dados.status.total}
            emptyMessage="Sem transações registradas."
            compact
          />
        </DesempenhoChartCard>

        <DesempenhoChartCard titulo="Origem das vendas" compacto>
          <ResumoBarChart
            data={dados.origem.barras}
            total={dados.origem.total}
            emptyMessage="Sem vendas registradas."
            compact
          />
        </DesempenhoChartCard>

        <DesempenhoChartCard titulo="Metas da comissão" compacto>
          <ResumoBarChart
            data={dados.metas.barras}
            total={dados.metas.total}
            emptyMessage="Sem aderidos registrados."
            compact
          />
        </DesempenhoChartCard>
      </Stack>
    </Box>
  );
}
