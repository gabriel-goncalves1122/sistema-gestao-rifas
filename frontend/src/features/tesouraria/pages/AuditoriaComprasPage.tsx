import { Box, CircularProgress } from "@mui/material";

import { FeedbackSnackbar } from "@/shared/components/FeedbackSnackbar";
import { ModalImagemPix } from "@/shared/components/ModalImagemPix";

import { AuditoriaComprasTable } from "../components/auditoriaCompras/desktop/AuditoriaComprasTable";
import { AuditoriaComprasCardList } from "../components/auditoriaCompras/mobile/AuditoriaComprasCardList";
import { AuditoriaCompraDetalhesDialog } from "../components/auditoriaCompras/shared/AuditoriaCompraDetalhesDialog";
import { AuditoriaCompraEdicaoDialog } from "../components/auditoriaCompras/shared/AuditoriaCompraEdicaoDialog";
import { AuditoriaComprasEmptyState } from "../components/auditoriaCompras/shared/AuditoriaComprasEmptyState";
import { AuditoriaComprasFiltros } from "../components/auditoriaCompras/shared/AuditoriaComprasFiltros";
import { AuditoriaComprasHeader } from "../components/auditoriaCompras/shared/AuditoriaComprasHeader";
import { AuditoriaComprasResumo } from "../components/auditoriaCompras/shared/AuditoriaComprasResumo";
import { useAuditoriaComprasController } from "../hooks/useAuditoriaComprasController";
import { useTesourariaLayout } from "../hooks/useTesourariaLayout";

/**
 * Página principal da aba Histórico (Auditoria de Compras) da Tesouraria.
 * Orquestra filtros com contadores em tempo real, resumo quantitativo enxuto
 * e listagem paginada de histórico para fins estritos de auditoria.
 *
 * @returns {JSX.Element} Interface completa de auditoria de compras.
 */
export function AuditoriaComprasPage() {
  const { isMobile } = useTesourariaLayout();
  const {
    carregando,
    carregarHistorico,
    filtros,
    comprasFiltradas,
    resumo,
    contagens,
    compraSelecionada,
    compraEdicao,
    comprovanteUrl,
    salvandoEdicao,
    erroEdicao,
    reenviandoEmailComprovanteId,
    feedbackEmailComprovante,
    filtrosAtivos,
    possuiResultados,
    setFiltros,
    limparFiltros,
    baixarCSV,
    abrirComprovante,
    fecharComprovante,
    abrirDetalhes,
    fecharDetalhes,
    abrirEdicao,
    fecharEdicao,
    salvarEdicaoComprador,
    reenviarEmailComprovante,
    fecharFeedbackEmailComprovante,
    feedbackAcao,
    fecharFeedbackAcao,
  } = useAuditoriaComprasController();

  if (carregando) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4, px: { xs: 0, sm: 1.25, md: 0.5 } }}>
      <AuditoriaComprasHeader />
      <AuditoriaComprasFiltros
        filtros={filtros}
        filtrosAtivos={filtrosAtivos}
        possuiResultados={possuiResultados}
        contagens={contagens}
        onChangeFiltros={setFiltros}
        onLimparFiltros={limparFiltros}
        onExportarCsv={baixarCSV}
      />
      <AuditoriaComprasResumo resumo={resumo} />

      {comprasFiltradas.length === 0 ? (
        <AuditoriaComprasEmptyState />
      ) : isMobile ? (
        <AuditoriaComprasCardList
          compras={comprasFiltradas}
          onVerComprovante={abrirComprovante}
          onEditar={abrirEdicao}
          onVerDetalhes={abrirDetalhes}
          onReenviarEmailComprovante={reenviarEmailComprovante}
          reenviandoEmailComprovanteId={reenviandoEmailComprovanteId}
        />
      ) : (
        <AuditoriaComprasTable
          compras={comprasFiltradas}
          onVerComprovante={abrirComprovante}
          onEditar={abrirEdicao}
          onVerDetalhes={abrirDetalhes}
          onReenviarEmailComprovante={reenviarEmailComprovante}
          reenviandoEmailComprovanteId={reenviandoEmailComprovanteId}
        />
      )}

      <AuditoriaCompraDetalhesDialog
        compra={compraSelecionada}
        onClose={fecharDetalhes}
        onVerComprovante={abrirComprovante}
      />
      <AuditoriaCompraEdicaoDialog
        compra={compraEdicao}
        salvando={salvandoEdicao}
        erro={erroEdicao}
        onClose={fecharEdicao}
        onSalvar={salvarEdicaoComprador}
      />
      <ModalImagemPix url={comprovanteUrl} onClose={fecharComprovante} />

      {/* Modal de Conciliação Automática por Extrato Bancário */}
      <FeedbackSnackbar
        open={Boolean(feedbackEmailComprovante)}
        mensagem={feedbackEmailComprovante?.mensagem}
        severidade={feedbackEmailComprovante?.tipo}
        autoHideDuration={3600}
        onClose={fecharFeedbackEmailComprovante}
      />

      <FeedbackSnackbar
        open={Boolean(feedbackAcao)}
        mensagem={feedbackAcao?.mensagem}
        severidade={feedbackAcao?.tipo}
        autoHideDuration={3600}
        onClose={fecharFeedbackAcao}
      />
    </Box>
  );
}
