import CloseIcon from "@mui/icons-material/Close";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { PixTransacoesCampoBusca } from "./PixTransacoesCampoBusca";
import { PixTransacoesFiltrosChips } from "./PixTransacoesFiltrosChips";
import { PixTransacoesFiltrosProps } from "./pixTransacoesFiltrosTypes";

/**
 * Painel de filtros de validação de transações Pix para o ambiente Desktop.
 * Oferece cabeçalho explicativo, contador de resultados, campo de busca com debounce
 * e chips com badges numéricos de status.
 */
export function PixTransacoesFiltrosDesktop({
  filtros,
  onChangeFiltros,
  totalResultados,
  contagens,
}: PixTransacoesFiltrosProps) {
  const buscaAtiva = filtros.busca.trim().length > 0;
  const statusAtivoNaoPadrao = filtros.status !== "novas";
  const filtrosAtivos = buscaAtiva || statusAtivoNaoPadrao;

  const limparFiltros = () => {
    onChangeFiltros({ status: "novas", busca: "" });
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { sm: 2, md: 2.25 },
        mb: 3,
        borderRadius: 2.75,
        bgcolor: colors.branco,
        border: `1px solid ${colors.borda}`,
        boxShadow: "0 8px 24px rgba(2, 27, 22, 0.04)",
      }}
    >
      <Stack spacing={1.75}>
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
                color: colors.textoForte,
                fontWeight: 950,
                fontSize: "1rem",
                lineHeight: 1.2,
              }}
            >
              Validação de Transações Pix
            </Typography>
            <Typography
              sx={{ color: colors.textoSuave, fontSize: "0.82rem", mt: 0.25 }}
            >
              Filtre por comprador, CPF, telefone, e-mail, aderido ou status da transação.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
            {totalResultados !== undefined && (
              <Chip
                size="small"
                label={`${totalResultados} transação(ões)`}
                sx={{
                  height: 26,
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  bgcolor: "rgba(11, 122, 97, 0.08)",
                  color: colors.verdeEscuro,
                  borderRadius: 1.5,
                }}
              />
            )}
            {filtrosAtivos && (
              <Button
                size="small"
                startIcon={<CloseIcon fontSize="small" />}
                onClick={limparFiltros}
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
          </Stack>
        </Stack>

        <PixTransacoesCampoBusca
          filtros={filtros}
          onChangeFiltros={onChangeFiltros}
        />

        <PixTransacoesFiltrosChips
          filtros={filtros}
          onChangeFiltros={onChangeFiltros}
          contagens={contagens}
          marginTop={0.25}
        />
      </Stack>
    </Paper>
  );
}
