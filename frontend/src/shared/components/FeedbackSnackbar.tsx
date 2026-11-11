import { Alert, type AlertColor, Snackbar } from "@mui/material";

/**
 * Propriedades do componente padronizado de notificação temporária (`Snackbar` + `Alert`).
 */
export interface FeedbackSnackbarProps {
  /** Controla a visibilidade do Snackbar. */
  open: boolean;
  /** Mensagem exibida dentro do alerta. */
  mensagem?: string | null;
  /** Severidade visual do alerta (padrão: `"success"`). */
  severidade?: AlertColor;
  /** Tempo em ms até fechar automaticamente (padrão: `4000`). */
  autoHideDuration?: number;
  /** Callback acionado ao fechar o Snackbar ou clicar no botão fechar do Alert. */
  onClose: () => void;
}

/**
 * Componente visual compartilhado para exibir mensagens de feedback transitório (sucesso, aviso ou erro).
 *
 * @param {FeedbackSnackbarProps} props - Propriedades de exibição e fechamento.
 * @returns {JSX.Element} Snackbar padronizado ancorado no rodapé central.
 */
export function FeedbackSnackbar({
  open,
  mensagem,
  severidade = "success",
  autoHideDuration = 4000,
  onClose,
}: FeedbackSnackbarProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        onClose={onClose}
        severity={severidade}
        variant="filled"
        sx={{ width: "100%", borderRadius: 2, fontWeight: 700 }}
      >
        {mensagem || ""}
      </Alert>
    </Snackbar>
  );
}
