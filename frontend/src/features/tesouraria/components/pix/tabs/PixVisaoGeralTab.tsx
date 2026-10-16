import { useMemo } from "react";
import { Box } from "@mui/material";

import { useTesourariaLayout } from "../../../hooks/useTesourariaLayout";

import { PixTransacoesResumoCards } from "../transacoes/shared/PixTransacoesResumoCards";
import {
  PixTransacoesResumo,
  PixTransacao,
} from "../../../types/pixTransacoes";
import { montarDadosTemporaisPix } from "../../../utils/pixVisaoGeralUtils";
import { PixRecebimentosTemporalChart } from "./visaoGeral/PixRecebimentosTemporalChart";
import { PixResumoConsolidado } from "./visaoGeral/PixResumoConsolidado";
import { PixVisaoGeralKpisMobile } from "./visaoGeral/PixVisaoGeralKpisMobile";

interface PixVisaoGeralTabProps {
  resumo: PixTransacoesResumo;
  transacoes: PixTransacao[];
}

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
      {isMobile ? (
        <PixVisaoGeralKpisMobile resumo={resumo} />
      ) : (
        <PixTransacoesResumoCards resumo={resumo} />
      )}

      <PixResumoConsolidado resumo={resumo} isMobile={isMobile} />

      <PixRecebimentosTemporalChart
        dadosTemporais={dadosTemporais}
        isMobile={isMobile}
        resumo={resumo}
      />
    </Box>
  );
}
