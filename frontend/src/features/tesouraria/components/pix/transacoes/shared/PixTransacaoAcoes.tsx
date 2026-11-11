import { useState } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { Button, IconButton, CircularProgress, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Typography, TextField } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { PixTransacao } from "../../../../types/pixTransacoes";
import { podeValidarPixTransacao } from "../../../../utils/pixTransacoesUtils";

interface PixTransacaoAcoesProps {
  transacao: PixTransacao;
  onConcluido?: () => void;
  compact?: boolean;
  onAceitar: (id: string, chaveAcao?: string) => Promise<void>;
  onNegar: (id: string, motivo: string, chaveAcao?: string) => Promise<void>;
}

export function PixTransacaoAcoes({ transacao, onConcluido, compact = false, onAceitar, onNegar }: PixTransacaoAcoesProps) {
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<"aceitar" | "negar" | null>(null);
  const [modalNegarOpen, setModalNegarOpen] = useState(false);
  const [motivoNegar, setMotivoNegar] = useState("");

  if (!podeValidarPixTransacao(transacao)) {
    return null;
  }

  const handleAceitar = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAcaoEmAndamento("aceitar");
    try {
      await onAceitar(transacao.id, transacao.chaveAcao);
      onConcluido?.();
    } catch (error) {
      // erro já tratado no hook/service
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  const handleAbrirNegar = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setModalNegarOpen(true);
  };

  const handleNegarConfirmar = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!motivoNegar.trim()) return;
    
    setAcaoEmAndamento("negar");
    setModalNegarOpen(false);
    try {
      await onNegar(transacao.id, motivoNegar, transacao.chaveAcao);
      onConcluido?.();
    } catch (error) {
      // erro já tratado
    } finally {
      setAcaoEmAndamento(null);
      setMotivoNegar("");
    }
  };

  return (
    <>
      <Stack direction="row" spacing={compact ? 1 : 2} onClick={(e) => e.stopPropagation()}>
        {compact ? (
          <>
            <IconButton
              size="small"
              disabled={acaoEmAndamento !== null}
              onClick={handleAbrirNegar}
              sx={{ color: colors.alertaTexto, bgcolor: colors.alertaFundo, "&:hover": { bgcolor: colors.alertaBorda } }}
            >
              {acaoEmAndamento === "negar" ? <CircularProgress size={16} color="inherit" /> : <CancelIcon fontSize="small" />}
            </IconButton>
            <IconButton
              size="small"
              disabled={acaoEmAndamento !== null}
              onClick={handleAceitar}
              sx={{ color: colors.verdeEscuro, bgcolor: colors.verdeClaro, "&:hover": { bgcolor: colors.verdeHover } }}
            >
              {acaoEmAndamento === "aceitar" ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon fontSize="small" />}
            </IconButton>
          </>
        ) : (
          <>
            <Button
              variant="contained"
              disabled={acaoEmAndamento !== null}
              onClick={handleAbrirNegar}
              startIcon={acaoEmAndamento === "negar" ? <CircularProgress size={16} color="inherit" /> : <CancelIcon />}
              sx={{
                bgcolor: colors.alertaFundo,
                color: colors.alertaTexto,
                boxShadow: "none",
                "&:hover": {
                  bgcolor: colors.alertaBorda,
                  boxShadow: "none",
                },
              }}
            >
              Negar
            </Button>
            <Button
              variant="contained"
              disabled={acaoEmAndamento !== null}
              onClick={handleAceitar}
              startIcon={acaoEmAndamento === "aceitar" ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
              sx={{
                bgcolor: colors.verdeEscuro,
                color: colors.branco,
                boxShadow: "none",
                "&:hover": {
                  bgcolor: colors.verdeHover,
                  boxShadow: "none",
                },
              }}
            >
              Aceitar Pagamento
            </Button>
          </>
        )}
      </Stack>

      <Dialog open={modalNegarOpen} onClose={() => setModalNegarOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Negar Pagamento</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, color: colors.cinzaTexto }}>
            Tem certeza que deseja negar o pagamento validado pelo banco para a transação <b>{transacao.id}</b>?
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Motivo da recusa"
            value={motivoNegar}
            onChange={(e) => setMotivoNegar(e.target.value)}
            multiline
            rows={3}
            placeholder="Ex: Comprovante inválido, divergência de valor..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setModalNegarOpen(false)} sx={{ color: colors.cinzaTexto }}>
            Cancelar
          </Button>
          <Button
            onClick={handleNegarConfirmar}
            disabled={!motivoNegar.trim()}
            variant="contained"
            sx={{ bgcolor: colors.alertaTexto, color: colors.branco, "&:hover": { bgcolor: "#900" } }}
          >
            Confirmar Recusa
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
