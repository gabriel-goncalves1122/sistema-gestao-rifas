// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/FiltrosRifas.tsx
// ============================================================================
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  SxProps,
  TextField,
  Theme,
} from "@mui/material";

import { painelAderidoStyles } from "../styles/painelAderidoStyles";
import { FiltroRifasAderido } from "../types/painelAderido";
import {
  ContadoresRifas,
  FiltroRifasOpcao,
  montarOpcoesFiltroRifas,
} from "../utils/filtrosRifas";

interface FiltrosRifasProps {
  filtro: FiltroRifasAderido;
  contadores: ContadoresRifas;
  onChangeFiltro: (filtro: FiltroRifasAderido) => void;
  buscaNumero?: string;
  onChangeBuscaNumero?: (valor: string) => void;
}

function montarEstiloFiltro(
  ativo: boolean,
  item: FiltroRifasOpcao,
): SxProps<Theme> {
  // Mantém todos os filtros inativos com o padrão branco.
  if (!ativo) {
    return painelAderidoStyles.filtroChip;
  }

  return {
    ...(painelAderidoStyles.filtroChip as object),

    // O filtro ativo assume a cor semântica da categoria selecionada.
    bgcolor: item.bg,
    color: item.color,
    borderColor: item.border,
    boxShadow: "0 10px 22px rgba(2, 27, 22, 0.09)",

    "&:hover": {
      bgcolor: item.hoverBg,
      borderColor: item.border,
    },

    "& .MuiChip-label": {
      fontWeight: 900,
    },
  };
}

export function FiltrosRifas({
  filtro,
  contadores,
  onChangeFiltro,
  buscaNumero = "",
  onChangeBuscaNumero,
}: FiltrosRifasProps) {
  const filtros = montarOpcoesFiltroRifas(contadores, filtro);

  return (
    <Stack spacing={1.25}>
      {onChangeBuscaNumero && (
        <Box>
          <TextField
            size="small"
            fullWidth
            value={buscaNumero}
            onChange={(e) => onChangeBuscaNumero(e.target.value)}
            placeholder="Buscar nº da rifa ou comprador..."
            inputProps={{
              "aria-label": "Buscar número da rifa ou comprador",
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#5C6F68", fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: buscaNumero ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label="Limpar busca de rifa"
                    onClick={() => onChangeBuscaNumero("")}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2.5,
                bgcolor: "#FFFFFF",
                fontWeight: 700,
                fontSize: "0.92rem",
                "& fieldset": {
                  borderColor: "rgba(6, 61, 49, 0.16)",
                  borderWidth: "1.5px",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(6, 61, 49, 0.32)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#063D31",
                },
              },
            }}
          />
        </Box>
      )}

      <Stack
        direction="row"
        spacing={1}
        sx={painelAderidoStyles.filtrosContainer}
        role="tablist"
        aria-label="Filtros de rifas"
      >
        {filtros.map((item) => {
          const ativo = filtro === item.value;

          return (
            <Chip
              key={item.value}
              label={item.label}
              clickable
              role="tab"
              aria-label={item.label}
              aria-selected={ativo}
              tabIndex={ativo ? 0 : -1}
              onClick={() => onChangeFiltro(item.value)}
              sx={montarEstiloFiltro(ativo, item)}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}
