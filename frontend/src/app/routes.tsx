import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import React, { useEffect, useState, Suspense } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";

import { AppLoadingScreen } from "@/shared/components/AppLoadingScreen";
import { PaginaManutencao } from "@/shared/components/PaginaManutencao";
import { auth } from "../shared/config/firebase";
import { useAuthController } from "@/features/auth/hooks/useAuthController";
import { useModoManutencao } from "@/shared/hooks/useModoManutencao";

// ----------------------------------------------------------------------------
// LAZY LOADING (Code Splitting)
// Só carrega os arquivos JS dessas telas quando o usuário realmente precisar.
// ----------------------------------------------------------------------------
const DashboardPage = React.lazy(() =>
  import("../views/pages/DashboardPage").then((m) => ({
    default: m.DashboardPage,
  })),
);
const LoginPage = React.lazy(() =>
  import("@/features/auth/pages/LoginPage").then((m) => ({
    default: m.LoginPage,
  })),
);
const RegisterPage = React.lazy(() =>
  import("@/features/auth/pages/RegisterPage").then((m) => ({
    default: m.RegisterPage,
  })),
);

// ----------------------------------------------------------------------------
// ANIMAÇÃO DE PÁGINA (Framer Motion)
// ----------------------------------------------------------------------------
function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </motion.div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <AppLoadingScreen label="Carregando acesso" />;
  }
  return user ? <>{children}</> : <Navigate to="/" />;
}

export function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuarioAtual, handleLogout } = useAuthController();
  const {
    emManutencao,
    statusManutencao,
    carregandoManutencao,
    isAdminBypass,
    recarregarStatus,
  } = useModoManutencao(usuarioAtual);

  // Enquanto verifica o status de manutenção pela primeira vez
  if (carregandoManutencao) {
    return <AppLoadingScreen label="Verificando disponibilidade" />;
  }

  // Se a manutenção estiver ativa e o usuário não for administrador
  if (emManutencao && !isAdminBypass) {
    const isLoginAdmin =
      (location.pathname === "/login" || location.pathname === "/") &&
      location.search.includes("admin=1");

    // Permite que um administrador deslogado acerte suas credenciais na tela de login
    if (!isLoginAdmin) {
      return (
        <PaginaManutencao
          mensagem={statusManutencao?.mensagem}
          previsaoRetorno={statusManutencao?.previsaoRetorno}
          estaAutenticado={Boolean(usuarioAtual)}
          onTentarNovamente={recarregarStatus}
          onSair={handleLogout}
          onAcessoAdmin={() => navigate("/login?admin=1")}
        />
      );
    }
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <Suspense fallback={<AppLoadingScreen />}>
              <PageTransition>
                <LoginPage />
              </PageTransition>
            </Suspense>
          }
        />
        <Route
          path="/login"
          element={
            <Suspense fallback={<AppLoadingScreen />}>
              <PageTransition>
                <LoginPage />
              </PageTransition>
            </Suspense>
          }
        />
        <Route
          path="/register"
          element={
            <Suspense fallback={<AppLoadingScreen />}>
              <PageTransition>
                <RegisterPage />
              </PageTransition>
            </Suspense>
          }
        />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Suspense
                fallback={<AppLoadingScreen label="Carregando painel" />}
              >
                <PageTransition>
                  <DashboardPage />
                </PageTransition>
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
}
