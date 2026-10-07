import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useState } from "react";

import { TransacaoTesouraria } from "../../../types/auditoriaCompras";

interface AuditoriaCompraRecusaDialogProps {
  compra: TransacaoTesouraria | null;
  salvando: boolean;
  onClose: () => void;
  onConfirmar: (compra: TransacaoTesouraria, motivo: string) => void;
}

export function AuditoriaCompraRecusaDialog({
  compra,
  salvando,
  onClose,
  onConfirmar,
}: AuditoriaCompraRecusaDialogProps) {
  const [motivo, setMotivo] = useState("");

  if (!compra) return null;

  const handleConfirmar = () => {
    if (!motivo.trim()) return;
    onConfirmar(compra, motivo);
  };

  const handleExited = () => {
    setMotivo("");
  };

  return (
    <Dialog
      open={Boolean(compra)}
      onClose={salvando ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      TransitionProps={{
        onExited: handleExited,
      }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>Recusar Compra</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          margin="dense"
          label="Motivo da Recusa"
          type="text"
          fullWidth
          variant="outlined"
          multiline
          rows={3}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          disabled={salvando}
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={salvando} color="inherit">
          Cancelar
        </Button>
        <Button
          onClick={handleConfirmar}
          disabled={salvando || !motivo.trim()}
          color="error"
          variant="contained"
        >
          {salvando ? "Recusando..." : "Recusar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
