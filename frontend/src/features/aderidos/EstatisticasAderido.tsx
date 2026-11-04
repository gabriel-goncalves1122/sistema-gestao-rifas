// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/EstatisticasAderido.tsx
// ============================================================================
import { Box, Paper } from "@mui/material";

import { CardArrecadacao } from "./components/resumo/CardArrecadacao";
import { CardPendenciasAderido } from "./components/resumo/CardPendenciasAderido";
import { HeaderAderido } from "./components/resumo/HeaderAderido";
import { painelAderidoStyles } from "./styles/painelAderidoStyles";

/**
 * Propriedades para renderização da seção superior de estatísticas e resumo do aderido.
 */
interface EstatisticasAderidoProps {
  primeiroNome: string;
  valorArrecadado: number;
  notificacoesNaoLidas: number;
  totalPendencias: number;
  totalRifas?: number;
  rifasPagas?: number;
  onAbrirNotificacoes: () => void;
  onAbrirRecusadas: () => void;
  onExportarRelatorio?: () => void;
  exportandoRelatorio?: boolean;
}

export function EstatisticasAderido({
  primeiroNome,
  valorArrecadado,
  notificacoesNaoLidas,
  totalPendencias,
  totalRifas,
  rifasPagas,
  onAbrirNotificacoes,
  onAbrirRecusadas,
  onExportarRelatorio,
  exportandoRelatorio,
}: EstatisticasAderidoProps) {
  return (
    <Box sx={painelAderidoStyles.resumoContainer}>
      <HeaderAderido
        primeiroNome={primeiroNome}
        notificacoesNaoLidas={notificacoesNaoLidas}
        onAbrirNotificacoes={onAbrirNotificacoes}
      />

      <Paper elevation={0} sx={painelAderidoStyles.resumoCompactoCard}>
        <CardArrecadacao
          valorArrecadado={valorArrecadado}
          totalRifas={totalRifas}
          rifasPagas={rifasPagas}
          onExportarRelatorio={onExportarRelatorio}
          exportandoRelatorio={exportandoRelatorio}
        />

        <Box sx={painelAderidoStyles.resumoDivisor} />

        <CardPendenciasAderido
          totalPendencias={totalPendencias}
          onAbrirRecusadas={onAbrirRecusadas}
        />
      </Paper>
    </Box>
  );
}
