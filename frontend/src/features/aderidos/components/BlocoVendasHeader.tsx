// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/BlocoVendasHeader.tsx
// ============================================================================
import { useState } from "react";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";

import { painelAderidoStyles } from "../styles/painelAderidoStyles";
import { StatusRifasHelpDialog } from "./StatusRifasHelpDialog";

interface BlocoVendasHeaderProps {
  totalRifasVisiveis?: number;
}

export function BlocoVendasHeader({ totalRifasVisiveis }: BlocoVendasHeaderProps) {
  const [ajudaAberta, setAjudaAberta] = useState(false);

  return (
    <Box sx={painelAderidoStyles.blocoVendasHeader}>
      <Box sx={painelAderidoStyles.blocoVendasTituloLinha}>
        <Typography sx={painelAderidoStyles.blocoVendasTitulo}>
          Suas rifas
        </Typography>

        {typeof totalRifasVisiveis === "number" && (
          <Chip
            label={`${totalRifasVisiveis} na lista`}
            size="small"
            sx={painelAderidoStyles.blocoVendasContador}
          />
        )}

        <Tooltip title="Toque nas rifas disponíveis para selecionar. Rifas pagas podem ser abertas para consulta.">
          <IconButton
            size="small"
            onClick={() => setAjudaAberta(true)}
            sx={{ color: "#0B2F24" }}
          >
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <StatusRifasHelpDialog
        open={ajudaAberta}
        onClose={() => setAjudaAberta(false)}
      />
    </Box>
  );
}
