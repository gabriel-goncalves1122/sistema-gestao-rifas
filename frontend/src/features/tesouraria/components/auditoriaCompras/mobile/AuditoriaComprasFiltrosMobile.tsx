import CloseIcon from "@mui/icons-material/Close";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import SearchIcon from "@mui/icons-material/Search";
import SyncAltOutlinedIcon from "@mui/icons-material/SyncAltOutlined";
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";

import { safeAreaStickyTop } from "@/shared/tokens/safeArea";
import { AuditoriaComprasFiltrosProps } from "../shared/auditoriaComprasFiltrosTypes";
import {
  AuditoriaFiltroStatusChips,
  AuditoriaFiltroOrigemChips,
  AuditoriaFiltroCorrecaoChip,
} from "../shared/AuditoriaFiltrosUtils";
import { colors } from "@/shared/tokens/colors";

/**
 * Painel de filtros compacto e moderno para dispositivos móveis na auditoria de compras,
 * com linhas de chips 100% livres (sem sobreposição do botão de limpar).
 *
 * @param {AuditoriaComprasFiltrosProps} props - Propriedades de filtros e callbacks.
 * @returns {JSX.Element} Componente mobile de filtros.
 */
export function AuditoriaComprasFiltrosMobile({
  filtros,
  filtrosAtivos,
  possuiResultados,
  contagens,
  onChangeFiltros,
  onLimparFiltros,
  onExportarCsv,
  onAbrirConciliacao,
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

          {onAbrirConciliacao && (
            <Tooltip title="Conciliar Extrato">
              <IconButton
                aria-label="Conciliar Extrato"
                onClick={onAbrirConciliacao}
                sx={{
                  border: `1px solid ${colors.verdeForte}`,
                  color: colors.verdeForte,
                  borderRadius: 2,
                  "&:hover": { bgcolor: "rgba(11, 122, 97, 0.08)" },
                }}
              >
                <SyncAltOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

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

        {/* Linha 1: Status Financeiro */}
        <Box
          sx={{
            display: "flex",
            gap: 0.75,
            overflowX: "auto",
            pb: 0.5,
            pt: 0.25,
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
          }}
        >
          <AuditoriaFiltroStatusChips
            filtros={filtros}
            contagens={contagens}
            onChangeFiltros={onChangeFiltros}
          />
        </Box>

        {/* Linha 2: Origem e Correção */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            pt: 0.25,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              overflowX: "auto",
              minWidth: 0,
              flex: 1,
              "&::-webkit-scrollbar": { display: "none" },
              scrollbarWidth: "none",
            }}
          >
            <AuditoriaFiltroOrigemChips
              filtros={filtros}
              onChangeFiltros={onChangeFiltros}
            />
            <AuditoriaFiltroCorrecaoChip
              filtros={filtros}
              contagens={contagens}
              onChangeFiltros={onChangeFiltros}
            />
          </Box>

          {filtrosAtivos && (
            <Chip
              size="small"
              label="Limpar"
              onDelete={onLimparFiltros}
              onClick={onLimparFiltros}
              sx={{
                flexShrink: 0,
                height: 26,
                fontWeight: 800,
                fontSize: "0.72rem",
                bgcolor: "rgba(11, 122, 97, 0.08)",
                color: colors.verdeEscuro,
                border: "1px solid rgba(11, 122, 97, 0.2)",
                "& .MuiChip-deleteIcon": {
                  color: colors.verdeEscuro,
                  fontSize: 14,
                  "&:hover": { color: colors.verdeEscuro },
                },
              }}
            />
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
