import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ReportGmailerrorredIcon from "@mui/icons-material/ReportGmailerrorred";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { formatarDataCurta } from "@/shared/utils/formatadores";
import type { GrupoRifasRecusadas } from "../../types/painelAderido";

/**
 * Propriedades do cartão individual de venda recusada ou pendente de correção cadastral.
 */
export interface CardVendaRecusadaProps {
  /** Grupo consolidado da venda recusada (comprador, motivo, data e bilhetes). */
  grupo: GrupoRifasRecusadas;
  /** Callback acionado ao clicar para abrir o formulário de correção de dados. */
  onAbrirCorrecao: (grupo: GrupoRifasRecusadas) => void;
  /** Callback opcional acionado ao solicitar desistência da venda recusada. */
  onSolicitarDesistencia?: (grupo: GrupoRifasRecusadas) => void;
}

/**
 * Exibe os detalhes de um agrupamento de bilhetes recusados com o motivo apontado
 * pela tesouraria e ações de correção cadastral ou liberação das rifas.
 *
 * @param {CardVendaRecusadaProps} props - Objeto da venda recusada e callbacks de ação.
 * @returns {JSX.Element} Cartão estilizado da venda recusada.
 */
export function CardVendaRecusada({
  grupo,
  onAbrirCorrecao,
  onSolicitarDesistencia,
}: CardVendaRecusadaProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.35 },
        borderRadius: 2.25,
        bgcolor: colors.branco,
        border: `1px solid ${colors.borda}`,
        boxShadow:
          "0 18px 42px rgba(2, 27, 22, 0.075), 0 2px 8px rgba(6, 61, 49, 0.045)",
      }}
    >
      <Stack spacing={2.15}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          gap={1.5}
        >
          <Box sx={{ minWidth: 0 }}>
            {grupo.apenasCorrecaoCadastro && (
              <Chip
                size="small"
                label="Correção de cadastro (Pagamento aprovado)"
                sx={{
                  mb: 0.75,
                  height: 24,
                  borderRadius: 1.25,
                  bgcolor: "#EAF7EF",
                  color: "#0B5136",
                  border: "1px solid #85C89F",
                  fontWeight: 850,
                  fontSize: "0.72rem",
                }}
              />
            )}

            <Typography
              sx={{
                color: colors.pretoEsverdeado,
                fontWeight: 900,
                fontSize: "1rem",
                lineHeight: 1.18,
                overflowWrap: "anywhere",
              }}
            >
              {grupo.comprador}
            </Typography>

            <Typography
              sx={{
                mt: 0.35,
                color: colors.cinzaTexto,
                fontWeight: 700,
                fontSize: "0.78rem",
              }}
            >
              {formatarDataCurta(grupo.data)}
            </Typography>
          </Box>

          <Chip
            size="small"
            label={
              grupo.bilhetes.length === 1
                ? "1 rifa"
                : `${grupo.bilhetes.length} rifas`
            }
            sx={{
              height: 28,
              borderRadius: 1.5,
              bgcolor: colors.verdeClaro,
              color: colors.verdeEscuro,
              border: "1px solid rgba(6, 61, 49, 0.12)",
              fontWeight: 850,
            }}
          />
        </Stack>

        <Box
          sx={{
            p: 1.35,
            borderRadius: 2,
            bgcolor: colors.alertaSuave,
            border: "1px solid rgba(107, 78, 0, 0.12)",
          }}
        >
          <Stack direction="row" gap={1} alignItems="flex-start">
            <ReportGmailerrorredIcon
              fontSize="small"
              sx={{ color: colors.alertaTexto, mt: 0.1 }}
            />
            <Box>
              <Typography
                sx={{
                  color: colors.alertaTexto,
                  fontWeight: 900,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Motivo
              </Typography>
              <Typography
                sx={{
                  mt: 0.35,
                  color: colors.alertaTextoForte,
                  fontWeight: 750,
                  fontSize: "0.9rem",
                  lineHeight: 1.35,
                }}
              >
                {grupo.motivo}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box>
          <Typography
            sx={{
              color: colors.cinzaTexto,
              fontWeight: 850,
              fontSize: "0.78rem",
              mb: 0.85,
            }}
          >
            Rifas para revisar
          </Typography>

          <Stack direction="row" gap={0.65} flexWrap="wrap">
            {grupo.bilhetes.map((b) => (
              <Chip
                key={b}
                size="small"
                label={b}
                sx={{
                  borderRadius: 1.5,
                  bgcolor: colors.erroSuave,
                  color: colors.erroTexto,
                  border: `1px solid ${colors.erroBorda}`,
                  fontWeight: 850,
                }}
              />
            ))}
          </Stack>
        </Box>

        <Button
          fullWidth
          variant="contained"
          startIcon={<BuildCircleIcon />}
          onClick={() => onAbrirCorrecao(grupo)}
          sx={{
            minHeight: 44,
            borderRadius: 2,
            bgcolor: colors.verdeEscuro,
            fontWeight: 900,
            "&:hover": {
              bgcolor: colors.pretoEsverdeado,
            },
          }}
        >
          Corrigir dados
        </Button>

        {!grupo.apenasCorrecaoCadastro && onSolicitarDesistencia && (
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => onSolicitarDesistencia(grupo)}
            sx={{
              minHeight: 40,
              borderRadius: 2,
              fontWeight: 800,
              textTransform: "none",
              borderWidth: 1.5,
              "&:hover": {
                borderWidth: 1.5,
              },
            }}
          >
            Desistir da venda / Liberar rifas
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
