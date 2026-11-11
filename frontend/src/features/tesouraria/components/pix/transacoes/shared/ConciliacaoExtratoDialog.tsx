/**
 * Modal para upload de extrato bancário (InfinitePay) e conciliação em lote na validação de transações Pix.
 *
 * @module ConciliacaoExtratoDialog
 */
import React, { useRef } from "react";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { formatarMoeda } from "@/shared/utils/formatadores";

import {
  ItemMatchConciliacao,
  ResultadoAnaliseExtrato,
} from "../../../../types/conciliacaoExtrato";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelecionarArquivo(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onSelecionarArquivo(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const todosSelecionados =
    Boolean(resultado?.matches.length) &&
    selecionados.size === resultado?.matches.length;

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
          <Box
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            sx={{
              p: 5,
              border: `2px dashed ${colors.bordaDestaque}`,
              borderRadius: 3,
              textAlign: "center",
              bgcolor: colors.fundoSuave,
              cursor: "pointer",
              transition: "border 0.2s, background 0.2s",
              "&:hover": {
                bgcolor: colors.verdeHover,
                borderColor: colors.verdeForte,
              },
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".csv,.ofx"
              onChange={handleFileChange}
            />

            {analisando ? (
              <Stack spacing={2} alignItems="center">
                <CircularProgress size={44} sx={{ color: colors.verdeForte }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Cruzando transações do extrato com o sistema...
                </Typography>
                <Typography variant="body2" sx={{ color: colors.cinzaTexto }}>
                  Validando txids, identificadores bancários e similaridade de pagadores.
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={1.5} alignItems="center">
                <IconButton
                  sx={{
                    bgcolor: colors.verdeClaro,
                    color: colors.verdeForte,
                    width: 60,
                    height: 60,
                  }}
                >
                  <CloudUploadOutlinedIcon sx={{ fontSize: 32 }} />
                </IconButton>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: colors.verdeEscuro }}>
                  Clique para selecionar ou arraste o extrato aqui
                </Typography>
                <Typography variant="body2" sx={{ color: colors.cinzaTexto, maxWidth: 450 }}>
                  Extratos exportados pelo aplicativo ou painel web da <strong>InfinitePay</strong> (formato <strong>.CSV</strong> ou <strong>.OFX</strong>).
                </Typography>
              </Stack>
            )}
          </Box>
        )}

        {resultado && (
          <Stack spacing={2.5}>
            {/* Cards de Resumo */}
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    border: `1px solid ${colors.borda}`,
                    borderRadius: 2,
                    bgcolor: colors.verdeClaro,
                  }}
                >
                  <Typography variant="caption" sx={{ color: colors.verdeForte, fontWeight: 700 }}>
                    MATCHES EXATOS (TXID)
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: colors.verdeEscuro }}>
                    {resultado.resumo.totalMatchesExatos}
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.cinzaTexto }}>
                    Identificação 100% garantida
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    border: `1px solid ${colors.borda}`,
                    borderRadius: 2,
                    bgcolor: colors.alertaSuave,
                  }}
                >
                  <Typography variant="caption" sx={{ color: colors.alertaTexto, fontWeight: 700 }}>
                    MATCHES SUGERIDOS
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: colors.alertaTextoForte }}>
                    {resultado.resumo.totalMatchesAproximados}
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.cinzaTexto }}>
                    Comprador ou Aderido similar
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    border: `1px solid ${colors.borda}`,
                    borderRadius: 2,
                    bgcolor: colors.fundoSuave,
                  }}
                >
                  <Typography variant="caption" sx={{ color: colors.cinzaTexto, fontWeight: 700 }}>
                    TOTAL SELECIONADO
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: colors.verdeForte }}>
                    {formatarMoeda(valorTotalSelecionado)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.cinzaTexto }}>
                    {selecionados.size} de {resultado.matches.length} matches
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Tabela de Matches */}
            {resultado.matches.length === 0 ? (
              <Alert severity="warning">
                Nenhuma compra pendente pôde ser conciliada com as transações deste extrato.
              </Alert>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${colors.borda}`, maxHeight: 360 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: colors.fundoSuave }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={todosSelecionados}
                          indeterminate={selecionados.size > 0 && !todosSelecionados}
                          onChange={onToggleTodos}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Tipo de Match</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Comprador / Rifas</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Pagador no Banco</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Valor</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultado.matches.map((item: ItemMatchConciliacao) => {
                      const isSelected = selecionados.has(item.pagamentoId);
                      const isExato = item.tipoMatch === "TXID_EXATO" || item.tipoMatch === "E2E_EXATO";
                      const isAderido = item.alvoMatch === "ADERIDO";

                      return (
                        <TableRow
                          key={item.pagamentoId}
                          hover
                          selected={isSelected}
                          onClick={() => onToggleSelecao(item.pagamentoId)}
                          sx={{ cursor: "pointer" }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox checked={isSelected} />
                          </TableCell>
                          <TableCell>
                            {isExato ? (
                              <Chip
                                size="small"
                                icon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
                                label="Exato (txid)"
                                sx={{
                                  bgcolor: colors.verdeClaro,
                                  color: colors.verdeForte,
                                  fontWeight: 700,
                                }}
                              />
                            ) : (
                              <Chip
                                size="small"
                                icon={<HelpOutlineIcon sx={{ fontSize: 16 }} />}
                                label={
                                  isAderido
                                    ? `Pago por Aderido`
                                    : `Nome similar (${Math.round(item.confianca * 100)}%)`
                                }
                                sx={{
                                  bgcolor: colors.alertaSuave,
                                  color: colors.alertaTexto,
                                  fontWeight: 700,
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {item.compradorNome}
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.cinzaTexto }}>
                              {item.numerosRifas.length} rifa(s): {item.numerosRifas.join(", ")}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {item.nomePagadorBanco}
                            </Typography>
                            {isAderido && item.vendedorNome && (
                              <Typography variant="caption" sx={{ color: colors.alertaTexto }}>
                                Repasse do Aderido: {item.vendedorNome}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 800, color: colors.verdeEscuro }}>
                              {formatarMoeda(item.valorBanco)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
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
