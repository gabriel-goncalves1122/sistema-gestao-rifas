import { Chip } from "@mui/material";

import { statusLabelAuditoria } from "../../../utils/auditoriaComprasFiltrosUtils";
import { statusSxAuditoria } from "../../../styles/auditoriaComprasStyles";

export function AuditoriaStatusChip({ status }: { status: string }) {
  return (
    <Chip
      label={statusLabelAuditoria(status)}
      size="small"
      sx={{
        ...statusSxAuditoria(status),
        height: 28,
        borderRadius: 2,
        fontWeight: 850,
        fontSize: "0.74rem",
      }}
    />
  );
}
