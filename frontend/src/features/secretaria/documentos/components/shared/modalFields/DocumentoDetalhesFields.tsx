import { Stack, TextField } from "@mui/material";
import { components } from "@/shared/tokens/components";
import type { DocumentoFormData, TipoDocumentoCadastro } from "../../../types/documentosSecretariaTypes";
import { SectionTitle } from "@/shared/components/SectionTitle";

export function DocumentoDetalhesFields({
  form,
  tipoCadastro,
  handleChange,
}: {
  form: DocumentoFormData;
  tipoCadastro: TipoDocumentoCadastro;
  handleChange: <K extends keyof DocumentoFormData>(campo: K, valor: DocumentoFormData[K]) => void;
}) {
  return (
    <Stack spacing={1.5}>
      <SectionTitle>Detalhes</SectionTitle>
      {tipoCadastro === "pdf" && (
        <>
          <TextField
            label="Data do documento"
            type="date"
            value={form.dataDocumento}
            onChange={(event) => handleChange("dataDocumento", event.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={components.formField}
          />
          <TextField
            label="Descrição"
            value={form.descricao}
            onChange={(event) => handleChange("descricao", event.target.value)}
            multiline
            minRows={2}
            size="small"
            sx={components.formField}
          />
        </>
      )}

      {tipoCadastro === "planilha" && (
        <>
          <TextField
            label="Período de referência"
            value={form.periodoReferencia}
            onChange={(event) => handleChange("periodoReferencia", event.target.value)}
            size="small"
            sx={components.formField}
          />
          <TextField
            label="Descrição"
            value={form.descricao}
            onChange={(event) => handleChange("descricao", event.target.value)}
            multiline
            minRows={2}
            size="small"
            sx={components.formField}
          />
        </>
      )}

      {tipoCadastro === "imagem" && (
        <>
          <TextField
            label="Texto alternativo"
            value={form.textoAlternativo}
            onChange={(event) => handleChange("textoAlternativo", event.target.value)}
            size="small"
            sx={components.formField}
          />
          <TextField
            label="Crédito da imagem"
            value={form.creditoImagem}
            onChange={(event) => handleChange("creditoImagem", event.target.value)}
            size="small"
            sx={components.formField}
          />
        </>
      )}
    </Stack>
  );
}
