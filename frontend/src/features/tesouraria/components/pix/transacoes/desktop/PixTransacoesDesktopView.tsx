import { Box } from "@mui/material";

import { FeedbackSnackbar } from "@/shared/components/FeedbackSnackbar";
import { usePixTransacoesSelecao } from "../../../../hooks/usePixTransacoesSelecao";
import {
  AnaliseOcrDTO,
  ItemLoteValidacaoTransacao,
  PixTransacao,
  PixTransacoesFiltros as PixTransacoesFiltrosState,
  ResultadoLoteValidacaoTransacoes,
} from "../../../../types/pixTransacoes";
import { PixAcoesLoteBar } from "../shared/PixAcoesLoteBar";
import { PixEmptyState } from "../shared/PixEmptyState";
import { PixTransacoesFiltros } from "../shared/PixTransacoesFiltros";
import { PixTransacoesTable } from "./PixTransacoesTable";

/**
 * Propriedades da visão desktop de validação de transações Pix.
 */
export interface PixTransacoesDesktopViewProps {
  /** Estado atual dos filtros aplicados. */
  filtros: PixTransacoesFiltrosState;
  /** Lista de transações já filtrada para exibição. */
  transacoes: PixTransacao[];
  /** Lista completa de transações para cálculo das contagens dos chips. */
  todasTransacoes?: PixTransacao[];
  /** Callback para atualizar os filtros. */
  onChangeFiltros: (filtros: PixTransacoesFiltrosState) => void;
  /** Callback de aprovação individual. */
  onAceitar: (id: string, chaveAcao?: string) => Promise<void>;
  /** Callback de recusa individual com motivo. */
  onNegar: (id: string, motivo: string, chaveAcao?: string) => Promise<void>;
  /** Callback de aprovação em lote. */
  onAceitarLote?: (
    itens: ItemLoteValidacaoTransacao[],
  ) => Promise<ResultadoLoteValidacaoTransacoes>;
  /** Callback de recusa em lote com motivo. */
  onNegarLote?: (
    itens: ItemLoteValidacaoTransacao[],
    motivo: string,
  ) => Promise<ResultadoLoteValidacaoTransacoes>;
  /** Callback opcional para reanalisar OCR de um comprovante. */
  onReanalisarOcr?: (id: string) => Promise<AnaliseOcrDTO | null>;
  /** Identificador da transação atualmente em reanálise OCR. */
  reanalisandoOcrId?: string | null;
  /** Callback opcional para abrir diálogo de conciliação por extrato. */
  onAbrirConciliacao?: () => void;
}

/**
 * Visão desktop da aba Validar Transações da Tesouraria, integrando filtros,
 * tabela com seleção múltipla e barra flutuante de validação em lote.
 *
 * @param {PixTransacoesDesktopViewProps} props - Propriedades da visão desktop.
 * @returns {JSX.Element} Interface desktop completa.
 */
export function PixTransacoesDesktopView({
  filtros,
  transacoes,
  todasTransacoes,
  onChangeFiltros,
  onAceitar,
  onNegar,
  onAceitarLote,
  onNegarLote,
  onReanalisarOcr,
  reanalisandoOcrId,
  onAbrirConciliacao,
}: PixTransacoesDesktopViewProps) {
  const {
    selecionadosIds,
    transacoesSelecionadas,
    feedbackLote,
    contagens,
    handleToggleSelecao,
    handleToggleTodas,
    handleLimparSelecao,
    handleConcluidoLote,
    fecharFeedbackLote,
  } = usePixTransacoesSelecao({ transacoes, todasTransacoes });

  return (
    <Box sx={{ pb: transacoesSelecionadas.length > 0 ? 10 : 0 }}>
      <PixTransacoesFiltros
        filtros={filtros}
        onChangeFiltros={onChangeFiltros}
        totalResultados={transacoes.length}
        contagens={contagens}
        onAbrirConciliacao={onAbrirConciliacao}
      />

      {transacoes.length === 0 ? (
        <PixEmptyState />
      ) : (
        <PixTransacoesTable
          transacoes={transacoes}
          onAceitar={onAceitar}
          onNegar={onNegar}
          onReanalisarOcr={onReanalisarOcr}
          reanalisandoOcrId={reanalisandoOcrId}
          selecionadosIds={selecionadosIds}
          onToggleSelecao={handleToggleSelecao}
          onToggleTodas={handleToggleTodas}
        />
      )}

      <PixAcoesLoteBar
        transacoesSelecionadas={transacoesSelecionadas}
        onAceitarLote={onAceitarLote}
        onNegarLote={onNegarLote}
        onLimparSelecao={handleLimparSelecao}
        onConcluido={handleConcluidoLote}
      />

      <FeedbackSnackbar
        open={Boolean(feedbackLote)}
        mensagem={feedbackLote?.mensagem}
        severidade={feedbackLote?.tipo || "success"}
        onClose={fecharFeedbackLote}
        autoHideDuration={5000}
      />
    </Box>
  );
}
