import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";

/**
 * Propriedades do diálogo de confirmação de cancelamento e liberação de rifas.
 */
export interface CheckoutCancelarReservaDialogProps {
  /** Se o modal de confirmação está visível */
  open: boolean;
  /** Se há operação de cancelamento assíncrona em andamento */
  cancelando?: boolean;
  /** Callback para confirmar o cancelamento da cobrança e liberação dos bilhetes */
  onConfirmar: () => void;
  /** Callback para desistir do cancelamento e permanecer no pagamento */
  onVoltar: () => void;
}

/**
 * Diálogo de confirmação exibido quando o aderido tenta fechar o modal de checkout
 * com uma cobrança Pix pendente, prevenindo rifas presas em reserva indefinida.
 *
 * @param {CheckoutCancelarReservaDialogProps} props - Propriedades do componente.
 * @returns {JSX.Element} Diálogo de confirmação.
 */
export function CheckoutCancelarReservaDialog({
  open,
  cancelando = false,
  onConfirmar,
  onVoltar,
}: CheckoutCancelarReservaDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={cancelando ? undefined : onVoltar}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            p: 1,
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 900,
          color: colors.pretoEsverdeado,
          fontSize: "1.1rem",
          pb: 1,
        }}
      >
        Cancelar cobrança Pix?
      </DialogTitle>

      <DialogContent>
        <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.9rem", lineHeight: 1.5 }}>
          Se você fechar a janela agora, a cobrança Pix ativa será cancelada e as rifas selecionadas serão liberadas imediatamente para outros compradores.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
        <Button
          onClick={onVoltar}
          disabled={cancelando}
          variant="outlined"
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
            color: colors.cinzaTexto,
            borderColor: colors.borda,
          }}
        >
          Continuar no Pagamento
        </Button>

        <Button
          onClick={onConfirmar}
          disabled={cancelando}
          variant="contained"
          startIcon={cancelando ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 800,
            bgcolor: colors.erroForte,
            color: colors.branco,
            "&:hover": { bgcolor: colors.alertaTexto },
          }}
        >
          {cancelando ? "Cancelando..." : "Cancelar e Liberar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
