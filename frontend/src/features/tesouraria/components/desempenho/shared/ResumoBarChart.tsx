import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BarraResumoDesempenho } from "../../../types/desempenho";
import { DesempenhoEmptyState } from "./DesempenhoEmptyState";

interface ResumoBarChartProps {
  data: BarraResumoDesempenho[];
  total: number;
  emptyMessage: string;
  compact?: boolean;
}

export function ResumoBarChart({
  data,
  total,
  emptyMessage,
  compact = false,
}: ResumoBarChartProps) {
  const altura = compact ? 150 : 210;

  if (total === 0) {
    return <DesempenhoEmptyState altura={altura} mensagem={emptyMessage} />;
  }

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{
          top: 4,
          right: compact ? 18 : 24,
          left: compact ? 4 : 8,
          bottom: 4,
        }}
      >
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="label"
          width={compact ? 82 : 98}
          tick={{ fill: "#526760", fontSize: compact ? 11 : 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(2, 27, 22, 0.04)" }}
          formatter={(value: any) => [`${Number(value || 0)} registros`, "Total"]}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid rgba(2, 27, 22, 0.10)",
            boxShadow: "0 12px 28px rgba(2, 27, 22, 0.12)",
          }}
        />
        <Bar dataKey="valor" radius={[0, 8, 8, 0]} barSize={compact ? 22 : 28}>
          {data.map((item) => (
            <Cell key={item.label} fill={item.cor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
