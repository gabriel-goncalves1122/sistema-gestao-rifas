import { Box, Paper, Typography } from "@mui/material";

import { PixTransacoesResumo } from "../../../../types/pixTransacoes";
import {
  formatarMoedaPix,
  obterIndicadoresConsolidados,
} from "../../../../utils/pixTransacoesUtils";
import { colors } from "@/shared/tokens/colors";

interface PixVisaoGeralKpisMobileProps {
  resumo: PixTransacoesResumo;
}

export function PixVisaoGeralKpisMobile({
  resumo,
}: PixVisaoGeralKpisMobileProps) {
  const ind = obterIndicadoresConsolidados(resumo);

  const kpisMobile = [
    {
      label: "Recebido (Líq)",
      valor: formatarMoedaPix(ind.totalGeral.recebidoLiquido),
      destaque: true,
    },
    {
      label: "Pendentes",
      valor: ind.totalGeral.transacoesPendentes,
    },
    {
      label: "Comprovantes",
      valor: `${ind.comprovantes.rifasPagas} rifas`,
    },
    {
      label: "Ticket médio",
      valor: formatarMoedaPix(resumo.ticketMedio),
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 1,
      }}
    >
      {kpisMobile.map((kpi) => (
        <Paper
          key={kpi.label}
          elevation={0}
          sx={{
            p: 1.35,
            minHeight: 104,
            borderRadius: 2,
            bgcolor: kpi.destaque ? colors.verdeEscuro : colors.branco,
            border: kpi.alerta
              ? "1px solid rgba(143, 104, 0, 0.28)"
              : "1px solid rgba(2, 27, 22, 0.10)",
            boxShadow: "0 10px 24px rgba(2, 27, 22, 0.06)",
          }}
        >
          <Typography
            sx={{
              color: kpi.destaque ? "rgba(255,255,255,0.76)" : colors.cinzaTexto,
              fontSize: "0.72rem",
              fontWeight: 850,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {kpi.label}
          </Typography>

          <Typography
            sx={{
              color: kpi.destaque
                ? colors.branco
                : kpi.alerta
                  ? colors.alertaTexto
                  : colors.pretoEsverdeado,
              fontSize: "1.28rem",
              fontWeight: 950,
              lineHeight: 1.1,
              mt: 1,
              overflowWrap: "anywhere",
            }}
          >
            {kpi.valor}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}
