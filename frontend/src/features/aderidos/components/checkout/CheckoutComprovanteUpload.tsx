// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/CheckoutComprovanteUpload.tsx
// ============================================================================

import { useState } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import {
  ResultadoValidacaoArquivo,
  validarArquivoComprovante,
} from "@/shared/utils/validadorComprovante";

interface CheckoutComprovanteUploadProps {
  arquivoSelecionado: File | null;
  onArquivoValido: (arquivo: File | null, resultado: ResultadoValidacaoArquivo | null) => void;
  disabled?: boolean;
}

export function CheckoutComprovanteUpload({
  arquivoSelecionado,
  onArquivoValido,
  disabled = false,
}: CheckoutComprovanteUploadProps) {
  const [validando, setValidando] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ehPdf, setEhPdf] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setValidando(true);
    setErroValidacao(null);

    const resultado = await validarArquivoComprovante(file);

    setValidando(false);

    if (!resultado.valido) {
      setErroValidacao(resultado.erro || "Arquivo inválido.");
      setPreviewUrl(null);
      setEhPdf(false);
      onArquivoValido(null, null);
      return;
    }

    setEhPdf(Boolean(resultado.ehPdf));

    if (!resultado.ehPdf) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    onArquivoValido(file, resultado);
  };

  const handleRemover = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setEhPdf(false);
    setErroValidacao(null);
    onArquivoValido(null, null);
  };

  const formatarTamanho = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: "0.86rem",
          color: colors.pretoEsverdeado,
          mb: 0.75,
        }}
      >
        Comprovante de pagamento (PDF ou Imagem)
      </Typography>

      {!arquivoSelecionado ? (
        <Button
          component="label"
          fullWidth
          variant="outlined"
          disabled={disabled || validando}
          startIcon={
            validando ? (
              <CircularProgress size={18} sx={{ color: colors.verdeEscuro }} />
            ) : (
              <CloudUploadIcon sx={{ color: colors.verdeEscuro }} />
            )
          }
          sx={{
            py: 1.5,
            px: 2,
            borderRadius: 2,
            borderStyle: "dashed",
            borderWidth: 1.5,
            borderColor: colors.bordaDestaque,
            bgcolor: colors.fundoSuave,
            textTransform: "none",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "0.88rem",
            color: colors.verdeEscuro,
            "&:hover": {
              borderColor: colors.verdeEscuro,
              bgcolor: colors.verdeClaro,
            },
          }}
        >
          {validando ? "Validando arquivo..." : "Clique para anexar comprovante"}
          <input
            hidden
            type="file"
            accept="image/*,application/pdf,.heic,.heif"
            onChange={handleFileChange}
          />
        </Button>
      ) : (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: colors.verdeClaro,
            border: `1px solid ${colors.bordaDestaque}`,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
              {ehPdf ? (
                <PictureAsPdfIcon sx={{ color: colors.erroTexto, fontSize: 32 }} />
              ) : previewUrl ? (
                <Box
                  component="img"
                  src={previewUrl}
                  alt="Pré-visualização do comprovante"
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 1.5,
                    objectFit: "cover",
                    border: `1px solid ${colors.borda}`,
                  }}
                />
              ) : (
                <CheckCircleOutlineIcon sx={{ color: colors.verdeEscuro, fontSize: 28 }} />
              )}

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  noWrap
                  sx={{
                    fontWeight: 850,
                    fontSize: "0.85rem",
                    color: colors.pretoEsverdeado,
                  }}
                >
                  {arquivoSelecionado.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: colors.cinzaTexto,
                    fontWeight: 700,
                  }}
                >
                  {ehPdf ? "Documento PDF" : "Imagem"} • {formatarTamanho(arquivoSelecionado.size)}
                </Typography>
              </Box>
            </Stack>

            <IconButton
              size="small"
              onClick={handleRemover}
              disabled={disabled}
              sx={{ color: colors.erroTexto }}
              aria-label="Remover comprovante"
              title="Remover e escolher outro arquivo"
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      )}

      {erroValidacao && (
        <Alert
          severity="error"
          onClose={() => setErroValidacao(null)}
          sx={{
            mt: 1,
            borderRadius: 2,
            fontSize: "0.82rem",
            bgcolor: colors.erroSuave,
            color: colors.erroTexto,
          }}
        >
          {erroValidacao}
        </Alert>
      )}
    </Box>
  );
}
