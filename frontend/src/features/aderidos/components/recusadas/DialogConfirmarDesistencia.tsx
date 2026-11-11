import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import type { GrupoRifasRecusadas } from "../../types/painelAderido";

/**
 * Propriedades do diálogo de confirmação de desistência de uma venda recusada.
 */
export interface DialogConfirmarDesistenciaProps {
  /** Grupo selecionado para desistência, ou `null` quando o diálogo está fechado. */
  grupo: GrupoRifasRecusadas | null;
  /** Indica se a requisição de liberação dos bilhetes está em andamento. */
  desistindo: boolean;
  /** Callback para fechar o diálogo sem confirmar. */
  onClose: () => void;
  /** Callback assíncrono para confirmar a liberação dos bilhetes da venda recusada. */
  onConfirmar: () => void;
}

/**
 * Modal de confirmação prévia para ação destrutiva de desistir de uma venda recusada
 * e retornar os bilhetes ao inventário disponível do aderido.
 *
 * @param {DialogConfirmarDesistenciaProps} props - Grupo selecionado e handlers de confirmação.
 * @returns {JSX.Element} Diálogo de confirmação.
 */
export function DialogConfirmarDesistencia({
  grupo,
  desistindo,
  onClose,
  onConfirmar,
}: DialogConfirmarDesistenciaProps) {
  return (
    <Dialog
      open={Boolean(grupo)}
      onClose={() => !desistindo && onClose()}
      PaperProps={{
        sx: { borderRadius: 3, p: 1 },
      }}
    >
      <DialogTitle sx={{ fontWeight: 900, color: colors.pretoEsverdeado }}>
        Liberar rifas para nova venda?
      </DialogTitle>
      <DialogContent>
        <DialogContentText
          sx={{ color: colors.cinzaTexto, fontWeight: 550, lineHeight: 1.5 }}
        >
          Ao desistir desta venda recusada, as rifas{" "}
          <strong style={{ color: colors.pretoEsverdeado }}>
            {grupo?.bilhetes.join(", ")}
          </strong>{" "}
          serão canceladas e voltarão a ficar disponíveis no seu inventário para
          serem vendidas a outro comprador.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ pb: 2, px: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={desistindo}
          sx={{
            fontWeight: 750,
            textTransform: "none",
            color: colors.cinzaTexto,
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirmar}
          disabled={desistindo}
          sx={{
            fontWeight: 850,
            borderRadius: 2,
            textTransform: "none",
            minWidth: 160,
          }}
        >
          {desistindo ? "Liberando..." : "Confirmar e liberar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
