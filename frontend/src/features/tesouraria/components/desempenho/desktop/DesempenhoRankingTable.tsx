import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import {
  Box,
  ButtonBase,
  Chip,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { AderidoRankingDesempenho } from "../../../types/desempenho";
import { META_RIFAS_ADERIDO } from "../../../utils/constants";
import { formatarMoedaDesempenho } from "../../../utils/desempenhoFormatters";

/**
 * Propriedades para renderização da tabela de ranking de aderidos em desktop.
 */
export interface DesempenhoRankingTableProps<
  T extends AderidoRankingDesempenho = AderidoRankingDesempenho,
> {
  /** Lista ordenada de aderidos com métricas e posições. */
  ranking: T[];
  /** Callback opcional acionado ao clicar em um aderido para exibir o histórico de transações. */
  onSelecionarAderido?: (aderido: T) => void;
}

/**
 * Tabela de alta densidade exibindo o ranking financeiro consolidado por aderido
 * com detalhes de cursos, cargos, splits de canais (Pix vs Comprovantes), cumprimento de meta
 * e abertura do histórico de transações ao clicar no aderido.
 *
 * @param {DesempenhoRankingTableProps} props - Propriedades do componente.
 * @returns {JSX.Element} Tabela estilizada e interativa.
 */
export function DesempenhoRankingTable<
  T extends AderidoRankingDesempenho = AderidoRankingDesempenho,
>({ ranking, onSelecionarAderido }: DesempenhoRankingTableProps<T>) {
  if (ranking.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{ ...surfaces.paperComSombra, p: 3, textAlign: "center" }}
      >
        <Typography sx={{ color: colors.cinzaTexto }}>
          Nenhum aderido encontrado para os critérios de busca.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        ...surfaces.paperComSombra,
        borderRadius: 2.5,
        border: "1px solid rgba(2, 27, 22, 0.10)",
        maxHeight: 580,
      }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 900, width: 64 }}>#</TableCell>
            <TableCell sx={{ fontWeight: 900 }}>Aderido</TableCell>
            <TableCell sx={{ fontWeight: 900 }}>Curso / Cargo</TableCell>
            <TableCell align="center" sx={{ fontWeight: 900 }}>
              Pix
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 900 }}>
              Comprovante
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 900 }}>
              Total Rifas
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 900 }}>
              Arrecadado (Líq)
            </TableCell>
            <TableCell sx={{ fontWeight: 900, minWidth: 160 }}>
              Meta ({formatarMoedaDesempenho(1200)})
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ranking.map((item) => {
            const ehTop3 = item.posicao <= 3;
            const corPosicao =
              item.posicao === 1
                ? "#D4AF37"
                : item.posicao === 2
                  ? "#9E9E9E"
                  : item.posicao === 3
                    ? "#CD7F32"
                    : colors.cinzaTexto;

            const cpfExibicao =
              (item as { cpfLabel?: string }).cpfLabel || item.cpf || "-";
            const rifasVendidas = item.rifasVendidas ?? 0;
            const rifasRestantes =
              (item as { rifasRestantes?: number }).rifasRestantes ??
              Math.max(META_RIFAS_ADERIDO - rifasVendidas, 0);
            const temSplitValores =
              item.valorPix !== undefined || item.valorComprovante !== undefined;
            const valorLiquido = item.arrecadadoLiquido ?? item.arrecadado;
            const temDiferencaBrutoLiquido =
              item.arrecadadoLiquido !== undefined &&
              item.arrecadadoLiquido !== item.arrecadado;

            return (
              <TableRow
                key={item.id || item.cpf || item.posicao}
                hover
                onClick={
                  onSelecionarAderido
                    ? () => onSelecionarAderido(item)
                    : undefined
                }
                sx={{
                  "&:last-child td, &:last-child th": { border: 0 },
                  bgcolor: ehTop3 ? "rgba(11, 122, 97, 0.02)" : "inherit",
                  cursor: onSelecionarAderido ? "pointer" : "default",
                  transition: "background-color 140ms ease",
                  "&:hover": onSelecionarAderido
                    ? {
                        bgcolor: "rgba(6, 61, 49, 0.055)",
                      }
                    : undefined,
                }}
              >
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {ehTop3 && (
                      <EmojiEventsIcon
                        sx={{ fontSize: 18, color: corPosicao }}
                      />
                    )}
                    <Typography
                      sx={{
                        fontWeight: ehTop3 ? 950 : 700,
                        color: ehTop3
                          ? colors.pretoEsverdeado
                          : colors.cinzaTexto,
                        fontSize: "0.85rem",
                      }}
                    >
                      {item.posicao}º
                    </Typography>
                  </Box>
                </TableCell>

                <TableCell>
                  <ButtonBase
                    type="button"
                    aria-label={`Abrir detalhes de arrecadação de ${item.nome}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelecionarAderido?.(item);
                    }}
                    disabled={!onSelecionarAderido}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      width: "100%",
                      textAlign: "left",
                      borderRadius: 1,
                      py: 0.25,
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          color: colors.pretoEsverdeado,
                          fontSize: "0.88rem",
                          textDecoration: onSelecionarAderido
                            ? "underline"
                            : "none",
                          textDecorationColor: "rgba(6, 61, 49, 0.28)",
                          textUnderlineOffset: "3px",
                        }}
                      >
                        {item.nome}
                      </Typography>
                      <Typography
                        sx={{ color: colors.cinzaTexto, fontSize: "0.74rem" }}
                      >
                        {cpfExibicao}
                      </Typography>
                    </Box>
                    {onSelecionarAderido && (
                      <ArrowForwardIosRoundedIcon
                        sx={{
                          fontSize: 13,
                          color: colors.verdeEscuro,
                          opacity: 0.65,
                        }}
                      />
                    )}
                  </ButtonBase>
                </TableCell>

                <TableCell>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {item.curso && (
                      <Chip
                        size="small"
                        label={item.curso}
                        sx={{ fontSize: "0.7rem", height: 20 }}
                      />
                    )}
                    {item.cargo && (
                      <Chip
                        size="small"
                        color="primary"
                        label={item.cargo}
                        sx={{
                          fontSize: "0.7rem",
                          height: 20,
                          bgcolor: colors.verdeEscuro,
                        }}
                      />
                    )}
                    {!item.curso && !item.cargo && (
                      <Typography
                        sx={{ color: colors.cinzaTexto, fontSize: "0.74rem" }}
                      >
                        —
                      </Typography>
                    )}
                  </Box>
                </TableCell>

                <TableCell align="center">
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.86rem",
                      color: colors.verdeForte,
                    }}
                  >
                    {item.rifasVendidasPix ?? 0}
                  </Typography>
                </TableCell>

                <TableCell align="center">
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.86rem",
                      color: colors.cinzaTexto,
                    }}
                  >
                    {item.rifasVendidasComprovante ?? 0}
                  </Typography>
                </TableCell>

                <TableCell align="center">
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: "0.92rem",
                      color: colors.pretoEsverdeado,
                    }}
                  >
                    {rifasVendidas}
                  </Typography>
                  <Typography
                    sx={{ color: colors.cinzaTexto, fontSize: "0.7rem" }}
                  >
                    Restam: <span>{rifasRestantes} rifas</span>
                  </Typography>
                  {(item.rifasPendentes ?? 0) > 0 && (
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        color: colors.dourado,
                        fontWeight: 700,
                      }}
                    >
                      +{item.rifasPendentes} pend.
                    </Typography>
                  )}
                </TableCell>

                <TableCell align="right">
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: "0.92rem",
                      color: colors.pretoEsverdeado,
                    }}
                  >
                    {formatarMoedaDesempenho(valorLiquido)}
                  </Typography>
                  {temDiferencaBrutoLiquido && (
                    <Typography
                      sx={{ color: colors.cinzaTexto, fontSize: "0.72rem" }}
                    >
                      Bruto: {formatarMoedaDesempenho(item.arrecadado)}
                    </Typography>
                  )}
                  {temSplitValores && (
                    <Typography
                      sx={{
                        color: colors.cinzaTexto,
                        fontSize: "0.68rem",
                        fontStyle: "italic",
                      }}
                    >
                      Pix: {formatarMoedaDesempenho(item.valorPix || 0)} • Comp:{" "}
                      {formatarMoedaDesempenho(item.valorComprovante || 0)}
                    </Typography>
                  )}
                </TableCell>

                <TableCell>
                  <Box sx={{ minWidth: 130 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          color: item.bateuMeta
                            ? colors.verdeForte
                            : colors.cinzaTexto,
                        }}
                      >
                        {item.percentualMeta}% da meta
                      </Typography>
                      {item.bateuMeta && (
                        <Typography
                          sx={{
                            fontSize: "0.7rem",
                            fontWeight: 900,
                            color: colors.verdeForte,
                          }}
                        >
                          ✓ Atingida
                        </Typography>
                      )}
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(item.percentualMeta, 100)}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: "rgba(2, 27, 22, 0.08)",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: item.bateuMeta
                            ? colors.verdeForte
                            : colors.cinzaTexto,
                          borderRadius: 3,
                        },
                      }}
                    />
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
