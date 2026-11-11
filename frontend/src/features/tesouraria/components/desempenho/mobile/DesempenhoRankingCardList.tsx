import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { usePaginacaoProgressiva } from "@/shared/hooks/usePaginacaoProgressiva";
import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { AderidoRankingDesempenho } from "../../../types/desempenho";
import { META_RIFAS_ADERIDO } from "../../../utils/constants";
import { formatarMoeda } from "@/shared/utils/formatadores";
import { calcularDadosExibicaoItemRanking } from "../../../utils/desempenhoRankingUtils";
import { RankingMetaProgress } from "../shared/RankingMetaProgress";

const ITENS_POR_LOTE_MOBILE = 20;

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
 * Lista compacta e tocável de cards de aderidos classificados para uso em dispositivos móveis,
 * com carregamento incremental em lotes de 20 itens.
 *
 * @param {DesempenhoRankingCardListProps} props - Propriedades do componente.
 * @returns {JSX.Element} Lista de cards verticais interativos.
 */
export function DesempenhoRankingCardList<
  T extends AderidoRankingDesempenho = AderidoRankingDesempenho,
>({ ranking, onSelecionarAderido }: DesempenhoRankingCardListProps<T>) {
  const {
    itensVisiveis: rankingVisivel,
    restantes,
    sentinelaRef,
    carregarMais,
  } = usePaginacaoProgressiva(ranking, ITENS_POR_LOTE_MOBILE);

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
      {rankingVisivel.map((item) => {
        const { ehTop3, corPosicao, cpfExibicao, rifasVendidas, rifasRestantes } =
          calcularDadosExibicaoItemRanking(item, META_RIFAS_ADERIDO);

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
                  {formatarMoeda(
                    item.arrecadadoLiquido ?? item.arrecadado,
                  )}
                </Typography>
                {onSelecionarAderido && (
                  <ArrowForwardIosRoundedIcon
                    sx={{
                      fontSize: 13,
                      color: colors.verdeEscuro,
                      opacity: 0.7,
                    }}
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

            <RankingMetaProgress
              percentualMeta={item.percentualMeta}
              bateuMeta={item.bateuMeta}
              variante="card"
            />
          </Paper>
        );
      })}

      {restantes > 0 && (
        <Box ref={sentinelaRef} sx={{ pt: 0.5, textAlign: "center" }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={carregarMais}
            sx={{
              borderRadius: 2,
              fontWeight: 850,
              textTransform: "none",
              color: colors.verdeEscuro,
              borderColor: "rgba(6, 61, 49, 0.24)",
              py: 1,
            }}
          >
            Mostrar mais ({restantes} restante{restantes > 1 ? "s" : ""})
          </Button>
        </Box>
      )}
    </Stack>
  );
}
