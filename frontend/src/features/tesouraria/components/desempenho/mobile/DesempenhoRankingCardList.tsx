import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import {
  Box,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { AderidoRankingDesempenho } from "../../../types/desempenho";
import { formatarMoedaDesempenho } from "../../../utils/desempenhoFormatters";

/**
 * Propriedades para renderização da lista de cards de ranking mobile.
 */
export interface DesempenhoRankingCardListProps {
  /** Lista ordenada de aderidos com métricas e posições. */
  ranking: AderidoRankingDesempenho[];
}

/**
 * Lista compacta e tocável de cards de aderidos classificados para uso em dispositivos móveis.
 *
 * @param {DesempenhoRankingCardListProps} props - Propriedades do componente.
 * @returns {JSX.Element} Lista de cards verticais.
 */
export function DesempenhoRankingCardList({
  ranking,
}: DesempenhoRankingCardListProps) {
  if (ranking.length === 0) {
    return (
      <Paper elevation={0} sx={{ ...surfaces.paperComSombra, p: 2.5, textAlign: "center" }}>
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

        return (
          <Paper
            key={item.id || item.cpf || item.posicao}
            elevation={0}
            sx={{
              ...surfaces.paperComSombra,
              p: 1.75,
              borderRadius: 2,
              border: ehTop3
                ? `1px solid ${corPosicao}`
                : "1px solid rgba(2, 27, 22, 0.10)",
              bgcolor: colors.branco,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
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
                  <Typography sx={{ fontWeight: 850, color: colors.pretoEsverdeado, fontSize: "0.92rem", lineHeight: 1.2 }}>
                    {item.nome}
                  </Typography>
                  <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.72rem" }}>
                    CPF: {item.cpf}
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{ fontWeight: 900, color: colors.verdeEscuro, fontSize: "1rem" }}>
                {formatarMoedaDesempenho(item.arrecadadoLiquido ?? item.arrecadado)}
              </Typography>
            </Stack>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1.2 }}>
              {item.curso && (
                <Chip size="small" label={item.curso} sx={{ fontSize: "0.68rem", height: 18 }} />
              )}
              {item.cargo && (
                <Chip size="small" label={item.cargo} sx={{ fontSize: "0.68rem", height: 18, bgcolor: colors.verdeEscuro, color: colors.branco }} />
              )}
            </Box>

            <Box
              sx={{
                bgcolor: colors.fundoSuave,
                p: 1,
                borderRadius: 1.5,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 0.5,
                textAlign: "center",
                mb: 1,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: "0.66rem", color: colors.cinzaTexto, fontWeight: 700 }}>PIX</Typography>
                <Typography sx={{ fontSize: "0.88rem", fontWeight: 800, color: colors.verdeForte }}>{item.rifasVendidasPix ?? 0}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: "0.66rem", color: colors.cinzaTexto, fontWeight: 700 }}>COMP.</Typography>
                <Typography sx={{ fontSize: "0.88rem", fontWeight: 800, color: colors.cinzaTexto }}>{item.rifasVendidasComprovante ?? 0}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: "0.66rem", color: colors.cinzaTexto, fontWeight: 700 }}>TOTAL</Typography>
                <Typography sx={{ fontSize: "0.88rem", fontWeight: 900, color: colors.pretoEsverdeado }}>{item.rifasVendidas ?? 0}</Typography>
              </Box>
            </Box>

            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: colors.cinzaTexto }}>
                  Meta: {item.percentualMeta}%
                </Typography>
                {item.bateuMeta && (
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: colors.verdeForte }}>
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
                    bgcolor: item.bateuMeta ? colors.verdeForte : colors.cinzaTexto,
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
