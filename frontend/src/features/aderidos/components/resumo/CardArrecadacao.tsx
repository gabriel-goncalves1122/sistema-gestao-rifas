// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/resumo/CardArrecadacao.tsx
// ============================================================================
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { Box, CircularProgress, IconButton, Stack, Tooltip, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { formatarMoeda } from "@/shared/utils/formatadores";
import { VALOR_RIFA } from "../../utils/constants";
import { ResumoCard } from "./ResumoCard";

/**
 * Propriedades para renderização do Card de Arrecadação com opção de exportação de relatório
 * e barra de progresso em direção à meta total de rifas do lote.
 */
export interface CardArrecadacaoProps {
  /** Total em reais arrecadado nas rifas com pagamento aprovado */
  valorArrecadado: number;
  /** Quantidade total de rifas do lote do aderido (ex: 120 ou 60) */
  totalRifas?: number;
  /** Quantidade de rifas já pagas */
  rifasPagas?: number;
  /** Callback para iniciar a exportação do relatório individual de vendas em PDF */
  onExportarRelatorio?: () => void;
  /** Flag que indica se o relatório está sendo gerado/baixado */
  exportandoRelatorio?: boolean;
}

/**
 * Componente visual de exibição do montante arrecadado com indicador animado de meta.
 *
 * @param {CardArrecadacaoProps} props - Propriedades do componente.
 * @returns {JSX.Element} Card compacto com métrica monetária e progresso visual.
 */
export function CardArrecadacao({
  valorArrecadado,
  totalRifas,
  rifasPagas,
  onExportarRelatorio,
  exportandoRelatorio = false,
}: CardArrecadacaoProps) {
  const acaoTopo = onExportarRelatorio ? (
    <Tooltip
      title={
        exportandoRelatorio
          ? "Gerando relatório PDF..."
          : "Exportar relatório de vendas em PDF"
      }
      arrow
    >
      <span>
        <IconButton
          size="small"
          onClick={onExportarRelatorio}
          disabled={exportandoRelatorio}
          aria-label="Exportar relatório de vendas em PDF"
          sx={{
            color: colors.verdeEscuro,
            bgcolor: "rgba(6, 61, 49, 0.05)",
            border: "1px solid rgba(6, 61, 49, 0.12)",
            borderRadius: 1.5,
            p: 0.65,
            transition: "all 0.2s ease",
            "&:hover": {
              bgcolor: colors.verdeClaro,
              borderColor: "rgba(6, 61, 49, 0.25)",
              color: colors.verdeForte,
            },
            "&.Mui-disabled": {
              opacity: 0.6,
            },
          }}
        >
          {exportandoRelatorio ? (
            <CircularProgress
              size={18}
              thickness={5}
              sx={{ color: colors.verdeForte }}
            />
          ) : (
            <PictureAsPdfOutlinedIcon sx={{ fontSize: 18 }} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  ) : undefined;

  const temMeta = typeof totalRifas === "number" && totalRifas > 0;
  const pagas = rifasPagas ?? Math.min(totalRifas ?? 0, Math.floor(valorArrecadado / VALOR_RIFA));
  const percentual = temMeta ? Math.min(100, Math.round((pagas / (totalRifas as number)) * 100)) : 0;
  const atingiuMeta = temMeta && percentual >= 100;

  const barraMeta = temMeta ? (
    <Box sx={{ width: "100%", mt: 1.25 }}>
      {/* Linha de progresso com animação pura CSS */}
      <Box
        sx={{
          width: "100%",
          height: 6,
          borderRadius: 3,
          bgcolor: "rgba(6, 61, 49, 0.08)",
          overflow: "hidden",
        }}
      >
        <Box
          data-testid="barra-progresso-meta"
          sx={{
            width: `${percentual}%`,
            height: "100%",
            borderRadius: 3,
            background: atingiuMeta
              ? "linear-gradient(90deg, #D97706, #F59E0B)"
              : "linear-gradient(90deg, #063D31, #0E7058)",
            transition: "width 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </Box>

      {/* Legenda motivacional com percentual */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: 0.5 }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: atingiuMeta ? "#B45309" : "#4A5E56",
          }}
        >
          {pagas} de {totalRifas} vendidas ({percentual}%)
        </Typography>
        {atingiuMeta && (
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.72rem",
              fontWeight: 800,
              color: "#B45309",
              bgcolor: "#FEF3C7",
              px: 0.75,
              py: 0.1,
              borderRadius: 1,
            }}
          >
            Meta atingida! 🎉
          </Typography>
        )}
      </Stack>
    </Box>
  ) : undefined;

  return (
    <ResumoCard
      icon={<AccountBalanceWalletOutlinedIcon fontSize="small" />}
      label="Arrecadado"
      valor={formatarMoeda(valorArrecadado)}
      descricao="Confirmado nas vendas aprovadas."
      acao={barraMeta}
      acaoTopo={acaoTopo}
    />
  );
}
