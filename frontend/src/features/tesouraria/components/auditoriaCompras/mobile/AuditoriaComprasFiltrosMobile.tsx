import CloseIcon from "@mui/icons-material/Close";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";

import { safeAreaStickyTop } from "@/shared/tokens/safeArea";
import { AuditoriaComprasFiltrosProps } from "../shared/auditoriaComprasFiltrosTypes";
import { colors } from "@/shared/tokens/colors";

/**
 * Barra de busca e exportação compacta para dispositivos móveis na auditoria de compras pagas.
 *
 * @param {AuditoriaComprasFiltrosProps} props - Propriedades de busca e exportação.
 * @returns {JSX.Element} Componente mobile de busca.
 */
export function AuditoriaComprasFiltrosMobile({
  filtros,
  possuiResultados,
  onChangeFiltros,
  onExportarCsv,
}: AuditoriaComprasFiltrosProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        mb: 1.5,
        maxWidth: "100%",
        overflow: "hidden",
        borderRadius: 2.5,
        bgcolor: colors.branco,
        border: "1px solid rgba(2, 27, 22, 0.08)",
        boxShadow: "0 6px 18px rgba(2, 27, 22, 0.04)",
        position: "sticky",
        ...safeAreaStickyTop,
        zIndex: 5,
      }}
    >
      <Stack spacing={1.15} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por nome do comprador ou nº da rifa..."
            value={filtros.busca}
            onChange={(event) =>
              onChangeFiltros({ ...filtros, busca: event.target.value })
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: colors.cinzaTexto, fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: filtros.busca ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label="Limpar busca"
                    onClick={() => onChangeFiltros({ ...filtros, busca: "" })}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            }}
          />

          <Tooltip title="Exportar CSV">
            <span>
              <IconButton
                aria-label="Exportar CSV"
                disabled={!possuiResultados}
                onClick={onExportarCsv}
                sx={{
                  bgcolor: colors.verdeEscuro,
                  color: colors.branco,
                  borderRadius: 2,
                  "&:hover": { bgcolor: colors.verdeEscuroHover },
                  "&.Mui-disabled": {
                    bgcolor: colors.verdeClaro,
                    color: colors.cinzaDisabled,
                  },
                }}
              >
                <FileDownloadOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
}
