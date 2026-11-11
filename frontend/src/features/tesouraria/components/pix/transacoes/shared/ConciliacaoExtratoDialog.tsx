/**
 * Modal para upload de extrato bancário (InfinitePay) e conciliação em lote na validação de transações Pix.
 *
 * @module ConciliacaoExtratoDialog
 */
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { formatarMoeda } from "@/shared/utils/formatadores";
import { ResultadoAnaliseExtrato } from "../../../../types/conciliacaoExtrato";
import { ConciliacaoMatchesTable } from "./ConciliacaoMatchesTable";
import { ConciliacaoResumoCards } from "./ConciliacaoResumoCards";
import { ConciliacaoUploadDropzone } from "./ConciliacaoUploadDropzone";

export interface ConciliacaoExtratoDialogProps {
  aberto: boolean;
  onFechar: () => void;
  arquivo: File | null;
  analisando: boolean;
  aprovando: boolean;
  resultado: ResultadoAnaliseExtrato | null;
  selecionados: Set<string>;
  erro: string | null;
  onSelecionarArquivo: (arquivo: File) => Promise<void>;
  onToggleSelecao: (pagamentoId: string) => void;
  onToggleTodos: () => void;
  onConfirmarAprovacao: () => Promise<boolean>;
  onLimpar: () => void;
  valorTotalSelecionado: number;
}

/**
 * Dialog de conciliação por extrato bancário para aprovação em lote de transações Pix pendentes.
 *
 * @param {ConciliacaoExtratoDialogProps} props - Propriedades de controle e callbacks.
 * @returns {JSX.Element} Modal de conciliação com upload, resumo e listagem de matches.
 */
export function ConciliacaoExtratoDialog({
  aberto,
  onFechar,
  analisando,
  aprovando,
  resultado,
  selecionados,
  erro,
  onSelecionarArquivo,
  onToggleSelecao,
  onToggleTodos,
  onConfirmarAprovacao,
  onLimpar,
  valorTotalSelecionado,
}: ConciliacaoExtratoDialogProps) {
  return (
    <Dialog
      open={aberto}
      onClose={onFechar}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: colors.verdeEscuro }}>
              Conciliação por Extrato Bancário
            </Typography>
            <Typography variant="body2" sx={{ color: colors.cinzaTexto }}>
              Cruze o extrato Pix da InfinitePay (CSV ou OFX) contra as rifas pendentes.
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2.5 }}>
        {erro && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {erro}
          </Alert>
        )}

        {!resultado && (
          <ConciliacaoUploadDropzone
            analisando={analisando}
            onSelecionarArquivo={onSelecionarArquivo}
          />
        )}

        {resultado && (
          <Stack spacing={2.5}>
            <ConciliacaoResumoCards
              resumo={resultado.resumo}
              totalMatches={resultado.matches.length}
              quantidadeSelecionados={selecionados.size}
              valorTotalSelecionado={valorTotalSelecionado}
            />

            <ConciliacaoMatchesTable
              matches={resultado.matches}
              selecionados={selecionados}
              onToggleSelecao={onToggleSelecao}
              onToggleTodos={onToggleTodos}
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 2 }}>
        {resultado ? (
          <>
            <Button onClick={onLimpar} color="inherit" disabled={aprovando}>
              Trocar Extrato
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button onClick={onFechar} color="inherit" disabled={aprovando}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={onConfirmarAprovacao}
              disabled={selecionados.size === 0 || aprovando}
              sx={{
                bgcolor: colors.verdeEscuro,
                fontWeight: 800,
                "&:hover": { bgcolor: colors.verdeEscuroHover },
              }}
            >
              {aprovando ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={18} color="inherit" />
                  <span>Aprovando em Lote...</span>
                </Stack>
              ) : (
                `Aprovar ${selecionados.size} Vendas (${formatarMoeda(valorTotalSelecionado)})`
              )}
            </Button>
          </>
        ) : (
          <Button onClick={onFechar} color="inherit" disabled={analisando}>
            Fechar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
