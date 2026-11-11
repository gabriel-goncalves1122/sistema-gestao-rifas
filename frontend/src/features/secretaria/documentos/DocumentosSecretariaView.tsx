import { Box } from "@mui/material";

import { useResponsiveLayout } from "@/shared/hooks/useResponsiveLayout";
import { DocumentosSecretariaDesktopView } from "./components/desktop/DocumentosSecretariaDesktopView";
import { DocumentosSecretariaMobileView } from "./components/mobile/DocumentosSecretariaMobileView";
import { AdicionarDocumentoMenu } from "./components/shared/AdicionarDocumentoMenu";
import { DocumentoPreviewDialog } from "./components/shared/DocumentoPreviewDialog";
import { ModalDocumentoSecretaria } from "./components/shared/ModalDocumentoSecretaria";
import { useDocumentosSecretaria } from "./hooks/useDocumentosSecretaria";

export function DocumentosSecretariaView() {
  const { isMobile } = useResponsiveLayout();
  const documentosState = useDocumentosSecretaria();
  const {
    documentos,
    documentosFiltrados,
    loading,
    erro,
    busca,
    area,
    preview,
    editor,
    setBusca,
    setArea,
    abrirPreview,
    fecharPreview,
    abrirCriacao,
    abrirEdicao,
    fecharEditor,
    salvarDocumento,
  } = documentosState;

  const View = isMobile
    ? DocumentosSecretariaMobileView
    : DocumentosSecretariaDesktopView;

  return (
    <Box sx={{ pb: 10 }}>
      <View
        documentos={documentosFiltrados}
        total={documentos.length}
        loading={loading}
        erro={erro}
        busca={busca}
        area={area}
        onBuscaChange={setBusca}
        onAreaChange={setArea}
        onAbrirDocumento={abrirPreview}
        onEditarDocumento={abrirEdicao}
      />

      <AdicionarDocumentoMenu onSelecionarTipo={abrirCriacao} />

      <DocumentoPreviewDialog
        open={preview.open}
        documento={preview.documento}
        fullScreen={isMobile}
        url={preview.url}
        loading={preview.loading}
        erro={preview.erro}
        onClose={fecharPreview}
        onEditar={abrirEdicao}
      />

      <ModalDocumentoSecretaria
        open={editor.open}
        modo={editor.modo}
        tipoCadastro={editor.tipoCadastro}
        documento={editor.documento}
        onClose={fecharEditor}
        onSalvar={salvarDocumento}
      />
    </Box>
  );
}
