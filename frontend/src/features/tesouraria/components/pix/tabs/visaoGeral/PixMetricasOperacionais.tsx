import { Box, Typography } from "@mui/material";

import { PixTransacoesResumo } from "../../../../types/pixTransacoes";
import {
  formatarMoedaPix,
  obterIndicadoresConsolidados,
} from "../../../../utils/pixTransacoesUtils";
import { colors } from "@/shared/tokens/colors";

interface PixMetricasOperacionaisProps {
  resumo: PixTransacoesResumo;
}

export function PixMetricasOperacionais({
  resumo,
}: PixMetricasOperacionaisProps) {
  const ind = obterIndicadoresConsolidados(resumo);

  const metricasOperacionais = [
    {
      label: "Pagas",
      valor: ind.totalGeral.transacoesPagas,
      detalhe: formatarMoedaPix(ind.totalGeral.recebidoLiquido),
    },
    {
      label: "Pendentes",
      valor: ind.totalGeral.transacoesPendentes,
      detalhe: formatarMoedaPix(ind.totalGeral.valorPendenteBruto),
    },
    {
      label: "Canceladas",
      valor: resumo.quantidadeCanceladas,
      detalhe: formatarMoedaPix(resumo.totalCancelado),
    },
    {
      label: "Comprovantes",
      valor: ind.comprovantes.transacoesPagas,
      detalhe: `${ind.comprovantes.rifasPagas} rifas (${formatarMoedaPix(ind.comprovantes.valorRecebido)})`,
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          sm: "repeat(4, minmax(120px, 1fr))",
          md: "repeat(4, minmax(92px, 1fr))",
        },
        gap: 1,
        minWidth: { md: 460 },
      }}
    >
      {metricasOperacionais.map((metrica) => (
        <Box
          key={metrica.label}
          sx={{
            borderRadius: 2,
            bgcolor: colors.fundoSuave,
            border: "1px solid rgba(2, 27, 22, 0.08)",
            px: 1.25,
            py: 1,
            minHeight: 74,
          }}
        >
            <Typography
              sx={{
                color: colors.cinzaTexto,
                fontSize: "0.72rem",
                fontWeight: 850,
                textTransform: "uppercase",
              }}
            >
              {metrica.label}
            </Typography>

            <Typography
              sx={{
                color: colors.pretoEsverdeado,
                fontWeight: 950,
                fontSize: "1.25rem",
                lineHeight: 1.1,
                mt: 0.35,
              }}
            >
              {metrica.valor}
            </Typography>

            <Typography
              sx={{
                color: colors.cinzaTexto,
                fontSize: "0.76rem",
                mt: 0.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {metrica.detalhe}
            </Typography>
        </Box>
      ))}
    </Box>
  );
}
