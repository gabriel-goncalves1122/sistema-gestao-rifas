import { useState } from "react";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { FeedbackSnackbar } from "@/shared/components/FeedbackSnackbar";
import { colors } from "@/shared/tokens/colors";

import {
  ItemLoteValidacaoTransacao,
  PixTransacao,
  ResultadoLoteValidacaoTransacoes,
} from "../../../../types/pixTransacoes";
import { formatarMoedaPix } from "../../../../utils/pixTransacoesUtils";

/**
 * Propriedades da barra flutuante de ações em lote da Tesouraria Pix.
 */
export interface PixAcoesLoteBarProps {
  /** Lista de transações atualmente selecionadas para validação em lote. */
  transacoesSelecionadas: PixTransacao[];
  /** Callback para aprovar em lote as transações selecionadas. */
  onAceitarLote?: (
    itens: ItemLoteValidacaoTransacao[],
  ) => Promise<ResultadoLoteValidacaoTransacoes>;
  /** Callback para recusar em lote as transações selecionadas com justificativa. */
  onNegarLote?: (
    itens: ItemLoteValidacaoTransacao[],
    motivo: string,
  ) => Promise<ResultadoLoteValidacaoTransacoes>;
  /** Callback para limpar a seleção atual. */
  onLimparSelecao: () => void;
  /** Callback opcional notificando conclusão de uma operação em lote. */
  onConcluido?: (resultado: ResultadoLoteValidacaoTransacoes) => void;
}

function mapearItensLote(
  transacoes: PixTransacao[],
): ItemLoteValidacaoTransacao[] {
  return transacoes.map((t) => ({
    id: t.id,
    chaveAcao: t.chaveAcao,
  }));
}

/**
 * Barra flutuante inferior exibida quando há transações selecionadas na Tesouraria,
 * permitindo aprovação ou recusa em lote com cálculo do total selecionado.
 *
 * @param {PixAcoesLoteBarProps} props - Propriedades de controle da barra em lote.
 * @returns {JSX.Element | null} Barra flutuante ou `null` quando não há itens marcados.
 */
