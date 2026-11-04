import CloseIcon from "@mui/icons-material/Close";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import SearchIcon from "@mui/icons-material/Search";
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
            placeholder="Nome do comprador ou nº da rifa"
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
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: colors.fundoSuave,
              },
            }}
          />

          <Tooltip title="Exportar CSV">
            <span>
              <IconButton
                aria-label="Exportar CSV"
                onClick={onExportarCsv}
                disabled={!possuiResultados}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: colors.verdeEscuro,
                  color: colors.branco,
                  flexShrink: 0,
                  "&:hover": {
                    bgcolor: colors.verdeEscuroHover,
                  },
                  "&.Mui-disabled": {
                    bgcolor: colors.verdeClaro,
                    color: colors.cinzaTexto,
                  },
                }}
              >
                <FileDownloadOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {filtrosAtivos && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
          >
            <Chip
              label="Filtro ativo"
              size="small"
              sx={{
                height: 26,
                borderRadius: 1.75,
                color: colors.verdeEscuro,
                bgcolor: "rgba(11, 122, 97, 0.10)",
                border: "1px solid rgba(6, 61, 49, 0.12)",
                fontWeight: 800,
                fontSize: "0.72rem",
              }}
            />

            <Button
              type="button"
              size="small"
              aria-label="Limpar filtros"
              startIcon={<CloseIcon fontSize="small" />}
              onClick={onLimparFiltros}
              sx={{
                flexShrink: 0,
                borderRadius: 2,
                color: colors.verdeEscuro,
                bgcolor: "rgba(11, 122, 97, 0.08)",
                border: "1px solid rgba(6, 61, 49, 0.14)",
                fontWeight: 850,
                textTransform: "none",
                fontSize: "0.75rem",
                px: 1.2,
                py: 0.2,
                "&:hover": {
                  bgcolor: "rgba(11, 122, 97, 0.16)",
                },
              }}
            >
              Limpar filtros
            </Button>
          </Stack>
        )}

        {/* Linha 1 de Chips: Status com contadores numéricos (100% da largura) */}
        <Box
          sx={{
            display: "flex",
            width: "100%",
            gap: 0.75,
            overflowX: "auto",
            overscrollBehaviorX: "contain",
            WebkitOverflowScrolling: "touch",
            py: 0.2,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          <AuditoriaFiltroStatusChips
            filtros={filtros}
            contagens={contagens}
            onChangeFiltros={onChangeFiltros}
          />
        </Box>

        {/* Linha 2 de Chips: Toggles de Canal (Pix / Comprovante) e Correção (100% da largura sem sobreposição) */}
        <Box
          sx={{
            display: "flex",
            width: "100%",
            gap: 0.75,
            overflowX: "auto",
            overscrollBehaviorX: "contain",
            WebkitOverflowScrolling: "touch",
            py: 0.15,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          <AuditoriaFiltroOrigemChips
            filtros={filtros}
            contagens={contagens}
            onChangeFiltros={onChangeFiltros}
          />
          <AuditoriaFiltroCorrecaoChip
            filtros={filtros}
            contagens={contagens}
            onChangeFiltros={onChangeFiltros}
          />
        </Box>
      </Stack>
    </Paper>
  );
}
