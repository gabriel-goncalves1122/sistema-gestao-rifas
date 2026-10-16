import { useMemo } from "react";
import { Box } from "@mui/material";

import { useTesourariaLayout } from "../../../hooks/useTesourariaLayout";
import {
  PixTransacoesResumo,
  PixTransacao,
} from "../../../types/pixTransacoes";
import { montarDadosTemporaisPix } from "../../../utils/pixVisaoGeralUtils";
import { PixRecebimentosTemporalChart } from "./visaoGeral/PixRecebimentosTemporalChart";
import { PixResumoConsolidado } from "./visaoGeral/PixResumoConsolidado";

/**
 * Propriedades para renderização da aba de Visão Geral dos recebimentos Pix.
 */
export interface PixVisaoGeralTabProps {
  /** Resumo consolidado financeiro e operacional da tesouraria */
  resumo: PixTransacoesResumo;
  /** Transações Pix para montagem da série temporal de pagamentos */
  transacoes: PixTransacao[];
}

/**
 * Aba de Visão Geral da Tesouraria Pix.
 * Exibe a consolidação unificada de canais (Total Geral, Pix Automatizado e Comprovantes Manuais)
 * e o gráfico de evolução diária de recebimentos ao longo do tempo.
 *
 * @param {PixVisaoGeralTabProps} props - Propriedades da aba.
 * @returns {JSX.Element} Visualização completa e desobstruída da visão geral.
 */
export function PixVisaoGeralTab({
  resumo,
  transacoes,
}: PixVisaoGeralTabProps) {
  const { isMobile } = useTesourariaLayout();
  const dadosTemporais = useMemo(
    () => montarDadosTemporaisPix(transacoes),
    [transacoes],
  );

  return (
    <Box sx={{ pb: { xs: 2, sm: 0 } }}>
      <PixResumoConsolidado resumo={resumo} isMobile={isMobile} />

      <PixRecebimentosTemporalChart
        dadosTemporais={dadosTemporais}
        isMobile={isMobile}
        resumo={resumo}
      />
    </Box>
  );
}
