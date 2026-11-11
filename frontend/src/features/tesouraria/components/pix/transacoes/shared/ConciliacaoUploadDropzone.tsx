import type { ChangeEvent, DragEvent } from "react";
import { useRef } from "react";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import {
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";

/**
 * Propriedades da área de upload/arrastar-e-soltar de extrato bancário na conciliação Pix.
 */
export interface ConciliacaoUploadDropzoneProps {
  /** Indica se um arquivo de extrato está atualmente sendo processado. */
  analisando: boolean;
  /** Callback acionado ao selecionar ou soltar um arquivo `.csv` ou `.ofx`. */
  onSelecionarArquivo: (arquivo: File) => Promise<void>;
}

/**
 * Área interativa de upload de extrato bancário (CSV/OFX) com suporte a arrastar e soltar e feedback de análise.
 *
 * @param {ConciliacaoUploadDropzoneProps} props - Estado de análise e handler de seleção de arquivo.
 * @returns {JSX.Element} Zona de upload para conciliação bancária.
 */
export function ConciliacaoUploadDropzone({
  analisando,
  onSelecionarArquivo,
}: ConciliacaoUploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelecionarArquivo(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onSelecionarArquivo(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <Box
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      sx={{
        p: 5,
        border: `2px dashed ${colors.bordaDestaque}`,
        borderRadius: 3,
        textAlign: "center",
        bgcolor: colors.fundoSuave,
        cursor: "pointer",
        transition: "border 0.2s, background 0.2s",
        "&:hover": {
          bgcolor: colors.verdeHover,
          borderColor: colors.verdeForte,
        },
      }}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept=".csv,.ofx"
        onChange={handleFileChange}
      />

      {analisando ? (
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={44} sx={{ color: colors.verdeForte }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Cruzando transações do extrato com o sistema...
          </Typography>
          <Typography variant="body2" sx={{ color: colors.cinzaTexto }}>
            Validando txids, identificadores bancários e similaridade de pagadores.
          </Typography>
        </Stack>
      ) : (
        <Stack spacing={1.5} alignItems="center">
          <IconButton
            sx={{
              bgcolor: colors.verdeClaro,
              color: colors.verdeForte,
              width: 60,
              height: 60,
            }}
          >
            <CloudUploadOutlinedIcon sx={{ fontSize: 32 }} />
          </IconButton>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800, color: colors.verdeEscuro }}
          >
            Clique para selecionar ou arraste o extrato aqui
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: colors.cinzaTexto, maxWidth: 450 }}
          >
            Extratos exportados pelo aplicativo ou painel web da{" "}
            <strong>InfinitePay</strong> (formato <strong>.CSV</strong> ou{" "}
            <strong>.OFX</strong>).
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
