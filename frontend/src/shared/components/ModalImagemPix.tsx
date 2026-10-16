import { Dialog, Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/**
 * Interface de propriedades do componente `ModalImagemPix`.
 */
export interface ModalImagemPixProps {
  /** URL de download da imagem do comprovante Pix no Storage, ou null para manter fechado. */
  url: string | null;
  /** Callback acionado ao solicitar o fechamento do diálogo de zoom do comprovante. */
  onClose: () => void;
}

/**
 * Componente Dumb de diálogo em tela cheia/modal para visualização ampliada do comprovante Pix anexado.
 *
 * @param {ModalImagemPixProps} props - Propriedades do modal de visualização.
 * @returns {JSX.Element}
 */
export function ModalImagemPix({ url, onClose }: ModalImagemPixProps) {
  return (
    <Dialog open={!!url} onClose={onClose} maxWidth="md" fullWidth>
      <Box
        sx={{
          position: "relative",
          backgroundColor: "#000",
          minHeight: "300px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "white",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <CloseIcon />
        </IconButton>
        {url && (
          <img
            src={url}
            alt="Comprovante Pix"
            style={{
              maxWidth: "100%",
              maxHeight: "80vh",
              objectFit: "contain",
            }}
          />
        )}
      </Box>
    </Dialog>
  );
}
