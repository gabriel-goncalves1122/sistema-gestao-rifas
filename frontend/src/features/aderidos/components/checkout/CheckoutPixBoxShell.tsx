// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/CheckoutPixBoxShell.tsx
// ============================================================================
import type { ReactNode } from "react";
import CloseIcon from "@mui/icons-material/Close";
import PixIcon from "@mui/icons-material/Pix";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";

import type { CheckoutPixCobranca } from "../../types/checkoutPix";
import type { PixStatus } from "../../hooks/usePixStateMachine";
import { colors } from "@/shared/tokens/colors";
import {
  CheckoutPixCanceledNotice,
  CheckoutPixConfirmed,
  CheckoutPixEmpty,
  CheckoutPixError,
  CheckoutPixExpiredNotice,
  CheckoutPixLoading,
} from "./states/CheckoutPixFeedbackStates";

/**
 * Extrai a fonte da imagem do QR Code a partir de uma cobrança Pix.
 *
 * @param {CheckoutPixCobranca} cobranca - Objeto da cobrança ativa.
 * @returns {string} URL pública da imagem ou data URI Base64, ou string vazia se ausente.
 */
export function obterQrCodeSrc(cobranca: CheckoutPixCobranca): string {
  if (cobranca.qrCodeImagemUrl) return cobranca.qrCodeImagemUrl;
  if (cobranca.qrCodeBase64) {
    return `data:image/png;base64,${cobranca.qrCodeBase64}`;
  }
  return "";
}

/**
 * Propriedades do aviso de encerramento de cobrança Pix por expiração ou cancelamento.
 */
export interface CheckoutPixTerminalNoticeProps {
  /** Estado terminal atingido ("expirado" ou "cancelado"). */
  status: "expirado" | "cancelado";
  /** Callback opcional para reiniciar a geração da cobrança. */
  onResetPix?: () => void;
}

/**
 * Renderiza a mensagem de expiração ou cancelamento bancário com botão opcional de nova tentativa.
 *
 * @param {CheckoutPixTerminalNoticeProps} props - Estado terminal e callback de reinício.
 * @returns {JSX.Element} Bloco de aviso terminal padronizado.
 */
export function CheckoutPixTerminalNotice({
  status,
  onResetPix,
}: CheckoutPixTerminalNoticeProps) {
  return (
    <Stack spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
      {status === "expirado" ? (
        <CheckoutPixExpiredNotice />
      ) : (
        <CheckoutPixCanceledNotice />
      )}

      {onResetPix && (
        <Button
          onClick={onResetPix}
          variant="contained"
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 900,
            bgcolor: colors.verdeEscuro,
            color: colors.branco,
            px: 3,
            py: 1.25,
            "&:hover": { bgcolor: colors.verdeEscuroHover },
          }}
        >
          Tentar novamente
        </Button>
      )}
    </Stack>
  );
}

/**
 * Propriedades do container compartilhado dos painéis de pagamento Pix no checkout.
 */
export interface CheckoutPixBoxShellProps {
  /** Título exibido no cabeçalho da caixa de pagamento Pix. */
  titulo: string;
  /** Cobrança Pix ativa gerada no backend. */
  cobranca?: CheckoutPixCobranca | null;
  /** Indica geração de cobrança em andamento. */
  gerando?: boolean;
  /** Indica bloqueio adicional de cancelamento durante envio de comprovante. */
  ocupado?: boolean;
  /** Mensagem de erro exibida quando a geração falha. */
  erro?: string | null;
  /** Estado atual da máquina de estados do Pix. */
  pollingStatus?: PixStatus;
  /** Indica cancelamento em andamento. */
  cancelando?: boolean;
  /** Se true, exibe botão 'Tentar novamente' logo abaixo do alerta de erro de geração. */
  permitirResetNoErro?: boolean;
  /** Callback opcional para cancelar a cobrança Pix ativa. */
  onCancelarPix?: () => void;
  /** Callback opcional para reiniciar após erro. */
  onResetPix?: () => void;
  /** Callback disparado ao concluir uma cobrança confirmada. */
  onSuccess?: () => void;
  /** Conteúdo específico da cobrança ativa renderizado quando há cobrança pendente. */
  children: ReactNode;
}

/**
 * Invólucro estrutural compartilhado entre os boxes de checkout Pix (Nova API, Mercado Pago e padrão),
 * centralizando cabeçalho, ação de cancelamento e estados de carregamento, erro, vazio e confirmação.
 *
 * @param {CheckoutPixBoxShellProps} props - Configurações de estado e conteúdo ativo do box Pix.
 * @returns {JSX.Element} Caixa estruturada do painel Pix.
 */
export function CheckoutPixBoxShell({
  titulo,
  cobranca,
  gerando = false,
  ocupado = false,
  erro,
  pollingStatus = "idle",
  cancelando = false,
  permitirResetNoErro = false,
  onCancelarPix,
  onResetPix,
  onSuccess,
  children,
}: CheckoutPixBoxShellProps) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: colors.branco,
        border: `1px solid ${colors.borda}`,
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25 }}>
        <PixIcon sx={{ color: colors.verdeEscuro }} />

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontWeight: 900,
              color: colors.pretoEsverdeado,
              fontSize: "0.98rem",
              lineHeight: 1.2,
            }}
          >
            {titulo}
          </Typography>
        </Box>

        {!gerando && cobranca && pollingStatus !== "sucesso" && onCancelarPix && (
          <IconButton
            onClick={onCancelarPix}
            disabled={cancelando || ocupado}
            size="small"
            sx={{ color: colors.erroForte }}
            aria-label="Cancelar pagamento"
            title="Cancelar cobrança Pix e liberar rifas"
          >
            {cancelando ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <CloseIcon />
            )}
          </IconButton>
        )}
      </Stack>

      {gerando && <CheckoutPixLoading />}

      {!gerando && erro && (
        <Box sx={{ mb: 1.5 }}>
          <CheckoutPixError erro={erro} />
          {permitirResetNoErro && onResetPix && (
            <Button
              onClick={onResetPix}
              variant="outlined"
              size="small"
              sx={{ mt: 1, textTransform: "none", borderRadius: 2 }}
            >
              Tentar novamente
            </Button>
          )}
        </Box>
      )}

      {!gerando && !erro && !cobranca && <CheckoutPixEmpty />}

      {!gerando && cobranca && pollingStatus === "sucesso" && (
        <Stack spacing={2} sx={{ mt: 1 }}>
          <CheckoutPixConfirmed />
          {onSuccess && (
            <Button
              onClick={onSuccess}
              variant="contained"
              fullWidth
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 900,
                bgcolor: colors.verdeForteEscuro,
                color: colors.branco,
                py: 1.25,
                "&:hover": { bgcolor: colors.verdeEscuro },
              }}
            >
              Concluir Venda
            </Button>
          )}
        </Stack>
      )}

      {!gerando && cobranca && pollingStatus !== "sucesso" && children}
    </Box>
  );
}
