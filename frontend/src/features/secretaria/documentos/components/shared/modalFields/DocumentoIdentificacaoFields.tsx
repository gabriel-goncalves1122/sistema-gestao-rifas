import { FormControl, InputLabel, MenuItem, Select, Stack, TextField } from "@mui/material";
import { components } from "@/shared/tokens/components";
import { AREAS_DOCUMENTOS_COMISSAO } from "../../../constants/documentosAreas";
import { TIPOS_DOCUMENTOS_COMISSAO } from "../../../constants/documentosTipos";
import type { DocumentoFormData, TipoDocumentoComissao } from "../../../types/documentosSecretariaTypes";
import { SectionTitle } from "@/shared/components/SectionTitle";

export function DocumentoIdentificacaoFields({
  form,
  handleChange,
}: {
  form: DocumentoFormData;
  handleChange: <K extends keyof DocumentoFormData>(campo: K, valor: DocumentoFormData[K]) => void;
}) {
  return (
    <Stack spacing={1.5}>
      <SectionTitle>Identificação</SectionTitle>
      <TextField
        label="Título"
        value={form.titulo}
        onChange={(event) => handleChange("titulo", event.target.value)}
        required
        fullWidth
        size="small"
        sx={components.formField}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <FormControl fullWidth size="small" sx={components.selectField}>
          <InputLabel id="documento-area-form-label">Área</InputLabel>
          <Select
            labelId="documento-area-form-label"
            label="Área"
            value={form.area}
            onChange={(event) =>
              handleChange("area", event.target.value as DocumentoFormData["area"])
            }
          >
            {AREAS_DOCUMENTOS_COMISSAO.map((area) => (
              <MenuItem key={area} value={area}>
                {area}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small" sx={components.selectField}>
          <InputLabel id="documento-tipo-form-label">Tipo</InputLabel>
          <Select
            labelId="documento-tipo-form-label"
            label="Tipo"
            value={form.tipo}
            onChange={(event) =>
              handleChange("tipo", event.target.value as TipoDocumentoComissao)
            }
          >
            {TIPOS_DOCUMENTOS_COMISSAO.map((tipo) => (
              <MenuItem key={tipo.value} value={tipo.value}>
                {tipo.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </Stack>
  );
}
