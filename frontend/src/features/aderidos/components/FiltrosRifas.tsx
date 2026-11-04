// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/FiltrosRifas.tsx
// ============================================================================
import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  SxProps,
  TextField,
  Theme,
  useMediaQuery,
} from "@mui/material";
import { LayoutGroup, motion } from "framer-motion";

import { painelAderidoStyles } from "../styles/painelAderidoStyles";
import { FiltroRifasAderido } from "../types/painelAderido";
import {
  ContadoresRifas,
  FiltroRifasOpcao,
  montarOpcoesFiltroRifas,
} from "../utils/filtrosRifas";

/**
 * Propriedades do componente de filtros da grelha de rifas.
 */
interface FiltrosRifasProps {
  /** Filtro atualmente selecionado */
  filtro: FiltroRifasAderido;
  /** Contadores consolidados por status */
  contadores: ContadoresRifas;
  /** Callback acionado ao trocar de categoria de filtro */
  onChangeFiltro: (filtro: FiltroRifasAderido) => void;
  /** Termo de busca textual opcional por número de rifa ou comprador */
  buscaNumero?: string;
  /** Callback para atualizar o termo de busca */
  onChangeBuscaNumero?: (valor: string) => void;
}

/**
 * Monta o estilo do chip de filtro de acordo com seu estado ativo/inativo.
 *
 * @param {boolean} ativo - Indica se o chip é o filtro selecionado.
 * @param {FiltroRifasOpcao} item - Metadados de estilização do filtro.
 * @returns {SxProps<Theme>} Objeto de estilização SX para o MUI.
 */
function montarEstiloFiltro(
  ativo: boolean,
  item: FiltroRifasOpcao,
): SxProps<Theme> {
  if (!ativo) {
    return {
      ...(painelAderidoStyles.filtroChip as object),
      position: "relative",
      zIndex: 1,
      transition: "background-color 0.2s ease, border-color 0.2s ease",
    };
  }

  return {
    ...(painelAderidoStyles.filtroChip as object),
    position: "relative",
    zIndex: 1,
    bgcolor: "transparent",
    color: item.color,
    borderColor: "transparent",
    boxShadow: "none",

    "&:hover": {
      bgcolor: "transparent",
      borderColor: "transparent",
    },

    "& .MuiChip-label": {
      fontWeight: 900,
    },
  };
}

/**
 * Filtros de categorias de rifas com busca rápida e segmented slider animado por hardware.
 * Utiliza Framer Motion com `layoutId` para deslizar suavemente o fundo da pílula ativa entre as abas.
 *
 * @param {FiltrosRifasProps} props - Propriedades do componente.
 * @returns {JSX.Element} Barra de busca e pílulas de filtro.
 */
export function FiltrosRifas({
  filtro,
  contadores,
  onChangeFiltro,
  buscaNumero = "",
  onChangeBuscaNumero,
}: FiltrosRifasProps) {
  const filtros = montarOpcoesFiltroRifas(contadores, filtro);
  const reduzirMovimento = useMediaQuery("(prefers-reduced-motion: reduce)");

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

      <LayoutGroup id="filtros-rifas-slider">
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
              <Box
                key={item.value}
                sx={{
                  position: "relative",
                  display: "inline-flex",
                  borderRadius: 2,
                }}
              >
                {ativo && (
                  <Box
                    component={motion.div}
                    layoutId="filtroAtivoPill"
                    transition={
                      reduzirMovimento
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 450, damping: 35 }
                    }
                    sx={{
                      position: "absolute",
                      inset: 0,
                      bgcolor: item.bg,
                      borderRadius: 2,
                      border: "1.5px solid",
                      borderColor: item.border,
                      boxShadow: "0 10px 22px rgba(2, 27, 22, 0.09)",
                      pointerEvents: "none",
                      zIndex: 0,
                    }}
                  />
                )}

                <Chip
                  label={item.label}
                  clickable
                  role="tab"
                  aria-label={item.label}
                  aria-selected={ativo}
                  tabIndex={ativo ? 0 : -1}
                  onClick={() => onChangeFiltro(item.value)}
                  sx={montarEstiloFiltro(ativo, item)}
                />
              </Box>
            );
          })}
        </Stack>
      </LayoutGroup>
    </Stack>
  );
}
