import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { IconButton, InputAdornment, TextField } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { components } from "@/shared/tokens/components";

import { PixTransacoesFiltrosProps } from "./pixTransacoesFiltrosTypes";

/**
 * Campo de busca textual por termos da transação Pix (comprador, CPF, telefone, e-mail, aderido ou rifa).
 *
 * @param {PixTransacoesFiltrosProps} props - Propriedades dos filtros.
 * @returns {JSX.Element} Campo de texto estilisado com adornos de busca e limpeza.
 */
export function PixTransacoesCampoBusca({
  filtros,
  onChangeFiltros,
}: PixTransacoesFiltrosProps) {
  return (
    <TextField
      fullWidth
      size="small"
      placeholder="Buscar Pix"
      value={filtros.busca}
      onChange={(event) =>
        onChangeFiltros({ ...filtros, busca: event.target.value })
      }
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ color: colors.textoSuave, fontSize: 20 }} />
          </InputAdornment>
        ),
        endAdornment: filtros.busca ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              aria-label="Limpar termo de busca"
              onClick={() => onChangeFiltros({ ...filtros, busca: "" })}
              sx={{ color: colors.textoSuave }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: 2.25,
          bgcolor: components.searchField.backgroundColor,
          border: "1px solid rgba(2, 27, 22, 0.08)",
          transition: "all 0.15s ease",
          "&:hover": {
            borderColor: "rgba(11, 122, 97, 0.3)",
          },
          "&.Mui-focused": {
            borderColor: colors.verdeEscuro,
            boxShadow: "0 0 0 3px rgba(11, 122, 97, 0.12)",
          },
        },
      }}
    />
  );
}
