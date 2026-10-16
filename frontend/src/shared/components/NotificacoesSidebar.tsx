import CloseIcon from "@mui/icons-material/Close";
import EditNoteIcon from "@mui/icons-material/EditNote";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import {
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  Stack,
  Typography,
} from "@mui/material";

import { NotificacaoRifa, TipoNotificacaoRifa } from "../types/notificacoes";
import {
  formatarDataNotificacao,
  normalizarTipoNotificacaoRifa,
} from "../utils/notificacoesUtils";

/**
 * Interface de propriedades do componente Dumb `NotificacoesSidebar`.
 */
export interface NotificacoesSidebarProps {
  /** Se o drawer lateral de notificações está visível. */
  open: boolean;
  /** Callback acionado ao solicitar o fechamento da barra lateral. */
  onClose: () => void;
  /** Lista de notificações de rifas do usuário autenticado. */
  notificacoes: NotificacaoRifa[];
}

const CONFIG_NOTIFICACAO: Record<
  TipoNotificacaoRifa,
  {
    titulo: string;
    rifasLabel: string;
    bgcolor: string;
    borderColor: string;
    color: string;
    chipBg: string;
  }
> = {
  correcao_dados: {
    titulo: "Corrigir dados",
    rifasLabel: "Rifas para corrigir",
    bgcolor: "#FFF7E0",
    borderColor: "#C48A16",
    color: "#6B4E00",
    chipBg: "#FFFFFF",
  },
  rifa_liberada: {
    titulo: "Rifa disponível",
    rifasLabel: "Rifas disponíveis novamente",
    bgcolor: "#EAF3EF",
    borderColor: "#0B7A61",
    color: "#063D31",
    chipBg: "#FFFFFF",
  },
  informativo: {
    titulo: "Aviso",
    rifasLabel: "Rifas relacionadas",
    bgcolor: "#F6F8F7",
    borderColor: "#526760",
    color: "#526760",
    chipBg: "#FFFFFF",
  },
};

function renderIconeNotificacao(tipo: TipoNotificacaoRifa) {
  if (tipo === "rifa_liberada") {
    return <TaskAltIcon fontSize="small" />;
  }

  if (tipo === "informativo") {
    return <InfoOutlinedIcon fontSize="small" />;
  }

  return <EditNoteIcon fontSize="small" />;
}

/**
 * Deriva o título contextual da notificação com base no seu tipo ou fallback informativo.
 *
 * @param {NotificacaoRifa} notificacao - Registro de notificação.
 * @returns {string} Título a ser exibido no card.
 */
function obterTituloNotificacao(notificacao: NotificacaoRifa) {
  const tipo = normalizarTipoNotificacaoRifa(notificacao.tipo);
  const config = CONFIG_NOTIFICACAO[tipo];

  if (tipo === "informativo") {
    return notificacao.titulo || config.titulo;
  }

  return config.titulo;
}

/**
 * Componente Dumb de barra lateral (Drawer) para exibição e leitura de notificações do usuário logado.
 * Renderiza cards temáticos por tipo (correção de dados, rifa liberada, avisos) e lista de rifas afetadas.
 *
 * @param {NotificacoesSidebarProps} props - Propriedades de controle e lista de notificações.
 * @returns {JSX.Element}
 */
export function NotificacoesSidebar({
  open,
  onClose,
  notificacoes,
}: NotificacoesSidebarProps) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box
        sx={{
          width: { xs: "100vw", sm: 420 },
          pt: { xs: "max(48px, env(safe-area-inset-top))", sm: 3 },
          px: { xs: 2.25, sm: 3 },
          pb: { xs: 2.25, sm: 3 },
          display: "flex",
          flexDirection: "column",
          height: "100%",
          bgcolor: "#F6F8F7",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Typography
            component="h2"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "#021B16",
              fontWeight: 950,
              fontSize: "1.15rem",
            }}
          >
            <NotificationsNoneIcon /> Notificações
          </Typography>

          <IconButton
            onClick={onClose}
            aria-label="Fechar notificações"
            sx={{
              borderRadius: 2,
              color: "#063D31",
              bgcolor: "#FFFFFF",
              border: "1px solid rgba(6, 61, 49, 0.10)",
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <List sx={{ flexGrow: 1, overflow: "auto", p: 0 }}>
          {notificacoes.length === 0 ? (
            <Stack alignItems="center" spacing={1.5} sx={{ mt: 10 }}>
              <TaskAltIcon
                sx={{ fontSize: 56, color: "#0B7A61", opacity: 0.5 }}
              />
              <Typography sx={{ color: "#526760", fontWeight: 800 }}>
                Você não tem novas mensagens.
              </Typography>
            </Stack>
          ) : (
            notificacoes.map((notificacao) => {
              const tipo = normalizarTipoNotificacaoRifa(notificacao.tipo);
              const config = CONFIG_NOTIFICACAO[tipo];
              const dataFormatada = formatarDataNotificacao(
                notificacao.data_criacao,
              );
              const rifas = notificacao.rifas || [];

              return (
                <ListItem
                  key={notificacao.id}
                  sx={{
                    mb: 1.5,
                    p: 1.75,
                    bgcolor: config.bgcolor,
                    borderRadius: 2,
                    border: `1px solid ${config.borderColor}`,
                    borderLeft: `4px solid ${config.borderColor}`,
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <Stack direction="row" spacing={1.25} sx={{ width: "100%" }}>
                    <Avatar
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        bgcolor: config.color,
                        color: "#FFFFFF",
                      }}
                    >
                      {renderIconeNotificacao(tipo)}
                    </Avatar>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          color: config.color,
                          fontWeight: 950,
                          lineHeight: 1.2,
                        }}
                      >
                        {obterTituloNotificacao(notificacao)}
                      </Typography>

                      {dataFormatada && (
                        <Typography
                          sx={{
                            color: "#526760",
                            fontSize: "0.78rem",
                            mt: 0.2,
                          }}
                        >
                          {dataFormatada}
                        </Typography>
                      )}
                    </Box>
                  </Stack>

                  <Typography
                    sx={{
                      mt: 1.35,
                      color: "#021B16",
                      fontSize: "0.9rem",
                      lineHeight: 1.4,
                      fontWeight: 750,
                    }}
                  >
                    {notificacao.mensagem || "Sem motivo informado."}
                  </Typography>

                  {rifas.length > 0 && (
                    <Box sx={{ mt: 1.4 }}>
                      <Typography
                        sx={{
                          color: "#526760",
                          fontSize: "0.76rem",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {config.rifasLabel}
                      </Typography>

                      <Stack
                        direction="row"
                        flexWrap="wrap"
                        gap={0.65}
                        sx={{ mt: 0.8 }}
                      >
                        {rifas.map((rifa) => (
                          <Chip
                            key={rifa}
                            label={rifa}
                            size="small"
                            sx={{
                              borderRadius: 2,
                              color: config.color,
                              bgcolor: config.chipBg,
                              border: `1px solid ${config.borderColor}`,
                              fontWeight: 850,
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </ListItem>
              );
            })
          )}
        </List>
      </Box>
    </Drawer>
  );
}
