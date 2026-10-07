import { Chip } from "@mui/material";

import { PixTransacao } from "../../../../types/pixTransacoes";
import {
  obterStatusValidacaoUI,
  obterVisualStatusValidacaoUI,
} from "../../../../utils/pixValidacaoUtils";

interface PixValidacaoChipProps {
  transacao: PixTransacao;
}

export function PixValidacaoChip({ transacao }: PixValidacaoChipProps) {
  const status = obterStatusValidacaoUI(transacao);
  const visual = obterVisualStatusValidacaoUI(status);

  return (
    <Chip
      label={visual.label}
      size="small"
      sx={{
        height: 28,
        borderRadius: 2,
        fontWeight: 850,
        fontSize: "0.74rem",
        color: visual.color,
        bgcolor: visual.bgcolor,
        border: visual.border,
        "& .MuiChip-label": {
          px: 1,
        },
      }}
    />
  );
}
