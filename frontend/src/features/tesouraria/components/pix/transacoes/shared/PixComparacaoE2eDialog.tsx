import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

import { ResponsiveDialogShell } from "@/shared/components/ResponsiveDialogShell";
import { VisualizadorComprovante } from "@/shared/components/VisualizadorComprovante";
import { colors } from "@/shared/tokens/colors";
import { formatarData, formatarMoeda } from "@/shared/utils/formatadores";

import { useTesourariaLayout } from "../../../../hooks/useTesourariaLayout";
import { ConflitoE2eOcrDTO, PixTransacao } from "../../../../types/pixTransacoes";
import { formatarRifasPix } from "../../../../utils/pixTransacoesFiltrosUtils";

/**
 * Propriedades do modal de comparação lado a lado de comprovantes com E2E ID duplicado.
 */
export interface PixComparacaoE2eDialogProps {
  /** Compra atualmente selecionada para análise. */
  transacaoAtual: PixTransacao;
  /** Compra conflitante que já possui o mesmo End-to-End ID registrado, ou `null` quando fechado. */
  conflito: ConflitoE2eOcrDTO | null;
  /** Callback para fechar o comparador. */
  onClose: () => void;
}

function ResumoCompraComparacao({
  titulo,
  destaqueCor,
  comprador,
  aderido,
  rifas,
  valor,
  identificador,
  data,
  statusLabel,
  comprovanteUrl,
}: {
  titulo: string;
  destaqueCor: string;
  comprador?: string | null;
  aderido?: string | null;
  rifas: string;
  valor?: number | null;
  identificador?: string | null;
  data?: string | null;
  statusLabel?: string | null;
  comprovanteUrl?: string | null;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        border: `1.5px solid ${destaqueCor}`,
        bgcolor: colors.branco,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography sx={{ fontWeight: 900, fontSize: "0.92rem", color: colors.pretoEsverdeado }}>
          {titulo}
        </Typography>
        {statusLabel && (
          <Chip
            size="small"
            label={statusLabel}
            sx={{ fontWeight: 800, fontSize: "0.72rem", bgcolor: colors.fundoSuave }}
          />
        )}
      </Stack>

      <Box
        sx={{
          p: 1.25,
          borderRadius: 2,
          bgcolor: colors.fundoSuave,
          border: `1px solid ${colors.borda}`,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0.75,
        }}
      >
        <Typography sx={{ fontSize: "0.78rem", color: colors.pretoEsverdeado }}>
          <strong>Pagador:</strong> {comprador || "Não informado"}
        </Typography>
        <Typography sx={{ fontSize: "0.78rem", color: colors.pretoEsverdeado }}>
          <strong>Aderido:</strong> {aderido || "Não vinculado"}
        </Typography>
        <Typography sx={{ fontSize: "0.78rem", color: colors.pretoEsverdeado }}>
          <strong>Rifas:</strong> {rifas || "Sem rifas"}
        </Typography>
        <Typography sx={{ fontSize: "0.78rem", color: colors.pretoEsverdeado }}>
          <strong>Valor:</strong>{" "}
          {typeof valor === "number" ? formatarMoeda(valor) : "Não informado"}
        </Typography>
        <Typography sx={{ fontSize: "0.75rem", color: colors.cinzaTexto, overflowWrap: "anywhere" }}>
          <strong>ID/TXID:</strong> {identificador || "N/A"}
        </Typography>
        <Typography sx={{ fontSize: "0.75rem", color: colors.cinzaTexto }}>
          <strong>Data:</strong> {data ? formatarData(data) : "N/A"}
        </Typography>
      </Box>

      <VisualizadorComprovante url={comprovanteUrl} alturaMaxima={440} />
    </Paper>
  );
}

/**
 * Diálogo comparativo lado a lado exibindo o comprovante da compra em análise
 * e o comprovante da compra conflitante que compartilha o mesmo End-to-End ID Pix.
 *
 * @param {PixComparacaoE2eDialogProps} props - Transação atual, conflito selecionado e callback de fechamento.
 * @returns {JSX.Element | null} Modal comparativo ou `null` quando `conflito` é `null`.
 */
export function PixComparacaoE2eDialog({
  transacaoAtual,
  conflito,
  onClose,
}: PixComparacaoE2eDialogProps) {
  const { isMobile } = useTesourariaLayout();
  if (!conflito) return null;

  const valorAtual =
    transacaoAtual.statusPagamento === "PAID"
      ? transacaoAtual.valorPago
      : transacaoAtual.valorBruto;

  const statusConflito =
    conflito.statusValidacao === "aceita"
      ? "Já Aprovada"
      : conflito.statusValidacao === "negada"
        ? "Recusada"
        : conflito.statusPagamento || "Em análise";

  return (
    <ResponsiveDialogShell
      open
      onClose={onClose}
      isMobile={isMobile}
      title={
        <Stack direction="row" alignItems="center" spacing={1}>
          <CompareArrowsIcon sx={{ color: colors.erroTexto }} />
          <span>Comparação de Comprovantes (Mesmo E2E ID)</span>
        </Stack>
      }
      subtitle={
        transacaoAtual.analiseOcr?.e2eIdDetectado
          ? `E2E ID: ${transacaoAtual.analiseOcr.e2eIdDetectado}`
          : undefined
      }
      closeAriaLabel="Fechar comparação de comprovantes"
      maxWidth="xl"
    >
      <Box
        data-testid="pix-comparacao-e2e-grid"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <ResumoCompraComparacao
          titulo="Compra Atual em Análise"
          destaqueCor={colors.verdeEscuro}
          comprador={transacaoAtual.compradorNome}
          aderido={transacaoAtual.aderido?.nome}
          rifas={formatarRifasPix(transacaoAtual)}
          valor={valorAtual}
          identificador={transacaoAtual.pixOrderId || transacaoAtual.id}
          data={transacaoAtual.dataPagamento || transacaoAtual.dataCriacao}
          statusLabel="Em revisão"
          comprovanteUrl={transacaoAtual.comprovanteUrl}
        />

        <ResumoCompraComparacao
          titulo="Compra Conflitante (Anterior)"
          destaqueCor={colors.erroTexto}
          comprador={conflito.compradorNome}
          aderido={conflito.aderidoNome}
          rifas={conflito.numerosRifas.join(", ")}
          valor={conflito.valorBruto}
          identificador={conflito.pixOrderId || conflito.pagamentoId}
          data={conflito.dataCriacao}
          statusLabel={statusConflito}
          comprovanteUrl={conflito.comprovanteUrl}
        />
      </Box>
    </ResponsiveDialogShell>
  );
}
