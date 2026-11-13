// ============================================================================
// ARQUIVO: frontend/src/views/pages/DashboardPage.tsx
// ============================================================================
import { startTransition, useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Container } from "@mui/material";
import { useModoManutencao } from "@/shared/hooks/useModoManutencao";
import { ModalManutencaoAdmin } from "@/shared/components/ModalManutencaoAdmin";
import { useResponsiveLayout } from "@/shared/hooks/useResponsiveLayout";

import { MinhasRifasTab } from "@/features/aderidos/MinhasRifasTab";
import { useAuthController } from "@/features/auth/hooks/useAuthController";
import { PremiosTab } from "@/features/premios";
import { SecretariaView } from "@/features/secretaria";
import { AuditoriaComprasPage } from "@/features/tesouraria/pages/AuditoriaComprasPage";
import { DesempenhoPage } from "@/features/tesouraria/pages/DesempenhoPage";
import { TesourariaPixPage } from "@/features/tesouraria/pages/TesourariaPixPage";
import { AppLoadingScreen } from "@/shared/components/AppLoadingScreen";
import { DashboardSidebar } from "@/shared/components/DashboardSidebar";
import { DashboardHeader } from "@/views/components/dashboard/DashboardHeader";
import { checkoutStorage } from "@/features/aderidos/utils/checkoutStorage";
import { cancelarCheckoutPendente } from "@/features/aderidos/utils/cancelarCheckoutPendente";
import { useDashboardPrefetch } from "@/views/hooks/useDashboardPrefetch";

export type Contexto = "aderido" | "tesouraria" | "secretaria";

export function DashboardPage() {
  const { usuarioAtual, handleLogout, loading } = useAuthController();
  const { isMobile } = useResponsiveLayout("sm");

  const cargo = usuarioAtual?.cargo;

  // Admin e presidência mantêm acesso completo aos contextos administrativos.
  const isSuperAdmin = cargo === "admin" || cargo === "presidencia";

  const hasTesourariaAccess = isSuperAdmin || cargo === "tesouraria";
  const hasSecretariaAccess = isSuperAdmin || cargo === "secretaria";

  const [menuAberto, setMenuAberto] = useState(false);
  const [modalManutencaoAberto, setModalManutencaoAberto] = useState(false);

  const {
    emManutencao,
    statusManutencao,
    atualizarManutencao,
    salvandoManutencao,
  } = useModoManutencao(usuarioAtual);

  const [contextoAtual, setContextoAtual] = useState<Contexto>(() => {
    return (
      (sessionStorage.getItem("dashboard_contexto") as Contexto) || "aderido"
    );
  });

  const [abaAtual, setAbaAtual] = useState<number>(() => {
    const abaSalva = sessionStorage.getItem("dashboard_aba");

    return abaSalva !== null ? Number.parseInt(abaSalva, 10) : 0;
  });

  // Garante que o usuário não permaneça em um contexto sem permissão após login,
  // refresh ou troca manual de sessão.
  useEffect(() => {
    if (!usuarioAtual) return;

    if (contextoAtual === "tesouraria" && !hasTesourariaAccess) {
      setContextoAtual("aderido");
      setAbaAtual(0);
    }

    if (contextoAtual === "secretaria" && !hasSecretariaAccess) {
      setContextoAtual("aderido");
      setAbaAtual(0);
    }
  }, [usuarioAtual, contextoAtual, hasTesourariaAccess, hasSecretariaAccess]);

  // Mantém a última navegação do usuário dentro do painel.
  useEffect(() => {
    sessionStorage.setItem("dashboard_contexto", contextoAtual);
    sessionStorage.setItem("dashboard_aba", abaAtual.toString());
  }, [contextoAtual, abaAtual]);

  useDashboardPrefetch({
    contextoAtual,
    usuarioUid: usuarioAtual?.uid,
    hasTesourariaAccess,
    hasSecretariaAccess,
  });

  const limiteAbasPorContexto: Record<Contexto, number> = {
    aderido: 1,
    tesouraria: 2,
    secretaria: 1,
  };

  const abaSegura =
    abaAtual > limiteAbasPorContexto[contextoAtual] ? 0 : abaAtual;

  const mudarAba = useCallback((novaAba: number) => {
    startTransition(() => {
      setAbaAtual(novaAba);
    });
  }, []);

  const mudarContexto = useCallback((novoContexto: Contexto) => {
    startTransition(() => {
      setContextoAtual(novoContexto);
      setAbaAtual(0);
    });
  }, []);

  const fazerLogout = async () => {
    await cancelarCheckoutPendente();
    sessionStorage.clear();
    checkoutStorage.clear();
    handleLogout();
  };

  if (loading) {
    return <AppLoadingScreen label="Carregando painel" />;
  }

  return (
    <Box
      data-testid="dashboard-shell"
      sx={{
        position: "relative",
        flexGrow: 1,
        minHeight: "100dvh",
        bgcolor: "background.default",
        overscrollBehaviorY: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <DashboardHeader
        contextoAtual={contextoAtual}
        abaAtual={abaSegura}
        isMobile={isMobile}
        onOpenMenu={() => setMenuAberto(true)}
        onChangeAba={mudarAba}
      />

      <DashboardSidebar
        open={menuAberto}
        isSuperAdmin={isSuperAdmin}
        hasTesourariaAccess={hasTesourariaAccess}
        hasSecretariaAccess={hasSecretariaAccess}
        contextoAtual={contextoAtual}
        emManutencao={emManutencao}
        onAbrirManutencao={() => setModalManutencaoAberto(true)}
        onClose={() => setMenuAberto(false)}
        onMudarContexto={mudarContexto}
        onLogout={fazerLogout}
      />

      {isSuperAdmin && emManutencao && (
        <Container maxWidth="lg" sx={{ mt: 2, mb: 1 }}>
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setModalManutencaoAberto(true)}
                sx={{ fontWeight: 700 }}
              >
                Gerenciar
              </Button>
            }
          >
            <strong>Modo de Manutenção ATIVO:</strong> Apenas administradores e presidência
            estão acessando o sistema. Aderidos e visitantes veem a tela institucional de manutenção.
          </Alert>
        </Container>
      )}

      {isSuperAdmin && (
        <ModalManutencaoAdmin
          open={modalManutencaoAberto}
          onClose={() => setModalManutencaoAberto(false)}
          statusAtual={statusManutencao}
          onSalvar={atualizarManutencao}
          salvando={salvandoManutencao}
        />
      )}

      <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
        {contextoAtual === "aderido" && (
          <Box sx={{ display: abaSegura === 0 ? "block" : "none" }}>
            <MinhasRifasTab />
          </Box>
        )}

        {contextoAtual === "aderido" && abaSegura === 1 && (
          <PremiosTab isAdmin={isSuperAdmin} />
        )}

        {contextoAtual === "tesouraria" &&
          abaSegura === 0 &&
          hasTesourariaAccess && <TesourariaPixPage />}

        {contextoAtual === "tesouraria" &&
          abaSegura === 1 &&
          hasTesourariaAccess && <DesempenhoPage />}

        {contextoAtual === "tesouraria" &&
          abaSegura === 2 &&
          hasTesourariaAccess && <AuditoriaComprasPage />}

        {contextoAtual === "secretaria" && hasSecretariaAccess && (
          <SecretariaView abaAtual={abaSegura} />
        )}
      </Container>
    </Box>
  );
}
