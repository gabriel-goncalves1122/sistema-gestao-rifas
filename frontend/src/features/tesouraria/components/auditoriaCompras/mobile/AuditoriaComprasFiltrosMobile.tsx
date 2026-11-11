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
                  "&:hover": { bgcolor: colors.verdeMaisEscuro },
                  "&.Mui-disabled": {
                    bgcolor: colors.fundoVerdeSuave,
                    color: colors.textoSuave,
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
            gap: 0.75,
            alignItems: "center",
            overflowX: "auto",
            pb: 0.5,
            pt: 0.25,
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
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

        {/* Linha 3: Limpar Filtros Isolado */}
        {filtrosAtivos && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              pt: 0.5,
              borderTop: "1px dashed rgba(2, 27, 22, 0.08)",
            }}
          >
            <Button
              size="small"
              onClick={onLimparFiltros}
              startIcon={<CloseIcon fontSize="small" />}
              sx={{
                color: colors.vermelhoTexto,
                fontWeight: 900,
                textTransform: "none",
                fontSize: "0.78rem",
                py: 0.25,
                px: 1,
                borderRadius: 1.5,
                bgcolor: "rgba(155, 28, 28, 0.05)",
                "&:hover": {
                  bgcolor: "rgba(155, 28, 28, 0.12)",
                },
              }}
            >
              Limpar filtros ativos
            </Button>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
