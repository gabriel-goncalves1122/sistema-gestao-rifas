// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/resumo/CardPendenciasAderido.tsx
// ============================================================================
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Button, Chip } from "@mui/material";

import { painelAderidoStyles } from "../../styles/painelAderidoStyles";
import { ResumoCard } from "./ResumoCard";

/**
 * Propriedades para renderização do card de pendências e recusas de vendas do aderido.
 */
export interface CardPendenciasAderidoProps {
  /** Quantidade total de agrupamentos de vendas com pendência cadastral ou recusa */
  totalPendencias: number;
  /** Callback para alternar a visão para a aba de vendas recusadas */
  onAbrirRecusadas: () => void;
}

/**
 * Card de pendências com a mesma anatomia e dignidade visual do Card de Arrecadação.
 * Exibe o estado "Sem pendências" harmoniosamente ou sinaliza as correções necessárias com ação direta.
 *
 * @param {CardPendenciasAderidoProps} props - Propriedades do componente.
 * @returns {JSX.Element} Card estruturado com ResumoCard.
 */
export function CardPendenciasAderido({
  totalPendencias,
  onAbrirRecusadas,
}: CardPendenciasAderidoProps) {
  const possuiPendencias = totalPendencias > 0;

  if (!possuiPendencias) {
    return (
      <ResumoCard
        icon={<CheckCircleOutlineOutlinedIcon fontSize="small" />}
        label="Pendências"
        valor="Sem pendências"
        descricao="Todas as suas vendas estão em dia e aprovadas."
        variant="success"
      />
    );
  }

  const acaoBotao = (
    <Button
      type="button"
      variant="outlined"
      onClick={onAbrirRecusadas}
      endIcon={<ArrowForwardIcon fontSize="small" />}
      aria-label="Vendas recusadas, corrigir dados"
      sx={painelAderidoStyles.pendenciaBotao}
    >
      Corrigir dados
    </Button>
  );

  const acaoTopo = (
    <Chip
      size="small"
      label={totalPendencias}
      sx={painelAderidoStyles.pendenciaAcaoContador}
    />
  );

  return (
    <ResumoCard
      icon={<ErrorOutlineIcon fontSize="small" />}
      label="Pendências"
      valor="Vendas recusadas"
      descricao={
        totalPendencias === 1
          ? "1 venda aguarda correção de dados do comprador."
          : `${totalPendencias} vendas aguardam correção de dados do comprador.`
      }
      variant="alert"
      acao={acaoBotao}
      acaoTopo={acaoTopo}
    />
  );
}
