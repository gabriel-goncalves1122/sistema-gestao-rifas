// ============================================================================
// ARQUIVO: frontend/src/views/pages/DashboardPage.tsx
// ============================================================================
import { useEffect, useState } from "react";
import {
  Box,
  Container,
  useMediaQuery,
  useTheme,
} from "@mui/material";

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
import { useQueryClient } from "@tanstack/react-query";
import { pixTransacoesService } from "@/features/tesouraria/services/pixTransacoesService";
import { desempenhoService } from "@/features/tesouraria/services/desempenhoService";
import { auditoriaComprasService } from "@/features/tesouraria/services/auditoriaComprasService";
import { relatorioTesourariaService } from "@/features/tesouraria/services/relatorioTesourariaService";
import { secretariaService } from "@/features/secretaria/membros/services/secretariaService";
import { documentosSecretariaService } from "@/features/secretaria/documentos/services/documentosSecretariaService";

export type Contexto = "aderido" | "tesouraria" | "secretaria";

export function DashboardPage() {
  const { usuarioAtual, handleLogout, loading } = useAuthController();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const cargo = usuarioAtual?.cargo;

  // Admin e presidência mantêm acesso completo aos contextos administrativos.
  const isSuperAdmin = cargo === "admin" || cargo === "presidencia";

  const hasTesourariaAccess = isSuperAdmin || cargo === "tesouraria";
  const hasSecretariaAccess = isSuperAdmin || cargo === "secretaria";

  const [menuAberto, setMenuAberto] = useState(false);

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

  const queryClient = useQueryClient();

  // Prefetching inteligente das telas de tesouraria ao entrar no painel
  useEffect(() => {
    if (contextoAtual === "tesouraria" && hasTesourariaAccess) {
      queryClient.prefetchQuery({
        queryKey: ["tesouraria", "pix"],
        staleTime: 180_000,
        queryFn: async () => {
          const [resultadoTransacoes, resultadoResumo] = await Promise.allSettled([
            pixTransacoesService.buscarTransacoes(),
            pixTransacoesService.buscarResumo(),
          ]);
          return {
            transacoes: resultadoTransacoes.status === "fulfilled" ? resultadoTransacoes.value : [],
            resumo: resultadoResumo.status === "fulfilled" ? resultadoResumo.value : null,
          };
        },
      });

      queryClient.prefetchQuery({
        queryKey: ["tesouraria", "relatorio"],
        staleTime: 180_000,
        queryFn: async () => {
          return await relatorioTesourariaService.obterRelatorioTesouraria();
        },
      });

      queryClient.prefetchQuery({
        queryKey: ["tesouraria", "desempenho"],
        staleTime: 180_000,
        queryFn: async () => {
          const [resultadoRelatorio, resultadoHistorico] = await Promise.allSettled([
            desempenhoService.buscarRelatorio(),
            desempenhoService.buscarHistoricoDetalhado(),
          ]);
          return {
            resumoGeral: resultadoRelatorio.status === "fulfilled" ? resultadoRelatorio.value.resumoGeral : null,
            aderidos: resultadoRelatorio.status === "fulfilled" ? resultadoRelatorio.value.aderidos : [],
            historicoTransacoes: resultadoHistorico.status === "fulfilled" ? resultadoHistorico.value : [],
          };
        },
      });

      queryClient.prefetchQuery({
        queryKey: ["tesouraria", "auditoria-historico"],
        staleTime: 180_000,
        queryFn: async () => {
          return await auditoriaComprasService.buscarHistoricoDetalhado();
        },
      });
    }

    if (contextoAtual === "secretaria" && hasSecretariaAccess) {
      queryClient.prefetchQuery({
        queryKey: ["secretaria", "membros"],
        staleTime: 180_000,
        queryFn: () => secretariaService.buscarAderidos(),
      });

      queryClient.prefetchQuery({
        queryKey: ["secretaria", "documentos"],
        staleTime: 180_000,
        queryFn: () => documentosSecretariaService.listarDocumentos(),
      });
    }
  }, [contextoAtual, hasTesourariaAccess, hasSecretariaAccess, queryClient]);

  const limiteAbasPorContexto: Record<Contexto, number> = {
    aderido: 1,
    tesouraria: 2,
    secretaria: 1,
  };

  const abaSegura =
    abaAtual > limiteAbasPorContexto[contextoAtual] ? 0 : abaAtual;

  const mudarContexto = (novoContexto: Contexto) => {
    setContextoAtual(novoContexto);
    setAbaAtual(0);
  };

  const fazerLogout = () => {
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
        onChangeAba={setAbaAtual}
      />

      <DashboardSidebar
        open={menuAberto}
        isSuperAdmin={isSuperAdmin}
        hasTesourariaAccess={hasTesourariaAccess}
        hasSecretariaAccess={hasSecretariaAccess}
        contextoAtual={contextoAtual}
        onClose={() => setMenuAberto(false)}
        onMudarContexto={mudarContexto}
        onLogout={fazerLogout}
      />

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
