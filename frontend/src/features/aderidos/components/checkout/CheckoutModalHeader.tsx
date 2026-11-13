import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";

interface CheckoutModalHeaderProps {
  gerandoPix?: boolean;
  desabilitado?: boolean;
  onClose: () => void;
}

export function CheckoutModalHeader({
  gerandoPix = false,
  desabilitado = false,
  onClose,
}: CheckoutModalHeaderProps) {
  return (
    <Box
      sx={{
        px: 2.25,
        py: 2,
        borderBottom: "1px solid rgba(2, 27, 22, 0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box>
        <Typography
          component="h2"
          sx={{
            fontWeight: 950,
            color: colors.pretoEsverdeado,
            fontSize: "1.22rem",
            lineHeight: 1.15,
          }}
        >
          Finalizar venda
        </Typography>
      </Box>

      <IconButton
        onClick={onClose}
        disabled={gerandoPix || desabilitado}
        aria-label="Fechar modal de venda"
        sx={{
          bgcolor: "#F1F4F3",
          "&:focus-visible": {
            outline: "4px solid rgba(6, 61, 49, 0.24)",
            outlineOffset: "2px",
          },
          "&:hover": {
            bgcolor: "#E8EEEC",
          },
        }}
      >
        <CloseIcon />
      </IconButton>
    </Box>
  );
}
