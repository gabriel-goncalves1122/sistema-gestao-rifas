import { Box, Paper, Stack, Typography } from "@mui/material";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarMoeda } from "@/shared/utils/formatadores";

import { PixTransacoesResumo } from "../../../../types/pixTransacoes";
import { DadoTemporalPix } from "../../../../types/pixVisaoGeral";

import { formatarValorEixoPix } from "../../../../utils/pixVisaoGeralUtils";
import { PixMetricasOperacionais } from "./PixMetricasOperacionais";

interface PixRecebimentosTemporalChartProps {
  dadosTemporais: DadoTemporalPix[];
  isMobile: boolean;
  resumo: PixTransacoesResumo;
}

export function PixRecebimentosTemporalChart({
  dadosTemporais,
  isMobile,
  resumo,
}: PixRecebimentosTemporalChartProps) {
  const possuiDadosGrafico = dadosTemporais.length > 0;

  return (
    <Paper
      elevation={0}
      sx={{
        mt: { xs: 2, sm: 3 },
        p: { xs: 1.5, sm: 2.5 },
        borderRadius: { xs: 2, sm: 2.25 },
        bgcolor: "#FFFFFF",
        border: "1px solid rgba(2, 27, 22, 0.10)",
        boxShadow: "0 14px 34px rgba(2, 27, 22, 0.07)",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "flex-start" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography
            sx={{
              color: "#021B16",
              fontWeight: 900,
              fontSize: { xs: "1rem", sm: "1.12rem" },
              mb: 0.5,
            }}
          >
            Recebimentos ao longo do tempo
          </Typography>

          {!isMobile && (
            <Typography
              sx={{
                color: "#526760",
                fontSize: "0.9rem",
                maxWidth: 700,
              }}
            >
              Evolução diária dos Pix recebidos, pendentes e pontos que exigem
              conciliação.
            </Typography>
          )}
        </Box>

        {!isMobile && <PixMetricasOperacionais resumo={resumo} />}
      </Stack>

      <Box
        sx={{
          height: { xs: 280, sm: 320 },
          minHeight: 260,
          borderRadius: 2,
          bgcolor: "#F6F8F7",
          border: "1px solid rgba(2, 27, 22, 0.08)",
          overflow: "hidden",
          color: "#526760",
          px: { xs: 0.5, sm: 1 },
          pt: { xs: 1.5, sm: 2 },
          pb: { xs: 1, sm: 1.5 },
        }}
      >
        {possuiDadosGrafico ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dadosTemporais}
              margin={{
                top: 10,
                right: isMobile ? 6 : 18,
                left: isMobile ? -18 : 0,
                bottom: isMobile ? 0 : 8,
              }}
            >
              <defs>
                <linearGradient id="recebidoPix" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0B7A61" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0B7A61" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="pendentePix" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C48A16" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#C48A16" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="rgba(2, 27, 22, 0.08)" vertical={false} />
              <XAxis
                dataKey="data"
                tick={{ fill: "#526760", fontSize: isMobile ? 10 : 12 }}
                axisLine={false}
                tickLine={false}
                minTickGap={isMobile ? 14 : 22}
              />
              <YAxis
                tickFormatter={formatarValorEixoPix}
                tick={{ fill: "#526760", fontSize: isMobile ? 10 : 12 }}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 58 : 76}
              />
              <RechartsTooltip
                formatter={(value: number, name: string) => [
                  formatarMoeda(value),
                  name === "recebido" ? "Recebido" : "Pendente",
                ]}
                labelStyle={{ color: "#021B16", fontWeight: 800 }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(2, 27, 22, 0.10)",
                  boxShadow: "0 12px 28px rgba(2, 27, 22, 0.12)",
                }}
              />
              {!isMobile && (
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: 12 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="recebido"
                name="Recebido"
                stroke="#0B7A61"
                strokeWidth={3}
                fill="url(#recebidoPix)"
                activeDot={{ r: 5 }}
              />
              <Area
                type="monotone"
                dataKey="pendente"
                name="Pendente"
                stroke="#C48A16"
                strokeWidth={2.5}
                fill="url(#pendentePix)"
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Box
            sx={{
              height: "100%",
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              px: 2,
              fontWeight: 800,
            }}
          >
            Nenhuma transação carregada para análise temporal
          </Box>
        )}
      </Box>
    </Paper>
  );
}
