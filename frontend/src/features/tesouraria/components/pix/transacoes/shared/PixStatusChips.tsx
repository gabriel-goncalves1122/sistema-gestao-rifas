import { Chip } from "@mui/material";

import {
  StatusPagamentoPix,
} from "../../../../types/pixTransacoes";
import { obterLabelStatusPagamento } from "../../../../utils/pixTransacoesStatusUtils";

interface StatusPagamentoChipProps {
  status: StatusPagamentoPix;
}

const PAGAMENTO_STYLES: Record<
  StatusPagamentoPix,
  { color: string; bgcolor: string; border: string }
> = {
  WAITING: {
    color: "#6B4E00",
    bgcolor: "#FFF1CC",
    border: "1px solid rgba(143, 104, 0, 0.34)",
  },
  PAID: {
    color: "#FFFFFF",
    bgcolor: "#063D31",
    border: "1px solid #063D31",
  },
  AUTHORIZED: {
    color: "#FFFFFF",
    bgcolor: "#0B6B57",
    border: "1px solid #0B6B57",
  },
  IN_ANALYSIS: {
    color: "#4E3B00",
    bgcolor: "#FFF1CC",
    border: "1px solid rgba(143, 104, 0, 0.25)",
  },
  DECLINED: {
    color: "#7A1F1F",
    bgcolor: "#FDF0F0",
    border: "1px solid rgba(122, 31, 31, 0.22)",
  },
  CANCELED: {
    color: "#526760",
    bgcolor: "#F6F8F7",
    border: "1px solid rgba(2, 27, 22, 0.10)",
  },
};

function chipSx(estilo: { color: string; bgcolor: string; border: string }) {
  return {
    height: 28,
    borderRadius: 2,
    fontWeight: 850,
    fontSize: "0.74rem",
    color: estilo.color,
    bgcolor: estilo.bgcolor,
    border: estilo.border,
    "& .MuiChip-label": {
      px: 1,
    },
  };
}

export function StatusPagamentoChip({ status }: StatusPagamentoChipProps) {
  const estilo = PAGAMENTO_STYLES[status];

  return (
    <Chip
      label={obterLabelStatusPagamento(status)}
      size="small"
      sx={chipSx(estilo)}
    />
  );
}
