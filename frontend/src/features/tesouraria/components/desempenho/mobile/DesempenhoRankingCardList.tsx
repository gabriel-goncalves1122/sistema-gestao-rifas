import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import {
  Box,
  ButtonBase,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { AderidoRankingDesempenho } from "../../../types/desempenho";
import { META_RIFAS_ADERIDO } from "../../../utils/constants";
import { formatarMoedaDesempenho } from "../../../utils/desempenhoFormatters";

/**
 * Propriedades para renderização da lista de cards de ranking mobile.
 */
export interface DesempenhoRankingCardListProps<
  T extends AderidoRankingDesempenho = AderidoRankingDesempenho,
> {
  /** Lista ordenada de aderidos com métricas e posições. */
  ranking: T[];
  /** Callback opcional acionado ao tocar em um card para abrir o histórico de transações daquela pessoa. */
  onSelecionarAderido?: (aderido: T) => void;
}

/**
 * Lista compacta e tocável de cards de aderidos classificados para uso em dispositivos móveis.
 *
 * @param {DesempenhoRankingCardListProps} props - Propriedades do componente.
 * @returns {JSX.Element} Lista de cards verticais interativos.
 */
export function DesempenhoRankingCardList<
  T extends AderidoRankingDesempenho = AderidoRankingDesempenho,
>({ ranking, onSelecionarAderido }: DesempenhoRankingCardListProps<T>) {
  if (ranking.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{ ...surfaces.paperComSombra, p: 2.5, textAlign: "center" }}
      >
        <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.85rem" }}>
          Nenhum aderido encontrado para a busca.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.5}>
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

        return (
          <Paper
            key={item.id || item.cpf || item.posicao}
            component={onSelecionarAderido ? ButtonBase : "div"}
            onClick={
              onSelecionarAderido ? () => onSelecionarAderido(item) : undefined
            }
            aria-label={
              onSelecionarAderido
                ? `Abrir detalhes de arrecadação de ${item.nome}`
                : undefined
            }
            elevation={0}
            sx={{
              ...surfaces.paperComSombra,
              display: "block",
              width: "100%",
              textAlign: "left",
              p: 1.75,
              borderRadius: 2,
              border: ehTop3
                ? `1px solid ${corPosicao}`
                : "1px solid rgba(2, 27, 22, 0.10)",
              bgcolor: colors.branco,
              cursor: onSelecionarAderido ? "pointer" : "default",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              sx={{ mb: 1 }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: ehTop3 ? `${corPosicao}22` : colors.fundoSuave,
                    color: corPosicao,
                    fontWeight: 900,
                    fontSize: "0.82rem",
                  }}
                >
                  {ehTop3 ? (
                    <EmojiEventsIcon sx={{ fontSize: 16 }} />
                  ) : (
                    `${item.posicao}º`
                  )}
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontWeight: 850,
                      color: colors.pretoEsverdeado,
                      fontSize: "0.92rem",
                      lineHeight: 1.2,
                    }}
                  >
                    {item.nome}
                  </Typography>
                  <Typography
                    sx={{ color: colors.cinzaTexto, fontSize: "0.72rem" }}
                  >
                    {cpfExibicao}
                  </Typography>
                </Box>
              </Box>

              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography
                  sx={{
                    fontWeight: 900,
                    color: colors.verdeEscuro,
                    fontSize: "1rem",
                  }}
                >
                  {formatarMoedaDesempenho(
                    item.arrecadadoLiquido ?? item.arrecadado,
                  )}
                </Typography>
                {onSelecionarAderido && (
                  <ArrowForwardIosRoundedIcon
                    sx={{ fontSize: 13, color: colors.verdeEscuro, opacity: 0.7 }}
                  />
                )}
              </Stack>
            </Stack>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1.2 }}>
              {item.curso && (
                <Chip
                  size="small"
                  label={item.curso}
                  sx={{ fontSize: "0.68rem", height: 18 }}
                />
              )}
              {item.cargo && (
                <Chip
                  size="small"
                  label={item.cargo}
                  sx={{
                    fontSize: "0.68rem",
                    height: 18,
                    bgcolor: colors.verdeEscuro,
                    color: colors.branco,
                  }}
                />
              )}
            </Box>

            <Box
              sx={{
                bgcolor: colors.fundoSuave,
                p: 1,
                borderRadius: 1.5,
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 0.5,
                textAlign: "center",
                mb: 1,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: "0.66rem",
                    color: colors.cinzaTexto,
                    fontWeight: 700,
                  }}
                >
                  PIX
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    color: colors.verdeForte,
                  }}
                >
                  {item.rifasVendidasPix ?? 0}
                </Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: "0.66rem",
                    color: colors.cinzaTexto,
                    fontWeight: 700,
                  }}
                >
                  COMP.
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    color: colors.cinzaTexto,
                  }}
                >
                  {item.rifasVendidasComprovante ?? 0}
                </Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: "0.66rem",
                    color: colors.cinzaTexto,
                    fontWeight: 700,
                  }}
                >
                  VENDIDAS
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.88rem",
                    fontWeight: 900,
                    color: colors.pretoEsverdeado,
                  }}
                >
                  {rifasVendidas}
                </Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: "0.66rem",
                    color: colors.cinzaTexto,
                    fontWeight: 700,
                  }}
                >
                  RESTAM
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    color: colors.cinzaTexto,
                  }}
                >
                  {rifasRestantes} rifas
                </Typography>
              </Box>
            </Box>

            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.4,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: colors.cinzaTexto,
                  }}
                >
                  Meta: {item.percentualMeta}%
                </Typography>
                {item.bateuMeta && (
                  <Typography
                    sx={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      color: colors.verdeForte,
                    }}
                  >
                    ✓ Meta Atingida
                  </Typography>
                )}
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(item.percentualMeta, 100)}
                sx={{
                  height: 5,
                  borderRadius: 2.5,
                  bgcolor: "rgba(2, 27, 22, 0.08)",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: item.bateuMeta
                      ? colors.verdeForte
                      : colors.cinzaTexto,
                    borderRadius: 2.5,
                  },
                }}
              />
            </Box>
          </Paper>
        );
      })}
    </Stack>
  );
}
