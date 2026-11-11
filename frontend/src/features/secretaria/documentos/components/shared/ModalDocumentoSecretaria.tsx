import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
} from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

import { colors } from "@/shared/tokens/colors";
import { components } from "@/shared/tokens/components";
import { TIPOS_CADASTRO_DOCUMENTO } from "../../constants/documentosTipos";
import {
  arquivoAceitoParaTipo,
  criarDocumentoFormInicial,
  documentoParaFormData,
  inferirMimeTypeDocumento,
} from "../../utils/documentosSecretariaUtils";
import type {
  DocumentoComissao,
  DocumentoFormData,
  TipoDocumentoCadastro,
} from "../../types/documentosSecretariaTypes";
import { DocumentoArquivoFields } from "./modalFields/DocumentoArquivoFields";
import { DocumentoDetalhesFields } from "./modalFields/DocumentoDetalhesFields";
import { DocumentoIdentificacaoFields } from "./modalFields/DocumentoIdentificacaoFields";

const LIMITE_DOCUMENTO_BYTES = 25 * 1024 * 1024;

interface ModalDocumentoSecretariaProps {
  open: boolean;
  modo: "criar" | "editar";
  tipoCadastro: TipoDocumentoCadastro;
  documento: DocumentoComissao | null;
  onClose: () => void;
  onSalvar: (dados: DocumentoFormData) => Promise<void>;
}

export function ModalDocumentoSecretaria({
  open,
  modo,
  tipoCadastro,
  documento,
  onClose,
  onSalvar,
}: ModalDocumentoSecretariaProps) {
  const [form, setForm] = useState<DocumentoFormData>(() =>
    criarDocumentoFormInicial(tipoCadastro),
  );
  const [saving, setSaving] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setForm(
      modo === "editar" && documento
        ? documentoParaFormData(documento)
        : criarDocumentoFormInicial(tipoCadastro),
    );
    setErroArquivo(null);
    setErroEnvio(null);
  }, [documento, modo, open, tipoCadastro]);

  const tituloModal = useMemo(() => {
    const tipoLabel = TIPOS_CADASTRO_DOCUMENTO[tipoCadastro].label;
    return modo === "editar" ? `Editar ${tipoLabel}` : `Adicionar ${tipoLabel}`;
  }, [modo, tipoCadastro]);

  const handleChange = <K extends keyof DocumentoFormData>(
    campo: K,
    valor: DocumentoFormData[K],
  ) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  };

  const handleSalvar = async () => {
    if (!form.titulo.trim() || !form.nomeArquivo.trim()) return;
    if (modo === "criar" && !form.arquivo) {
      setErroArquivo("Selecione um arquivo para continuar.");
      return;
    }

    setSaving(true);
    setErroEnvio(null);
    try {
      await onSalvar({
        ...form,
        titulo: form.titulo.trim(),
        nomeArquivo: form.nomeArquivo.trim(),
        tamanhoBytes: Number.isFinite(form.tamanhoBytes)
          ? form.tamanhoBytes
          : 0,
      });
    } catch (error) {
      setErroEnvio(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o documento.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleArquivoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!arquivo) {
      return;
    }

    if (arquivo.size > LIMITE_DOCUMENTO_BYTES) {
      setErroArquivo("O arquivo deve ter no máximo 25 MB.");
      return;
    }

    if (!arquivoAceitoParaTipo(arquivo, tipoCadastro)) {
      setErroArquivo(
        `Selecione um arquivo compatível com ${TIPOS_CADASTRO_DOCUMENTO[tipoCadastro].label}.`,
      );
      return;
    }

    setErroArquivo(null);
    setForm((atual) => ({
      ...atual,
      arquivo,
      nomeArquivo: arquivo.name,
      mimeType: inferirMimeTypeDocumento(arquivo),
      tamanhoBytes: arquivo.size,
    }));
  };

  const accept = useMemo(() => {
    if (tipoCadastro === "pdf") return "application/pdf,.pdf";
    if (tipoCadastro === "imagem") {
      return "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";
    }
    return ".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }, [tipoCadastro]);

  const arquivoPronto = modo === "editar" || !!form.arquivo;

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          ...components.surface,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          px: 3,
          py: 2.5,
          color: colors.pretoEsverdeado,
          fontWeight: 950,
          borderBottom: `1px solid ${colors.borda}`,
        }}
      >
        {tituloModal}
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: colors.branco }}>
        <Stack spacing={2.25}>
          {erroEnvio && <Alert severity="error">{erroEnvio}</Alert>}
          <DocumentoIdentificacaoFields form={form} handleChange={handleChange} />

          <Divider />

          <DocumentoArquivoFields
            form={form}
            tipoCadastro={tipoCadastro}
            saving={saving}
            erroArquivo={erroArquivo}
            accept={accept}
            handleArquivoChange={handleArquivoChange}
          />

          <Divider />

          <DocumentoDetalhesFields
            form={form}
            tipoCadastro={tipoCadastro}
            handleChange={handleChange}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, borderTop: `1px solid ${colors.borda}` }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveOutlinedIcon />}
          disabled={saving || !form.titulo.trim() || !form.nomeArquivo.trim() || !arquivoPronto}
          onClick={handleSalvar}
          sx={{ borderRadius: 2, fontWeight: 850 }}
        >
          {saving
            ? "Enviando arquivo..."
            : modo === "editar"
              ? "Salvar alterações"
              : "Adicionar documento"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