export function PixAcoesLoteBar({
  transacoesSelecionadas,
  onAceitarLote,
  onNegarLote,
  onLimparSelecao,
  onConcluido,
}: PixAcoesLoteBarProps) {
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<
    "aceitar" | "negar" | null
  >(null);
  const [modalNegarOpen, setModalNegarOpen] = useState(false);
  const [motivoNegar, setMotivoNegar] = useState("");
  const [erroLote, setErroLote] = useState<string | null>(null);

  if (transacoesSelecionadas.length === 0 && !erroLote) {
    return null;
  }

  const quantidade = transacoesSelecionadas.length;
  const valorTotal = transacoesSelecionadas.reduce((acc, transacao) => {
    const valor =
      transacao.statusPagamento === "PAID"
        ? transacao.valorPago
        : transacao.valorBruto;
    return acc + (Number.isFinite(valor) ? valor : 0);
  }, 0);

  const labelQuantidade = `${quantidade} ${quantidade === 1 ? "selecionada" : "selecionadas"} (${formatarMoedaPix(valorTotal)})`;

  const handleAceitarLote = async () => {
    if (!onAceitarLote) return;
    setAcaoEmAndamento("aceitar");
    setErroLote(null);
    try {
      const resultado = await onAceitarLote(
        mapearItensLote(transacoesSelecionadas),
      );
      if (resultado.falhas?.length) {
        setErroLote(
          `${resultado.falhas.length} ${resultado.falhas.length === 1 ? "transação falhou" : "transações falharam"} no lote.`,
        );
      }
      onLimparSelecao();
      onConcluido?.(resultado);
    } catch (error) {
      setErroLote(
        error instanceof Error
          ? error.message
          : "Erro ao aceitar transações em lote.",
      );
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  const handleConfirmarNegarLote = async () => {
    if (!onNegarLote || !motivoNegar.trim()) return;
    setAcaoEmAndamento("negar");
    setModalNegarOpen(false);
    setErroLote(null);
    try {
      const resultado = await onNegarLote(
        mapearItensLote(transacoesSelecionadas),
        motivoNegar.trim(),
      );
      if (resultado.falhas?.length) {
        setErroLote(
          `${resultado.falhas.length} ${resultado.falhas.length === 1 ? "transação falhou" : "transações falharam"} no lote.`,
        );
      }
      onLimparSelecao();
      onConcluido?.(resultado);
    } catch (error) {
      setErroLote(
        error instanceof Error
          ? error.message
          : "Erro ao negar transações em lote.",
      );
    } finally {
      setAcaoEmAndamento(null);
      setMotivoNegar("");
    }
  };

  return (
    <>
      {quantidade > 0 && (
        <Box
          role="region"
          aria-label="Ações em lote de transações selecionadas"
          sx={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: {
              xs: "max(16px, env(safe-area-inset-bottom))",
              sm: 24,
            },
            zIndex: 1200,
            width: { xs: "calc(100% - 24px)", sm: "auto" },
            maxWidth: 760,
          }}
        >
          <Paper
            elevation={8}
            sx={{
              px: { xs: 1.75, sm: 2.5 },
              py: 1.35,
              borderRadius: 3,
              bgcolor: colors.pretoEsverdeado,
              color: colors.branco,
              border: "1px solid rgba(255, 255, 255, 0.14)",
              boxShadow: "0 18px 40px rgba(2, 27, 22, 0.34)",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton
                  size="small"
                  aria-label="Limpar seleção em lote"
                  onClick={onLimparSelecao}
                  disabled={acaoEmAndamento !== null}
                  sx={{ color: "rgba(255, 255, 255, 0.78)" }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
                <Typography
                  sx={{
                    fontWeight: 850,
                    fontSize: "0.92rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {labelQuantidade}
                </Typography>
              </Stack>

              <Stack
                direction="row"
                spacing={1}
                justifyContent={{ xs: "flex-end", sm: "flex-start" }}
              >
                <Button
                  variant="contained"
                  size="small"
                  disabled={acaoEmAndamento !== null || !onNegarLote}
                  onClick={() => setModalNegarOpen(true)}
                  startIcon={
                    acaoEmAndamento === "negar" ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <CancelIcon />
                    )
                  }
                  sx={{
                    bgcolor: colors.erroSuave,
                    color: colors.erroTexto,
                    fontWeight: 800,
                    textTransform: "none",
                    borderRadius: 2,
                    boxShadow: "none",
                    "&:hover": {
                      bgcolor: colors.erroFundo,
                      boxShadow: "none",
                    },
                  }}
                >
                  Negar selecionadas
                </Button>

                <Button
                  variant="contained"
                  size="small"
                  disabled={acaoEmAndamento !== null || !onAceitarLote}
                  onClick={handleAceitarLote}
                  startIcon={
                    acaoEmAndamento === "aceitar" ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <CheckCircleIcon />
                    )
                  }
                  sx={{
                    bgcolor: colors.verdeClaro,
                    color: colors.verdeEscuro,
                    fontWeight: 850,
                    textTransform: "none",
                    borderRadius: 2,
                    boxShadow: "none",
                    "&:hover": {
                      bgcolor: colors.verdeHover,
                      color: colors.branco,
                      boxShadow: "none",
                    },
                  }}
                >
                  Aceitar selecionadas
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      )}

      <Dialog
        open={modalNegarOpen}
        onClose={() => setModalNegarOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Negar transações selecionadas
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, color: colors.cinzaTexto }}>
            Você está prestes a negar <b>{quantidade}</b>{" "}
            {quantidade === 1 ? "transação selecionada" : "transações selecionadas"}{" "}
            totalizando <b>{formatarMoedaPix(valorTotal)}</b>. Informe o motivo:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Motivo da recusa em lote"
            value={motivoNegar}
            onChange={(e) => setMotivoNegar(e.target.value)}
            multiline
            rows={3}
            placeholder="Ex: Comprovante inválido ou divergência no extrato..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setModalNegarOpen(false)}
            sx={{ color: colors.cinzaTexto }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarNegarLote}
            disabled={!motivoNegar.trim()}
            variant="contained"
            sx={{
              bgcolor: colors.erroTexto,
              color: colors.branco,
              "&:hover": { bgcolor: colors.erroForte },
            }}
          >
            Confirmar Recusa em Lote
          </Button>
        </DialogActions>
      </Dialog>

      <FeedbackSnackbar
        open={Boolean(erroLote)}
        mensagem={erroLote}
        severidade="error"
        autoHideDuration={6000}
        onClose={() => setErroLote(null)}
      />
    </>
  );
}
