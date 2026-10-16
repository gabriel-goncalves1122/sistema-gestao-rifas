import { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import { safeAreaStickyTop } from "@/shared/tokens/safeArea";
import { AuditoriaComprasFiltrosProps } from "../shared/auditoriaComprasFiltrosTypes";
import {
  AuditoriaFiltroDatas,
  AuditoriaFiltroStatusChips,
  AuditoriaFiltroOrigemChips,
  AuditoriaFiltroCorrecaoChip,
} from "../shared/AuditoriaFiltrosUtils";
import { colors } from "@/shared/tokens/colors";

/**
 * Painel de filtros compacto e adaptativo para dispositivos móveis,
 * com barra horizontal deslizante e gaveta inferior (bottom drawer) de opções avançadas.
 *
 * @param {AuditoriaComprasFiltrosProps} props - Propriedades de filtros e callbacks.
 * @returns {JSX.Element} Componente mobile de filtros.
 */
export function AuditoriaComprasFiltrosMobile({
  filtros,
  filtrosAtivos,
  possuiResultados,
  onChangeFiltros,
  onLimparFiltros,
  onExportarCsv,
}: AuditoriaComprasFiltrosProps) {
  const [aberto, setAberto] = useState(false);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.25,
        mb: 1.75,
        borderRadius: 2.25,
        bgcolor: colors.branco,
        border: "1px solid rgba(2, 27, 22, 0.10)",
        boxShadow: "0 10px 24px rgba(2, 27, 22, 0.06)",
        position: "sticky",
        ...safeAreaStickyTop,
        zIndex: 5,
      }}
    >
      <Stack spacing={1.2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar compra, rifa ou contato"
            value={filtros.busca}
            onChange={(event) =>
              onChangeFiltros({ ...filtros, busca: event.target.value })
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: colors.cinzaTexto }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: colors.fundoSuave,
              },
            }}
          />

          <IconButton
            aria-label="Abrir filtros de auditoria"
            onClick={() => setAberto((valor) => !valor)}
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: aberto || filtrosAtivos ? colors.verdeEscuro : colors.verdeClaro,
              color: aberto || filtrosAtivos ? colors.branco : colors.verdeEscuro,
              flexShrink: 0,
              "&:hover": {
                bgcolor: aberto || filtrosAtivos ? colors.verdeEscuroHover : colors.verdeHover,
              },
            }}
          >
            {aberto ? <ExpandMoreIcon /> : <TuneOutlinedIcon />}
          </IconButton>
        </Stack>

        <Box
          sx={{
            display: "flex",
            gap: 0.75,
            overflowX: "auto",
            pb: 0.25,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          <AuditoriaFiltroStatusChips filtros={filtros} onChangeFiltros={onChangeFiltros} />
          <AuditoriaFiltroOrigemChips filtros={filtros} onChangeFiltros={onChangeFiltros} />
          <AuditoriaFiltroCorrecaoChip filtros={filtros} onChangeFiltros={onChangeFiltros} />
        </Box>

        <Drawer
          anchor="bottom"
          open={aberto}
          onClose={() => setAberto(false)}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              p: 2,
              pb: "max(16px, env(safe-area-inset-bottom))",
            },
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ color: colors.verdeEscuro, fontWeight: 850 }}>
              Filtros Avançados
            </Typography>
            <IconButton onClick={() => setAberto(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Stack spacing={2}>
            <Typography
              sx={{
                color: colors.cinzaTexto,
                fontSize: "0.78rem",
                fontWeight: 850,
              }}
            >
              Refine por período, canal de pagamento e correções.
            </Typography>

            <AuditoriaFiltroDatas filtros={filtros} onChangeFiltros={onChangeFiltros} />

            <Typography
              sx={{
                color: colors.cinzaTexto,
                fontSize: "0.78rem",
                fontWeight: 850,
                mt: 1,
              }}
            >
              Canal de Pagamento
            </Typography>
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              <AuditoriaFiltroOrigemChips filtros={filtros} onChangeFiltros={onChangeFiltros} />
            </Box>

            <Typography
              sx={{
                color: colors.cinzaTexto,
                fontSize: "0.78rem",
                fontWeight: 850,
                mt: 1,
              }}
            >
              Pendências Cadastrais
            </Typography>
            <Box>
              <AuditoriaFiltroCorrecaoChip filtros={filtros} onChangeFiltros={onChangeFiltros} />
            </Box>

            <Divider sx={{ my: 1 }} />

            <Stack direction="row" spacing={1.5}>
              <Button
                fullWidth
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={() => {
                  onExportarCsv();
                  setAberto(false);
                }}
                disabled={!possuiResultados}
                sx={{
                  borderRadius: 2,
                  bgcolor: colors.verdeEscuro,
                  color: colors.branco,
                  fontWeight: 850,
                  textTransform: "none",
                  py: 1,
                  "&:hover": { bgcolor: colors.verdeEscuroHover },
                  "&.Mui-disabled": {
                    bgcolor: colors.verdeClaro,
                    color: colors.cinzaTexto,
                  },
                }}
              >
                Exportar CSV
              </Button>

              <Tooltip title="Exportação em lote de comprovantes será integrada na próxima etapa">
                <span style={{ flex: 1 }}>
                  <Button
                    fullWidth
                    startIcon={<DownloadOutlinedIcon />}
                    disabled
                    sx={{
                      borderRadius: 2,
                      color: colors.verdeEscuro,
                      bgcolor: colors.verdeClaro,
                      fontWeight: 850,
                      textTransform: "none",
                      py: 1,
                    }}
                  >
                    Comprovantes
                  </Button>
                </span>
              </Tooltip>
            </Stack>

            {filtrosAtivos && (
              <Button
                startIcon={<CloseIcon />}
                onClick={() => {
                  onLimparFiltros();
                  setAberto(false);
                }}
                sx={{
                  alignSelf: "stretch",
                  borderRadius: 2,
                  color: colors.verdeEscuro,
                  fontWeight: 850,
                  textTransform: "none",
                  mt: 1,
                }}
              >
                Limpar filtros
              </Button>
            )}

            <Button
              variant="contained"
              onClick={() => setAberto(false)}
              sx={{
                borderRadius: 2,
                bgcolor: colors.verdeEscuro,
                color: colors.branco,
                fontWeight: 850,
                textTransform: "none",
                py: 1.2,
                "&:hover": { bgcolor: colors.verdeEscuroHover },
              }}
            >
              Ver {possuiResultados ? "Resultados" : "Nenhum Resultado"}
            </Button>
          </Stack>
        </Drawer>
      </Stack>
    </Paper>
  );
}
