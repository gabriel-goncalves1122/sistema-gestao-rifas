import CloseIcon from "@mui/icons-material/Close";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { components } from "@/shared/tokens/components";

import { AuditoriaComprasFiltrosProps } from "../shared/auditoriaComprasFiltrosTypes";
import {
  AuditoriaFiltroDatas,
  AuditoriaFiltroStatusChips,
  AuditoriaFiltroOrigemChips,
  AuditoriaFiltroCorrecaoChip,
} from "../shared/AuditoriaFiltrosUtils";

/**
 * Painel de filtros avançados para a auditoria de compras no ambiente Desktop.
 * Oferece busca textual, intervalo de datas, status, canal de origem e pendência de correção.
 *
 * @param {AuditoriaComprasFiltrosProps} props - Propriedades do filtro.
 * @returns {JSX.Element} Painel de filtros desktop.
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
        p: { sm: 1.75, md: 2 },
        mb: 2.5,
        borderRadius: 2.25,
        bgcolor: colors.branco,
        border: `1px solid ${colors.borda}`,
        boxShadow: "0 12px 28px rgba(2, 27, 22, 0.05)",
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={2}
        >
          <Box>
            <Typography
              sx={{
                color: colors.textoForte,
                fontWeight: 950,
                fontSize: "1rem",
                lineHeight: 1.15,
              }}
            >
              Filtros da auditoria
            </Typography>
            <Typography sx={{ color: colors.textoSuave, fontSize: "0.84rem", mt: 0.3 }}>
              Localize uma compra por comprador, contato, vendedor, rifa ou ID Pix.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexShrink={0}>
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
                px: 1.5,
                "&:hover": { bgcolor: colors.verdeMaisEscuro },
                "&.Mui-disabled": {
                  bgcolor: colors.fundoVerdeSuave,
                  color: colors.textoSuave,
                },
              }}
            >
              Exportar CSV
            </Button>

            <Tooltip title="Exportação em lote de comprovantes será integrada na próxima etapa">
              <span>
                <Button
                  startIcon={<DownloadOutlinedIcon />}
                  disabled
                  sx={{
                    borderRadius: 2,
                    color: colors.verdeEscuro,
                    bgcolor: colors.fundoVerdeSuave,
                    fontWeight: 850,
                    textTransform: "none",
                    px: 1.5,
                  }}
                >
                  Exportar comprovantes
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              sm: "1fr 0.55fr 0.55fr",
              lg: "1.45fr 0.62fr 0.62fr",
            },
            gap: 1,
          }}
        >
          <TextField
            size="small"
            placeholder="Buscar comprador, CPF, e-mail, telefone ou rifa"
            value={filtros.busca}
            onChange={(event) =>
              onChangeFiltros({ ...filtros, busca: event.target.value })
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: colors.textoSuave }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: components.searchField.backgroundColor,
              },
            }}
          />

          <AuditoriaFiltroDatas
            filtros={filtros}
            onChangeFiltros={onChangeFiltros}
            bgColor={components.searchField.backgroundColor}
          />
        </Box>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          useFlexGap
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <AuditoriaFiltroStatusChips filtros={filtros} onChangeFiltros={onChangeFiltros} />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 24, alignSelf: "center" }} />

            <AuditoriaFiltroOrigemChips filtros={filtros} onChangeFiltros={onChangeFiltros} />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 24, alignSelf: "center" }} />

            <AuditoriaFiltroCorrecaoChip filtros={filtros} onChangeFiltros={onChangeFiltros} />
          </Stack>

          {filtrosAtivos && (
            <Button
              startIcon={<CloseIcon />}
              onClick={onLimparFiltros}
              sx={{
                borderRadius: 2,
                color: colors.verdeEscuro,
                fontWeight: 850,
                textTransform: "none",
              }}
            >
              Limpar filtros
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
