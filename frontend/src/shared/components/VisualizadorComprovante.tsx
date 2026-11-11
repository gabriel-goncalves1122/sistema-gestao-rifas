import { useEffect, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { getDownloadURL, ref } from "firebase/storage";

import { storage } from "@/shared/config/firebase";
import { colors } from "@/shared/tokens/colors";

export interface VisualizadorComprovanteProps {
  /** URL pública (HTTP/HTTPS/Data) ou caminho de referência no Firebase Storage (ex: 'comprovantes/...'). */
  url?: string | null;
  /** Altura máxima do container de visualização */
  alturaMaxima?: number | string;
  /** Rótulo contextual do comprovante */
  titulo?: string;
}

/**
 * Visualizador universal de comprovantes e documentos financeiros anexados.
 * Suporta formatos de imagem vetoriais (SVG), raster (PNG, JPG, WEBP) e documentos PDF,
 * com resolução automática de referências do Firebase Storage e ações de abertura externa.
 */
export function VisualizadorComprovante({
  url,
  alturaMaxima = 520,
  titulo = "Comprovante de pagamento",
}: VisualizadorComprovanteProps) {
  const [urlResolvida, setUrlResolvida] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState(false);

  useEffect(() => {
    setErroCarregamento(false);

    if (!url) {
      setUrlResolvida(null);
      setCarregando(false);
      return;
    }

    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("data:")
    ) {
      setUrlResolvida(url);
      setCarregando(false);
      return;
    }

    let ativo = true;
    setCarregando(true);

    const storageRef = ref(storage, url);
    getDownloadURL(storageRef)
      .then((downloadUrl) => {
        if (ativo) {
          setUrlResolvida(downloadUrl);
          setCarregando(false);
        }
      })
      .catch((err) => {
        console.error("Falha ao resolver URL do comprovante:", err);
        if (ativo) {
          setUrlResolvida(null);
          setErroCarregamento(true);
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, [url]);

  if (!url) {
    return (
      <Paper
        elevation={0}
        sx={{
          height: alturaMaxima,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          bgcolor: "#F8FAFC",
          borderRadius: 2.5,
          border: "1px dashed rgba(2, 27, 22, 0.16)",
          textAlign: "center",
        }}
      >
        <ReceiptLongIcon sx={{ fontSize: 44, color: "#94A3B8", mb: 1 }} />
        <Typography sx={{ fontWeight: 800, color: colors.pretoEsverdeado, fontSize: "0.95rem" }}>
          Nenhum comprovante anexado
        </Typography>
        <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.82rem", mt: 0.5, maxWidth: 280 }}>
          Esta transação não possui arquivo ou comprovante vinculado.
        </Typography>
      </Paper>
    );
  }

  if (carregando) {
    return (
      <Box
        sx={{
          height: alturaMaxima,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#F8FAFC",
          borderRadius: 2.5,
          border: "1px solid rgba(2, 27, 22, 0.08)",
        }}
      >
        <CircularProgress size={36} sx={{ color: colors.verdeEscuro }} />
        <Typography sx={{ mt: 1.5, fontSize: "0.82rem", color: colors.cinzaTexto, fontWeight: 600 }}>
          Carregando comprovante...
        </Typography>
      </Box>
    );
  }

  if (erroCarregamento || !urlResolvida) {
    return (
      <Paper
        elevation={0}
        sx={{
          height: alturaMaxima,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          bgcolor: "#FEF2F2",
          borderRadius: 2.5,
          border: "1px solid #FECACA",
          textAlign: "center",
        }}
      >
        <Typography sx={{ fontWeight: 800, color: "#991B1B", fontSize: "0.95rem" }}>
          Falha ao carregar comprovante
        </Typography>
        <Typography sx={{ color: "#7F1D1D", fontSize: "0.82rem", mt: 0.5 }}>
          Não foi possível exibir o arquivo de imagem/documento.
        </Typography>
      </Paper>
    );
  }

  const isPdf =
    /\.pdf(\?|$)/i.test(urlResolvida) ||
    urlResolvida.includes("application%2Fpdf") ||
    urlResolvida.startsWith("data:application/pdf");

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: alturaMaxima,
        bgcolor: "#FFFFFF",
        borderRadius: 2.5,
        border: "1px solid rgba(2, 27, 22, 0.12)",
        overflow: "hidden",
      }}
    >
      {/* Barra de título e ações do comprovante */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          px: 1.75,
          py: 1,
          bgcolor: "#F8FAFC",
          borderBottom: "1px solid rgba(2, 27, 22, 0.08)",
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", color: colors.pretoEsverdeado }}>
          {titulo}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            component="a"
            href={urlResolvida}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
            sx={{
              fontSize: "0.76rem",
              fontWeight: 750,
              color: colors.verdeEscuro,
              textTransform: "none",
              py: 0.25,
            }}
          >
            Abrir original
          </Button>
        </Stack>
      </Stack>

      {/* Conteúdo do visualizador */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          p: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: isPdf ? "#FFFFFF" : "#F1F5F9",
          overflow: "auto",
        }}
      >
        {isPdf ? (
          <iframe
            src={urlResolvida}
            title={titulo}
            style={{
              width: "100%",
              height: "100%",
              minHeight: 380,
              border: "none",
              borderRadius: 6,
            }}
          />
        ) : (
          <Box
            component="img"
            src={urlResolvida}
            alt={titulo}
            sx={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: 1.5,
              boxShadow: "0 4px 14px rgba(2, 27, 22, 0.08)",
              bgcolor: "#FFFFFF",
            }}
          />
        )}
      </Box>
    </Box>
  );
}
