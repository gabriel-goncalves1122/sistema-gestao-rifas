// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/StatusRifasHelpDialog.tsx
// ============================================================================
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

import { painelAderidoStyles } from "../styles/painelAderidoStyles";

interface StatusRifasHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const STATUS_AJUDA = [
  {
    label: "Disponível",
    description: "Pode ser selecionada para uma nova venda.",
    color: "#FFFFFF",
    border: "#9FCABD",
  },
  {
    label: "Selecionada",
    description: "Está no seu carrinho atual e será enviada na venda.",
    color: "#063D31",
    border: "#063D31",
  },
  {
    label: "Em análise",
    description: "O pagamento aguarda validação da tesouraria.",
    color: "#FFF4D8",
    border: "#CBA64D",
  },
  {
    label: "Paga",
    description:
      "A venda foi aprovada pela tesouraria. Clique para ver detalhes.",
    color: "#EAF7EF",
    border: "#85C89F",
  },
  {
    label: "Paga (revisão de dados)",
    description:
      "Pagamento aprovado, mas a tesouraria solicitou correção no cadastro do comprador.",
    color: "#EAF7EF",
    border: "#CBA64D",
  },
  {
    label: "Negada",
    description: "A venda precisa de correção antes de seguir.",
    color: "#FBEAEA",
    border: "#CC8282",
  },
];

export function StatusRifasHelpDialog({
  open,
  onClose,
}: StatusRifasHelpDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={painelAderidoStyles.statusHelpDialogTitle}>
        Entenda os status
      </DialogTitle>

      <DialogContent sx={painelAderidoStyles.statusHelpDialogContent}>
        <Box sx={painelAderidoStyles.statusHelpList}>
          {STATUS_AJUDA.map((status) => (
            <Box key={status.label} sx={painelAderidoStyles.statusHelpItem}>
              <Box
                sx={{
                  ...painelAderidoStyles.statusHelpDot,
                  bgcolor: status.color,
                  borderColor: status.border,
                }}
              />

              <Box>
                <Typography sx={painelAderidoStyles.statusHelpLabel}>
                  {status.label}
                </Typography>

                <Typography
                  variant="body2"
                  sx={painelAderidoStyles.statusHelpDescription}
                >
                  {status.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 800,
            bgcolor: "#063D31",

            "&:hover": {
              bgcolor: "#021B16",
            },
          }}
        >
          Entendi
        </Button>
      </DialogActions>
    </Dialog>
  );
}
