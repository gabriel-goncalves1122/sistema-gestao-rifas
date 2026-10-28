import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  SwipeableDrawer,
  Typography,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { typographyScale as typography } from "@/shared/tokens/typography";
import { layout } from "../../../../styles/layout";
import { PixAderidoResumo } from "../../../../utils/pixAderidosUtils";
import {
  formatarDataPix,
  formatarMoedaPix,
} from "../../../../utils/pixTransacoesUtils";

/**
 * Propriedades para renderização da gaveta inferior de detalhes do aderido.
 */
export interface PixAderidoDetalhesDrawerProps {
  /** Resumo do aderido selecionado ou `null` se fechado */
  aderido: PixAderidoResumo | null;
  /** Callback para fechamento da gaveta */
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
 * Gaveta inferior interativa (BottomDrawer / BottomSheet) para exibição do histórico
 * e desempenho detalhado de um aderido na tesouraria Pix.
 *
 * Suporta fechamento nativo por toque via botão 'X' proeminente e gesto de arrastar para baixo (SwipeableDrawer).
 *
 * @param {PixAderidoDetalhesDrawerProps} props - Propriedades do componente.
 * @returns {JSX.Element} BottomDrawer responsivo e polido.
 */
export function PixAderidoDetalhesDrawer({
  aderido,
  onClose,
}: PixAderidoDetalhesDrawerProps) {
  const transacoesPagas = (aderido?.transacoes || []).filter(
    (transacao) => transacao.statusPagamento === "PAID",
  );

  const temSplit =
    aderido &&
    (aderido.valorPix !== undefined || aderido.valorComprovante !== undefined);

  const metaRifas =
    aderido?.meta ||
    ((aderido?.rifasPagas || 0) + (aderido?.rifasRestantes || 0) > 0
      ? (aderido?.rifasPagas || 0) + (aderido?.rifasRestantes || 0)
      : 120);

  const percentualMeta =
    aderido?.percentualMeta !== undefined
      ? Math.round(aderido.percentualMeta)
      : Math.round(((aderido?.rifasPagas || 0) / metaRifas) * 100);

  const percentualProgresso = Math.min(Math.max(percentualMeta, 0), 100);

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={Boolean(aderido)}
      onClose={onClose}
      onOpen={() => undefined}
      disableSwipeToOpen
      disableDiscovery
      swipeAreaWidth={48}
      ModalProps={{
        keepMounted: false,
      }}
      PaperProps={{
        sx: {
          ...layout.drawerPaper,
          maxWidth: { xs: "100%", sm: 580, md: 660 },
          mx: "auto",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          p: { xs: 2, sm: 2.75 },
          pb: "calc(env(safe-area-inset-bottom) + 20px)",
          boxShadow: "0 -10px 40px rgba(2, 27, 22, 0.16)",
          bgcolor: "#FFFFFF",
        },
      }}
    >
      {aderido && (
        <Stack spacing={2} sx={{ minHeight: 0 }}>
          {/* Puxador decorativo para affordance de arrastar para baixo */}
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              pt: 0.25,
              pb: 0.75,
            }}
          >
            <Box sx={layout.drawerPullHandle} />
          </Box>

          {/* Cabeçalho do aderido com Avatar, Informações e Botão Único de Fechar */}
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
                  bgcolor:
                    aderido.posicao && aderido.posicao <= 3
                      ? "rgba(11, 122, 97, 0.12)"
                      : colors.verdeEscuro,
                  color:
                    aderido.posicao && aderido.posicao <= 3
                      ? colors.verdeEscuro
                      : colors.branco,
                  fontWeight: 900,
                  fontSize: "0.95rem",
                  border:
                    aderido.posicao && aderido.posicao <= 3
                      ? `2px solid ${colors.verdeEscuro}`
                      : "none",
                }}
              >
                {aderido.posicao && aderido.posicao <= 3 ? (
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
                      fontSize: { xs: "1.05rem", sm: "1.15rem" },
                      color: colors.pretoEsverdeado,
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

            {/* Mecanismo Único e Mais Intuitivo de Saída */}
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

          {/* Cartões Modernizados de Resumo Financeiro e Meta */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 1.25,
            }}
          >
            {/* Card 1: Total Arrecadado */}
            <Paper
              elevation={0}
              sx={{
                p: 1.75,
                borderRadius: 3,
                background:
                  "linear-gradient(135deg, rgba(11, 122, 97, 0.08) 0%, rgba(11, 122, 97, 0.02) 100%)",
                border: "1px solid rgba(11, 122, 97, 0.2)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color: colors.verdeEscuro,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Arrecadado
                </Typography>
                <Typography
                  sx={{
                    ...typography.valorMonetario,
                    fontSize: { xs: "1.28rem", sm: "1.42rem" },
                    color: colors.pretoEsverdeado,
                    fontWeight: 950,
                    mt: 0.25,
                  }}
                >
                  {formatarMoedaPix(aderido.totalArrecadado)}
                </Typography>
              </Box>

              {temSplit && (
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ mt: 1 }}
                  flexWrap="wrap"
                  gap={0.5}
                >
                  <Chip
                    size="small"
                    label={`Pix: ${formatarMoedaPix(aderido.valorPix || 0)}`}
                    sx={{
                      height: 20,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      bgcolor: "rgba(11, 122, 97, 0.12)",
                      color: colors.verdeForte,
                    }}
                  />
                  <Chip
                    size="small"
                    label={`Comp: ${formatarMoedaPix(aderido.valorComprovante || 0)}`}
                    sx={{
                      height: 20,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      bgcolor: "rgba(82, 103, 96, 0.12)",
                      color: colors.cinzaTexto,
                    }}
                  />
                </Stack>
              )}
            </Paper>

            {/* Card 2: Meta e Rifas */}
            <Paper
              elevation={0}
              sx={{
                p: 1.75,
                borderRadius: 3,
                background:
                  "linear-gradient(135deg, rgba(2, 27, 22, 0.04) 0%, rgba(2, 27, 22, 0.01) 100%)",
                border: "1px solid rgba(2, 27, 22, 0.08)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography
                    sx={{
                      color: colors.cinzaTexto,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Rifas restantes
                  </Typography>
                  <Typography
                    sx={{
                      color: colors.verdeEscuro,
                      fontSize: "0.75rem",
                      fontWeight: 800,
                    }}
                  >
                    {percentualMeta}% da meta
                  </Typography>
                </Stack>

                <Typography
                  sx={{
                    color: colors.pretoEsverdeado,
                    fontWeight: 950,
                    fontSize: { xs: "1.28rem", sm: "1.42rem" },
                    mt: 0.25,
                  }}
                >
                  {aderido.rifasRestantes}
                </Typography>
              </Box>

              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={percentualProgresso}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: "rgba(11, 122, 97, 0.12)",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: colors.verdeForte,
                      borderRadius: 3,
                    },
                  }}
                />
                <Typography
                  sx={{
                    color: colors.cinzaTexto,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    mt: 0.5,
                  }}
                >
                  {aderido.rifasPagas} rifa(s) vendida(s) de {metaRifas}
                </Typography>
              </Box>
            </Paper>
          </Box>

          {/* Seção de Transações Relacionadas em Cards Individuais */}
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
                    transacao.origem === "COMPROVANTE"
                      ? "Comprovante"
                      : "Pix";
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
        </Stack>
      )}
    </SwipeableDrawer>
  );
}
