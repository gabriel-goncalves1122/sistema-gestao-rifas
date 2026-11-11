import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import type { ChangeEvent } from "react";
import { colors } from "@/shared/tokens/colors";
import { formatarTamanhoArquivo } from "../../../utils/documentosSecretariaUtils";
import { TIPOS_CADASTRO_DOCUMENTO } from "../../../constants/documentosTipos";
import type { DocumentoFormData, TipoDocumentoCadastro } from "../../../types/documentosSecretariaTypes";
import { SectionTitle } from "@/shared/components/SectionTitle";

export function DocumentoArquivoFields({
  form,
  tipoCadastro,
  saving,
  erroArquivo,
  accept,
  handleArquivoChange,
}: {
  form: DocumentoFormData;
  tipoCadastro: TipoDocumentoCadastro;
  saving: boolean;
  erroArquivo: string | null;
  accept: string;
  handleArquivoChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Stack spacing={1.5}>
      <SectionTitle>Arquivo</SectionTitle>
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          border: `1.5px dashed ${colors.borda}`,
          bgcolor: "#F6F8F7",
        }}
      >
        <Stack spacing={1.25} alignItems="flex-start">
          <Button
            component="label"
            variant="outlined"
            startIcon={<CloudUploadOutlinedIcon />}
            disabled={saving}
            sx={{ borderRadius: 2, fontWeight: 850 }}
          >
            {form.nomeArquivo ? "Trocar arquivo" : "Selecionar arquivo"}
            <input
              hidden
              type="file"
              accept={accept}
              onChange={handleArquivoChange}
              data-testid="documento-upload-input"
            />
          </Button>

          {form.nomeArquivo ? (
            <Typography sx={{ color: colors.pretoEsverdeado, fontWeight: 800 }}>
              {form.nomeArquivo} · {formatarTamanhoArquivo(form.tamanhoBytes)}
            </Typography>
          ) : (
            <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.86rem" }}>
              Escolha um arquivo {TIPOS_CADASTRO_DOCUMENTO[tipoCadastro].label}.
            </Typography>
          )}

          {erroArquivo && (
            <Alert severity="warning" sx={{ width: "100%", borderRadius: 2 }}>
              {erroArquivo}
            </Alert>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
