import CloseIcon from "@mui/icons-material/Close";
import { Button, Chip, Paper, Stack } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { PixTransacoesCampoBusca } from "./PixTransacoesCampoBusca";
import { PixTransacoesFiltrosChips } from "./PixTransacoesFiltrosChips";
import { PixTransacoesFiltrosProps } from "./pixTransacoesFiltrosTypes";

/**
 * Painel de filtros de validação de transações Pix para o ambiente Mobile.
 * Compacto, com chips roláveis horizontalmente, contadores e botão acessível de limpeza.
 */
export function PixTransacoesFiltrosMobile({
  filtros,
  onChangeFiltros,
  contagens,
}: PixTransacoesFiltrosProps) {
  const buscaAtiva = filtros.busca.trim().length > 0;
  const filtroStatusAtivo = filtros.status !== "novas";
  const totalFiltrosAtivos =
    Number(buscaAtiva) + Number(filtroStatusAtivo);

  const limparFiltros = () => {
    onChangeFiltros({ status: "novas", busca: "" });
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        mb: 0,
        maxWidth: "100%",
        overflow: "hidden",
        borderRadius: 2.5,
        bgcolor: "#FFFFFF",
        border: "1px solid rgba(2, 27, 22, 0.08)",
        boxShadow: "0 6px 18px rgba(2, 27, 22, 0.04)",
      }}
    >
      <Stack spacing={1.25} sx={{ minWidth: 0 }}>
        <PixTransacoesCampoBusca
          filtros={filtros}
          onChangeFiltros={onChangeFiltros}
        />

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Chip
            label={
              totalFiltrosAtivos > 0
                ? `${totalFiltrosAtivos} filtro${totalFiltrosAtivos > 1 ? "s" : ""} ativo${totalFiltrosAtivos > 1 ? "s" : ""}`
                : "Sem filtros ativos"
            }
            size="small"
            sx={{
              height: 28,
              borderRadius: 2,
              color: totalFiltrosAtivos > 0 ? colors.verdeEscuro : colors.textoSuave,
              bgcolor: totalFiltrosAtivos > 0 ? "rgba(11, 122, 97, 0.10)" : "#F6F8F7",
              border: "1px solid rgba(6, 61, 49, 0.12)",
              fontWeight: 800,
              fontSize: "0.72rem",
            }}
          />

          {totalFiltrosAtivos > 0 && (
            <Button
              type="button"
              size="small"
              aria-label="Limpar filtros Pix"
              startIcon={<CloseIcon fontSize="small" />}
              onClick={limparFiltros}
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
                py: 0.25,
                "&:hover": {
                  bgcolor: "rgba(11, 122, 97, 0.16)",
                },
              }}
            >
              Limpar
            </Button>
          )}
        </Stack>

        <PixTransacoesFiltrosChips
          filtros={filtros}
          onChangeFiltros={onChangeFiltros}
          contagens={contagens}
          marginTop={0}
        />
      </Stack>
    </Paper>
  );
}
