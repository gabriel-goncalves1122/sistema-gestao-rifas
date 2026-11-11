import { Box, Button, Chip, Container, Paper, Typography } from "@mui/material";
import BuildCircleOutlinedIcon from "@mui/icons-material/BuildCircleOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import LogoutIcon from "@mui/icons-material/Logout";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";

export interface PaginaManutencaoProps {
  /** Mensagem explicativa customizada exibida aos usuários. */
  mensagem?: string;
  /** Previsão estimada de retorno do sistema (opcional). */
  previsaoRetorno?: string | null;
  /** Se o visitante atual está logado no sistema (permite botão de logout). */
  estaAutenticado?: boolean;
  /** Callback para recarregar o status ou atualizar a página. */
  onTentarNovamente?: () => void;
  /** Callback para deslogar da conta caso o usuário esteja autenticado. */
  onSair?: () => void;
  /** Callback para acionar a entrada de administradores (redireciona para /login?admin=1). */
  onAcessoAdmin?: () => void;
}

/**
 * Tela institucional de Manutenção Programada do sistema.
 * Exibida a todos os usuários comuns e visitantes enquanto o modo de manutenção estiver ativo.
 */
export function PaginaManutencao({
  mensagem = "Estamos realizando uma manutenção programada para melhorias no sistema. Voltaremos em breve!",
  previsaoRetorno,
  estaAutenticado = false,
  onTentarNovamente,
  onSair,
  onAcessoAdmin,
}: PaginaManutencaoProps) {
  const handleRecarregar = () => {
    if (onTentarNovamente) {
      onTentarNovamente();
    } else {
      window.location.reload();
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        width: "100%",
        backgroundColor: "#F6F8F7",
        pt: { xs: "max(24px, env(safe-area-inset-top))", sm: 4 },
        pb: { xs: "max(24px, env(safe-area-inset-bottom))", sm: 4 },
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            textAlign: "center",
            border: "1px solid rgba(11, 47, 36, 0.08)",
            boxShadow: "0 12px 32px -8px rgba(11, 47, 36, 0.08)",
            backgroundColor: "#FFFFFF",
          }}
        >
          {/* Logo da Comissão */}
          <Box
            component="img"
            src="/images/PNG (1080x1080).png"
            alt="Comissão de Formatura"
            sx={{
              width: 72,
              height: 72,
              objectFit: "contain",
              mb: 2,
            }}
          />

          {/* Ícone e Título */}
          <Box
            sx={{
              display: "inline-flex",
              p: 1.5,
              borderRadius: "50%",
              backgroundColor: "rgba(11, 47, 36, 0.06)",
              color: "#0B2F24",
              mb: 2,
            }}
          >
            <BuildCircleOutlinedIcon sx={{ fontSize: 40 }} />
          </Box>

          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontWeight: 800,
              color: "#0B2F24",
              letterSpacing: "-0.02em",
              mb: 1.5,
            }}
          >
            Manutenção Programada
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: "#526760",
              lineHeight: 1.6,
              mb: 3,
            }}
          >
            {mensagem}
          </Typography>

          {/* Chip de Previsão de Retorno */}
          {previsaoRetorno && (
            <Box sx={{ mb: 3 }}>
              <Chip
                label={`Previsão de retorno: ${previsaoRetorno}`}
                sx={{
                  backgroundColor: "rgba(11, 47, 36, 0.08)",
                  color: "#0B2F24",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  py: 1,
                }}
              />
            </Box>
          )}

          {/* Botões de Ação */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1.5,
              justifyContent: "center",
              mt: 2,
            }}
          >
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRecarregar}
              sx={{
                backgroundColor: "#0B2F24",
                "&:hover": { backgroundColor: "#063D31" },
                py: 1.2,
                px: 3,
                borderRadius: 2.5,
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              Verificar Novamente
            </Button>

            {estaAutenticado && onSair && (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={onSair}
                sx={{
                  color: "#526760",
                  borderColor: "rgba(11, 47, 36, 0.2)",
                  py: 1.2,
                  px: 2.5,
                  borderRadius: 2.5,
                  fontWeight: 600,
                  textTransform: "none",
                }}
              >
                Sair da Conta
              </Button>
            )}
          </Box>

          {/* Link Discreto de Acesso Administrativo */}
          {onAcessoAdmin && (
            <Box sx={{ mt: 4, pt: 2, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <Button
                size="small"
                variant="text"
                startIcon={<AdminPanelSettingsOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={onAcessoAdmin}
                sx={{
                  color: "#8FA39D",
                  fontSize: "0.75rem",
                  textTransform: "none",
                  fontWeight: 500,
                  "&:hover": { color: "#0B2F24", backgroundColor: "transparent" },
                }}
              >
                Acesso Administrativo
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
