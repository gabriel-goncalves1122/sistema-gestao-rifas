import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { typographyScale as typography } from "@/shared/tokens/typography";
import { PixAderidoResumo } from "../../../../utils/pixAderidosUtils";

/**
 * Propriedades do cabeçalho da gaveta de detalhes do aderido.
 */
export interface PixAderidoDrawerHeaderProps {
  /** Resumo completo do aderido selecionado. */
  aderido: PixAderidoResumo;
  /** Callback acionado ao clicar no botão de fechar gaveta. */
  onClose: () => void;
}

/**
 * Extrai as iniciais do nome do aderido para exibição no avatar de identificação.
 *
 * @param {string} nome - Nome completo do aderido.
 * @returns {string} Iniciais em caixa alta (ex: "ER").
 */
function obterIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "AD";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Cabeçalho da gaveta de detalhes do aderido com avatar, selo de ranking,
 * CPF, chips de vínculo e botão para encerrar a visualização.
 *
 * @param {PixAderidoDrawerHeaderProps} props - Dados do aderido e callback de fechamento.
 * @returns {JSX.Element} Cabeçalho renderizado.
 */
export function PixAderidoDrawerHeader({
  aderido,
  onClose,
}: PixAderidoDrawerHeaderProps) {
  const ehTop3 = Boolean(aderido.posicao && aderido.posicao <= 3);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 1.5,
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ minWidth: 0, flex: 1 }}
      >
        <Avatar
          sx={{
            width: 44,
            height: 44,
            bgcolor: ehTop3 ? "rgba(11, 122, 97, 0.12)" : colors.verdeEscuro,
            color: ehTop3 ? colors.verdeEscuro : colors.branco,
            fontWeight: 900,
            fontSize: "0.95rem",
            border: ehTop3 ? `2px solid ${colors.verdeEscuro}` : "none",
          }}
        >
          {ehTop3 ? (
            <Stack direction="row" alignItems="center" spacing={0.25}>
              <EmojiEventsRoundedIcon sx={{ fontSize: 16 }} />
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: "0.85rem",
                  lineHeight: 1,
                }}
              >
                {aderido.posicao}º
              </Typography>
            </Stack>
          ) : (
            obterIniciais(aderido.nome)
          )}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            flexWrap="wrap"
            gap={0.5}
          >
            <Typography
              sx={{
                ...typography.bodyDestaque,
                fontWeight: 950,
                fontStyle: "italic",
                letterSpacing: "-0.02em",
                fontSize: { xs: "1.12rem", sm: "1.25rem" },
                color: "#063D31",
                lineHeight: 1.25,
              }}
            >
              {aderido.nome}
            </Typography>

            {aderido.posicao && aderido.posicao > 3 && (
              <Chip
                size="small"
                label={`${aderido.posicao}º no ranking`}
                sx={{
                  height: 20,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  bgcolor: "rgba(2, 27, 22, 0.06)",
                  color: colors.cinzaTexto,
                }}
              />
            )}
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mt: 0.5 }}
            flexWrap="wrap"
            gap={0.5}
          >
            <Typography
              sx={{
                color: colors.cinzaTexto,
                fontSize: "0.78rem",
                fontWeight: 500,
              }}
            >
              {aderido.cpfLabel}
            </Typography>

            {aderido.curso && (
              <Chip
                size="small"
                label={aderido.curso}
                sx={{
                  height: 20,
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  bgcolor: "rgba(11, 122, 97, 0.08)",
                  color: colors.verdeEscuro,
                }}
              />
            )}

            {aderido.cargo && (
              <Chip
                size="small"
                label={aderido.cargo}
                sx={{
                  height: 20,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  bgcolor: colors.verdeEscuro,
                  color: colors.branco,
                }}
              />
            )}
          </Stack>
        </Box>
      </Stack>

      <IconButton
        onClick={onClose}
        aria-label="Fechar histórico"
        data-testid="fechar-drawer-aderido"
        size="medium"
        sx={{
          color: colors.cinzaTexto,
          bgcolor: "rgba(2, 27, 22, 0.05)",
          width: 40,
          height: 40,
          minWidth: 40,
          flexShrink: 0,
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            bgcolor: "rgba(2, 27, 22, 0.12)",
            color: colors.pretoEsverdeado,
            transform: "scale(1.05)",
          },
        }}
      >
        <CloseRoundedIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
