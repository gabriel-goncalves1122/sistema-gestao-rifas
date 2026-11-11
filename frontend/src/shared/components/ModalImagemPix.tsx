import { Dialog, Box, IconButton, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState } from "react";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "@/shared/config/firebase";

/**
 * Interface de propriedades do componente `ModalImagemPix`.
 */
export interface ModalImagemPixProps {
  /** URL pública ou caminho no Storage (fullPath) do comprovante Pix, ou null para manter fechado. */
  url: string | null;
  /** Callback acionado ao solicitar o fechamento do diálogo de zoom do comprovante. */
  onClose: () => void;
}

/**
 * Componente de visualização universal para comprovantes Pix na Tesouraria.
 * Suporta tanto URLs completas (HTTP/HTTPS/DataURL) quanto caminhos do Storage (ex: 'comprovantes/...').
 * Renderiza nativamente imagens (JPG, PNG, WEBP, HEIC) e documentos PDF via iframe responsivo.
 *
 * @param {ModalImagemPixProps} props - Propriedades do modal de visualização.
 * @returns {JSX.Element}
 */
export function ModalImagemPix({ url, onClose }: ModalImagemPixProps) {
  const [urlResolvida, setUrlResolvida] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!url) {
      setUrlResolvida(null);
      setCarregando(false);
      return;
    }

    // Se já é uma URL completa ou base64, usa diretamente
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      setUrlResolvida(url);
      setCarregando(false);
      return;
    }

    // Se for um caminho de referência no storage (ex: comprovantes/123_arquivo.pdf)
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
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, [url]);

  const urlEfetiva = urlResolvida;

  const isPdf =
    typeof urlEfetiva === "string" &&
    (/\.pdf(\?|$)/i.test(urlEfetiva) ||
      urlEfetiva.includes("application%2Fpdf") ||
      urlEfetiva.startsWith("data:application/pdf"));

  return (
    <Dialog open={Boolean(url)} onClose={onClose} maxWidth="md" fullWidth>
      <Box
        sx={{
          position: "relative",
          backgroundColor: isPdf ? "#ffffff" : "#000000",
          minHeight: "300px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {carregando && (
          <CircularProgress sx={{ color: "#0B7A61" }} />
        )}

        {!carregando && urlEfetiva && isPdf && (
          <Box sx={{ position: "absolute", top: 10, left: 12, zIndex: 10 }}>
            <a
              href={urlEfetiva}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 12px",
                borderRadius: 8,
                backgroundColor: "rgba(11, 122, 97, 0.1)",
                color: "#0B7A61",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 700,
              }}
            >
              Abrir PDF em nova aba ↗
            </a>
          </Box>
        )}

        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 10,
            color: isPdf ? "rgba(0,0,0,0.7)" : "white",
            backgroundColor: isPdf ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.5)",
            "&:hover": {
              backgroundColor: isPdf ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.7)",
            },
          }}
        >
          <CloseIcon />
        </IconButton>

        {!carregando && urlEfetiva && isPdf ? (
          <Box
            sx={{
              width: "100%",
              height: "80vh",
              display: "flex",
              flexDirection: "column",
              pt: 5,
            }}
          >
            <iframe
              src={urlEfetiva}
              title="Comprovante Pix"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          </Box>
        ) : !carregando && urlEfetiva ? (
          <img
            src={urlEfetiva}
            alt="Comprovante Pix"
            style={{
              maxWidth: "100%",
              maxHeight: "80vh",
              objectFit: "contain",
            }}
          />
        ) : null}
      </Box>
    </Dialog>
  );
}
