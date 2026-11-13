import { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";

import { FeedbackSnackbar } from "@/shared/components/FeedbackSnackbar";
import { usePaginacaoProgressiva } from "@/shared/hooks/usePaginacaoProgressiva";
import { colors } from "@/shared/tokens/colors";

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
import { PixTransacaoDetalhesDialog } from "../shared/PixTransacaoDetalhesDialog";
import { PixTransacoesFiltros } from "../shared/PixTransacoesFiltros";
import { PixTransacaoCard } from "./PixTransacaoCard";

const ITENS_POR_LOTE_MOBILE = 20;

/**
 * Propriedades da visão mobile de validação de transações Pix.
 */
export interface PixTransacoesMobileViewProps {
  /** Estado atual dos filtros aplicados. */
  filtros: PixTransacoesFiltrosState;
  /** Lista de transações filtrada para exibição. */
  transacoes: PixTransacao[];
  /** Lista completa de transações para cálculo das contagens. */
  todasTransacoes?: PixTransacao[];
  /** Callback para atualizar os filtros. */
  onChangeFiltros: (filtros: PixTransacoesFiltrosState) => void;
  /** Callback para aceitar uma transação. */
  onAceitar: (id: string, chaveAcao?: string) => Promise<void>;
  /** Callback para recusar uma transação com justificativa. */
  onNegar: (id: string, motivo: string, chaveAcao?: string) => Promise<void>;
  /** Callback para aprovação em lote. */
  onAceitarLote?: (
    itens: ItemLoteValidacaoTransacao[],
  ) => Promise<ResultadoLoteValidacaoTransacoes>;
  /** Callback para recusa em lote com motivo. */
  onNegarLote?: (
    itens: ItemLoteValidacaoTransacao[],
    motivo: string,
  ) => Promise<ResultadoLoteValidacaoTransacoes>;
  /** Callback opcional para reanalisar OCR de um comprovante. */
  onReanalisarOcr?: (id: string) => Promise<AnaliseOcrDTO | null>;
  /** Identificador da transação atualmente em reanálise OCR. */
  reanalisandoOcrId?: string | null;
  /** Callback opcional para abrir conciliação por extrato. */
  onAbrirConciliacao?: () => void;
}

/**
 * Visão mobile de transações Pix com renderização progressiva em lotes de 20 cartões,
 * seleção múltipla e barra flutuante de ações em lote.
 *
 * @param {PixTransacoesMobileViewProps} props - Propriedades do componente.
 * @returns {JSX.Element} Visão mobile completa.
 */
export function PixTransacoesMobileView({
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
}: PixTransacoesMobileViewProps) {
  const [transacaoSelecionada, setTransacaoSelecionada] =
    useState<PixTransacao | null>(null);
  const transacaoSelecionadaAtiva = transacaoSelecionada
    ? (transacoes.find((t) => t.id === transacaoSelecionada.id) ?? transacaoSelecionada)
    : null;

  const {
    selecionadosIds,
    transacoesSelecionadas,
    feedbackLote,
    contagens,
    handleToggleSelecao,
    handleLimparSelecao,
    handleConcluidoLote,
    fecharFeedbackLote,
  } = usePixTransacoesSelecao({ transacoes, todasTransacoes });

  const {
    itensVisiveis: transacoesVisiveis,
    restantes,
    sentinelaRef,
    carregarMais,
  } = usePaginacaoProgressiva(transacoes, ITENS_POR_LOTE_MOBILE);

  return (
    <Stack spacing={2} sx={{ pb: transacoesSelecionadas.length > 0 ? 12 : 0 }}>
      <PixTransacoesFiltros
        filtros={filtros}
        onChangeFiltros={onChangeFiltros}
        totalResultados={transacoes.length}
        contagens={contagens}
        onAbrirConciliacao={onAbrirConciliacao}
      />

      <Box>
        <Typography
          sx={{
            color: "#021B16",
            fontWeight: 900,
            fontSize: "1rem",
            mb: 0.25,
          }}
        >
          Histórico Pix
        </Typography>

        <Typography sx={{ color: "#526760", fontSize: "0.84rem" }}>
          {transacoes.length} transação(ões) encontradas
        </Typography>
      </Box>

      {transacoes.length === 0 ? (
        <PixEmptyState />
      ) : (
        <Stack spacing={1.5} sx={{ pl: 1, pr: 0.25 }}>
          {transacoesVisiveis.map((transacao) => (
            <Box
              key={transacao.id}
              onClick={() => setTransacaoSelecionada(transacao)}
            >
              <PixTransacaoCard
                transacao={transacao}
                onAceitar={onAceitar}
                onNegar={onNegar}
                selecionada={selecionadosIds.has(transacao.id)}
                onToggleSelecao={handleToggleSelecao}
              />
            </Box>
          ))}

          {restantes > 0 && (
            <Box ref={sentinelaRef} sx={{ pt: 0.5, textAlign: "center" }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={carregarMais}
                sx={{
                  borderRadius: 2,
                  fontWeight: 850,
                  textTransform: "none",
                  color: colors.verdeEscuro,
                  borderColor: "rgba(6, 61, 49, 0.24)",
                  py: 1,
                }}
              >
                Mostrar mais ({restantes} restante{restantes > 1 ? "s" : ""})
              </Button>
            </Box>
          )}
        </Stack>
      )}

      <PixTransacaoDetalhesDialog
        transacao={transacaoSelecionadaAtiva}
        onClose={() => setTransacaoSelecionada(null)}
        onAceitar={onAceitar}
        onNegar={onNegar}
        onReanalisarOcr={onReanalisarOcr}
        reanalisandoOcr={
          Boolean(transacaoSelecionadaAtiva) &&
          reanalisandoOcrId === transacaoSelecionadaAtiva?.id
        }
      />

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
    </Stack>
  );
}
