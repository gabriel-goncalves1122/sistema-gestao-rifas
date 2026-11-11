// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/states/CheckoutPixFeedbackStates.tsx
// ============================================================================
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";

/**
 * Propriedades do componente de erro da geração do Pix.
 */
export interface CheckoutPixErrorProps {
  /** Mensagem explicativa da falha ao gerar ou consultar a cobrança Pix. */
  erro: string;
}

/**
 * Propriedades internas do alerta padronizado de checkout Pix.
 */
interface CheckoutPixAlertProps {
  /** Severidade semântica do alerta no Material UI. */
  severity: "warning" | "error";
  /** Cor de fundo do alerta. */
  bgcolor: string;
  /** Cor principal do texto e do ícone. */
  color: string;
  /** Mensagem exibida ao usuário. */
  mensagem: string;
}

/**
 * Renderiza o bloco de alerta visual padronizado para estados de aviso ou erro do checkout Pix.
 */
function CheckoutPixAlert({
  severity,
  bgcolor,
  color,
  mensagem,
}: CheckoutPixAlertProps) {
  return (
    <Alert
      severity={severity}
      sx={{
        borderRadius: 2,
        bgcolor,
        color,
        "& .MuiAlert-icon": { color },
      }}
    >
      {mensagem}
    </Alert>
  );
}

/**
 * Exibe o indicador de carregamento enquanto uma cobrança Pix está sendo criada no backend.
 */
export function CheckoutPixLoading() {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: colors.fundoSuave,
        color: colors.cinzaTexto,
      }}
    >
      <CircularProgress size={18} sx={{ color: colors.verdeEscuro }} />
      <Typography sx={{ fontWeight: 800, fontSize: "0.88rem" }}>
        Gerando pagamento via Pix...
      </Typography>
    </Stack>
  );
}

/**
 * Exibe a mensagem de erro quando ocorre falha ao gerar ou consultar a cobrança Pix.
 */
export function CheckoutPixError({ erro }: CheckoutPixErrorProps) {
  return (
    <CheckoutPixAlert
      severity="warning"
      bgcolor={colors.alertaSuave}
      color={colors.alertaTexto}
      mensagem={erro}
    />
  );
}

/**
 * Exibe o estado informativo inicial antes da criação efetiva da cobrança Pix.
 */
export function CheckoutPixEmpty() {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: colors.fundoSuave,
        border: `1px dashed ${colors.bordaDestaque}`,
        color: colors.cinzaTexto,
      }}
    >
      <Typography sx={{ fontSize: "0.88rem", lineHeight: 1.45 }}>
        O pagamento via Pix será gerado quando os dados forem confirmados.
      </Typography>
    </Box>
  );
}

/**
 * Exibe o card de confirmação quando o pagamento Pix foi reconhecido com sucesso.
 */
export function CheckoutPixConfirmed() {
  return (
    <Stack
      spacing={1.5}
      alignItems="center"
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: colors.verdeClaro,
        border: `2px solid ${colors.verdeForteEscuro}`,
      }}
    >
      <CheckCircleIcon sx={{ fontSize: 48, color: colors.verdeForteEscuro }} />
      <Typography
        sx={{
          fontWeight: 950,
          color: colors.verdeForteEscuro,
          fontSize: "1.1rem",
          textAlign: "center",
        }}
      >
        Pagamento confirmado!
      </Typography>
      <Typography
        sx={{
          color: colors.cinzaTexto,
          fontSize: "0.88rem",
          textAlign: "center",
        }}
      >
        O pagamento via Pix foi confirmado. As rifas estão em análise pela
        tesouraria.
      </Typography>
    </Stack>
  );
}

/**
 * Exibe o aviso de acompanhamento em tempo real enquanto o webhook aguarda o pagamento do comprador.
 */
export function CheckoutPixPollingNotice() {
  return (
    <Stack
      spacing={0.5}
      sx={{
        p: 1.25,
        borderRadius: 2,
        bgcolor: colors.alertaSuave,
        border: "1px solid rgba(203, 166, 77, 0.4)",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <CircularProgress size={16} sx={{ color: colors.dourado }} />
        <Typography
          sx={{
            fontWeight: 800,
            color: colors.alertaTexto,
            fontSize: "0.84rem",
          }}
        >
          Aguardando confirmação do pagamento...
        </Typography>
      </Stack>
      <Typography
        sx={{
          color: colors.cinzaTexto,
          fontSize: "0.76rem",
          lineHeight: 1.35,
        }}
      >
        Você pode fechar esta janela para enviar o código ao comprador no WhatsApp; o Pix continuará válido até expirar.
      </Typography>
    </Stack>
  );
}

/**
 * Exibe o alerta de expiração da cobrança Pix após o término do prazo de pagamento.
 */
export function CheckoutPixExpiredNotice() {
  return (
    <CheckoutPixAlert
      severity="warning"
      bgcolor={colors.alertaSuave}
      color={colors.alertaTexto}
      mensagem="O tempo de espera expirou. Verifique o status da cobrança no painel de rifas."
    />
  );
}

/**
 * Exibe o alerta de cancelamento ou recusa bancária da cobrança Pix.
 */
export function CheckoutPixCanceledNotice() {
  return (
    <CheckoutPixAlert
      severity="error"
      bgcolor={colors.erroSuave}
      color={colors.erroTexto}
      mensagem="O pagamento foi cancelado ou recusado pelo banco. As rifas voltam a ficar disponíveis."
    />
  );
}
