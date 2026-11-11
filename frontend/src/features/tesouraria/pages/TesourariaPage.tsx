import { startTransition, useCallback } from "react";
import { Alert, Box, CircularProgress, Snackbar } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";

import { ConciliacaoExtratoDialog } from "../components/pix/transacoes/shared/ConciliacaoExtratoDialog";
import { PixTransacoesDesktopView } from "../components/pix/transacoes/desktop/PixTransacoesDesktopView";
import { PixTransacoesMobileView } from "../components/pix/transacoes/mobile/PixTransacoesMobileView";
import { PixHeader } from "../components/pix/layout/PixHeader";
import { PixTabs } from "../components/pix/layout/PixTabs";
import { PixAderidosTab } from "../components/pix/tabs/PixAderidosTab";
import { PixVisaoGeralTab } from "../components/pix/tabs/PixVisaoGeralTab";
import { usePixController } from "../hooks/usePixController";
import { TesourariaPixAba } from "../types/pixTransacoes";

interface TesourariaPageProps {
  variante?: "desktop" | "mobile";
}

export function TesourariaPage({ variante = "desktop" }: TesourariaPageProps) {
  const {
    resumo,
    transacoes,
    carregando,
    sincronizando,
    pixProps,
    abaVisivel,
    aderidosServidor,
    conciliacao,
    setAbaAtual,
    onSincronizar,
  } = usePixController({ variante });

  const handleChangeAba = useCallback(
    (novaAba: TesourariaPixAba) => {
      startTransition(() => {
        setAbaAtual(novaAba);
      });
    },
    [setAbaAtual],
  );

  if (carregando) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <PixHeader
        abaAtual={abaVisivel}
        sincronizando={sincronizando}
        onSincronizar={onSincronizar}
      />

      <PixTabs abaAtual={abaVisivel} onChangeAba={handleChangeAba} />

      <Box sx={{ position: "relative", mt: 2 }}>
        <AnimatePresence mode="popLayout">
          {abaVisivel === "visao-geral" && (
            <motion.div
              key="visao-geral"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <PixVisaoGeralTab resumo={resumo} transacoes={transacoes} />
            </motion.div>
          )}

          {abaVisivel === "transacoes" && (
            <motion.div
              key="transacoes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {variante === "mobile" ? (
                <PixTransacoesMobileView {...pixProps} />
              ) : (
                <PixTransacoesDesktopView {...pixProps} />
              )}
            </motion.div>
          )}

          {abaVisivel === "aderidos" && (
            <motion.div
              key="aderidos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <PixAderidosTab
                transacoes={transacoes}
                aderidosServidor={aderidosServidor}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      <ConciliacaoExtratoDialog
        aberto={conciliacao.aberto}
        onFechar={conciliacao.fecharDialog}
        arquivo={conciliacao.arquivo}
        analisando={conciliacao.analisando}
        aprovando={conciliacao.aprovando}
        resultado={conciliacao.resultado}
        selecionados={conciliacao.selecionados}
        erro={conciliacao.erro}
        onSelecionarArquivo={conciliacao.processarArquivo}
        onToggleSelecao={conciliacao.toggleSelecao}
        onToggleTodos={conciliacao.toggleTodos}
        onConfirmarAprovacao={conciliacao.confirmarAprovacaoLote}
        onLimpar={conciliacao.limparEstado}
        valorTotalSelecionado={conciliacao.valorTotalSelecionado}
      />

      <Snackbar
        open={Boolean(conciliacao.feedbackSucesso)}
        autoHideDuration={6000}
        onClose={conciliacao.fecharFeedbackSucesso}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={conciliacao.fecharFeedbackSucesso}
          severity="success"
          variant="filled"
          sx={{ borderRadius: 2, fontWeight: 850 }}
        >
          {conciliacao.feedbackSucesso}
        </Alert>
      </Snackbar>
    </Box>
  );
}
