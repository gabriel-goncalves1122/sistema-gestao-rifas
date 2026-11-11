import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { typographyScale as typography } from "@/shared/tokens/typography";
import { PixAderidoResumo } from "../../../../utils/pixAderidosUtils";
import {
  formatarDataPix,
  formatarMoedaPix,
} from "../../../../utils/pixTransacoesUtils";

/**
 * Propriedades da listagem de transações relacionadas a um aderido.
 */
export interface PixAderidoTransacoesListaProps {
  /** Resumo do aderido contendo a lista de transações vinculadas. */
  aderido: PixAderidoResumo;
}

/**
 * Exibe a lista rolável das até 50 transações confirmadas de um aderido
 * ou estado vazio quando não houver vendas pagas registradas.
 *
 * @param {PixAderidoTransacoesListaProps} props - Dados do aderido selecionado.
 * @returns {JSX.Element} Bloco da seção de transações relacionadas.
 */
export function PixAderidoTransacoesLista({
  aderido,
}: PixAderidoTransacoesListaProps) {
  const transacoesPagas = (aderido.transacoes || []).filter(
    (transacao) => transacao.statusPagamento === "PAID",
  );

  return (
    <Box sx={{ minHeight: 0 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Typography
          sx={{
            ...typography.secaoTitulo,
            fontSize: "0.92rem",
            fontWeight: 800,
          }}
        >
          Transações relacionadas
        </Typography>
        <Chip
          size="small"
          label={`${transacoesPagas.length} confirmada(s)`}
          sx={{
            height: 20,
            fontSize: "0.68rem",
            fontWeight: 700,
            bgcolor: "rgba(11, 122, 97, 0.08)",
            color: colors.verdeEscuro,
          }}
        />
      </Stack>

      <Stack
        spacing={1}
        sx={{
          maxHeight: { xs: 260, sm: 320 },
          overflowY: "auto",
          pr: 0.5,
        }}
      >
        {transacoesPagas.length > 0 ? (
          transacoesPagas.slice(0, 50).map((transacao) => {
            const origem =
              transacao.origem === "COMPROVANTE" ? "Comprovante" : "Pix";
            const qtdRifas =
              transacao.rifas?.length || transacao.quantidadeRifas || 1;

            return (
              <Paper
                key={transacao.id}
                elevation={0}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.25,
                  borderRadius: 2.5,
                  bgcolor: "#FAFCFA",
                  border: "1px solid rgba(2, 27, 22, 0.07)",
                  transition: "border-color 0.15s ease",
                  "&:hover": {
                    borderColor: "rgba(11, 122, 97, 0.25)",
                  },
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.75}
                    sx={{ mb: 0.25 }}
                  >
                    <Typography
                      sx={{
                        ...typography.bodyDestaque,
                        fontSize: "0.86rem",
                        fontWeight: 700,
                        color: colors.pretoEsverdeado,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {transacao.compradorNome || "Pagador não informado"}
                    </Typography>
                    <Chip
                      size="small"
                      label={origem}
                      sx={{
                        height: 18,
                        fontSize: "0.64rem",
                        fontWeight: 800,
                        bgcolor:
                          origem === "Pix"
                            ? "rgba(11, 122, 97, 0.12)"
                            : "rgba(82, 103, 96, 0.14)",
                        color:
                          origem === "Pix"
                            ? colors.verdeForte
                            : colors.cinzaTexto,
                      }}
                    />
                  </Stack>
                  <Typography
                    sx={{
                      color: colors.cinzaTexto,
                      fontSize: "0.74rem",
                      fontWeight: 500,
                    }}
                  >
                    {formatarDataPix(
                      transacao.dataPagamento || transacao.dataCriacao,
                    )}{" "}
                    • {qtdRifas} rifa(s)
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    ...typography.valorMonetario,
                    fontSize: "0.95rem",
                    fontWeight: 900,
                    color: colors.verdeEscuro,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatarMoedaPix(transacao.valorPago)}
                </Typography>
              </Paper>
            );
          })
        ) : (
          <Paper
            elevation={0}
            sx={{
              py: 3,
              px: 2,
              textAlign: "center",
              borderRadius: 2.5,
              bgcolor: "#FAFCFA",
              border: "1px dashed rgba(2, 27, 22, 0.12)",
            }}
          >
            <Typography
              sx={{
                color: colors.cinzaTexto,
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              Nenhum Pix pago vinculado.
            </Typography>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}
