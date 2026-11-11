import { Dialog, Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/**
 * Interface de propriedades do componente `ModalImagemPix`.
 */
export interface ModalImagemPixProps {
  /** URL de download da imagem ou documento PDF do comprovante Pix no Storage, ou null para manter fechado. */
  url: string | null;
  /** Callback acionado ao solicitar o fechamento do diálogo de zoom do comprovante. */
  onClose: () => void;
}

/**
 * Componente de visualização universal (Dumb Component) para comprovantes Pix.
 * Renderiza nativamente imagens (JPG, PNG, WEBP, HEIC) e documentos PDF via iframe responsivo,
 * contendo link de escape para visualização em nova aba.
 *
 * @param {ModalImagemPixProps} props - Propriedades do modal de visualização.
 * @returns {JSX.Element}
 */
export function ModalImagemPix({ url, onClose }: ModalImagemPixProps) {
  const isPdf =
    typeof url === "string" &&
    (/\.pdf(\?|$)/i.test(url) ||
      url.includes("application%2Fpdf") ||
      url.startsWith("data:application/pdf"));

  return (
    <Dialog open={!!url} onClose={onClose} maxWidth="md" fullWidth>
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
        {url && isPdf && (
          <Box sx={{ position: "absolute", top: 10, left: 12, zIndex: 10 }}>
            <a
              href={url}
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

        {url && isPdf ? (
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
              src={url}
              title="Comprovante Pix"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          </Box>
        ) : url ? (
          <img
            src={url}
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
