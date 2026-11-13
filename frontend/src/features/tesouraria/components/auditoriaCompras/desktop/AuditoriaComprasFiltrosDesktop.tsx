import CloseIcon from "@mui/icons-material/Close";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";

import { AuditoriaComprasFiltrosProps } from "../shared/auditoriaComprasFiltrosTypes";

/**
 * Barra de busca e exportação da auditoria de compras no ambiente Desktop.
 * Focado em busca por nome do comprador ou número da rifa (compras pagas).
 *
 * @param {AuditoriaComprasFiltrosProps} props - Propriedades da barra de busca.
 * @returns {JSX.Element} Painel de busca desktop.
 */
export function AuditoriaComprasFiltrosDesktop({
  filtros,
  filtrosAtivos,
  possuiResultados,
  onChangeFiltros,
  onLimparFiltros,
  onExportarCsv,
}: AuditoriaComprasFiltrosProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { sm: 2, md: 2.25 },
        mb: 2,
        borderRadius: 2.75,
        bgcolor: colors.branco,
        border: `1px solid ${colors.borda}`,
        boxShadow: "0 8px 24px rgba(2, 27, 22, 0.04)",
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={2}
          flexWrap="wrap"
        >
          <Box>
            <Typography
              sx={{
                color: colors.pretoEsverdeado,
                fontWeight: 950,
                fontSize: "1rem",
                lineHeight: 1.2,
              }}
            >
              Buscar compras pagas
            </Typography>
            <Typography
              sx={{ color: colors.cinzaTexto, fontSize: "0.82rem", mt: 0.25 }}
            >
              Localize uma compra paga pelo nome do comprador ou número da rifa.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
            {filtrosAtivos && (
              <Button
                size="small"
                startIcon={<CloseIcon fontSize="small" />}
                onClick={onLimparFiltros}
                sx={{
                  borderRadius: 2,
                  color: colors.verdeEscuro,
                  fontWeight: 850,
                  textTransform: "none",
                  fontSize: "0.82rem",
                  px: 1.25,
                  "&:hover": {
                    bgcolor: "rgba(11, 122, 97, 0.08)",
                  },
                }}
              >
                Limpar filtros
              </Button>
            )}

            <Button
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={onExportarCsv}
              disabled={!possuiResultados}
              sx={{
                borderRadius: 2,
                bgcolor: colors.verdeEscuro,
                color: colors.branco,
                fontWeight: 850,
                textTransform: "none",
                px: 1.75,
                py: 0.75,
                "&:hover": { bgcolor: colors.verdeEscuroHover },
                "&.Mui-disabled": {
                  bgcolor: colors.verdeClaro,
                  color: colors.cinzaDisabled,
                },
              }}
            >
              Exportar CSV
            </Button>
          </Stack>
        </Stack>

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
                <SearchIcon sx={{ color: colors.cinzaIcone }} />
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
      </Stack>
    </Paper>
  );
}
