// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/mercadopago/CheckoutMercadoPagoView.tsx
// ============================================================================
import { Box, Stack } from "@mui/material";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";

import {
  CheckoutMercadoPagoFormData,
  checkoutMercadoPagoSchema,
} from "./checkoutMercadoPagoSchema";
import { CheckoutMercadoPagoForm } from "./CheckoutMercadoPagoForm";
import { CheckoutMercadoPagoPixBox } from "./CheckoutMercadoPagoPixBox";
import { CheckoutSubmitButton } from "../CheckoutSubmitButton";
import { CheckoutPixCobranca } from "../../../types/checkoutPix";
import { PixStatus } from "../../../hooks/usePixStateMachine";
import {
  obterDadosFormularioCheckoutInicial,
  useCheckoutPixViewController,
} from "../../../hooks/useCheckoutPixViewController";

/**
 * Propriedades para renderização da View de Checkout Mercado Pago.
 */
interface CheckoutMercadoPagoViewProps {
  /** Lista de bilhetes selecionados */
  numerosRifas: string[];
  /** Cobrança Pix ativa no backend */
  cobrancaPix: CheckoutPixCobranca | null;
  /** Estado de ciclo de vida da FSM */
  pollingStatus: PixStatus;
  /** Se `true`, indica cancelamento em andamento */
  cancelandoPix: boolean;
  /** Mensagem de erro caso a geração falhe */
  erroPix: string | null;
  /** Dispara a criação do Pix no gateway Mercado Pago */
  gerarCobranca: (dados: CheckoutMercadoPagoFormData) => void;
  /** Copia a chave para a área de transferência */
  copiarPix: () => boolean;
  /** Cancela o Pix e libera bilhetes */
  cancelarPix: (reter: boolean) => void;
  /** Reseta o fluxo local */
  resetarFluxoPix: () => void;
  /** Marca localmente como expirado */
  marcarComoExpiradoLocal: () => void;
  /** Callback ao finalizar a venda com sucesso */
  onSuccess: () => void;
  /** Abre o snackbar de feedback visual */
  setSnackbarOpen: (open: boolean) => void;
}

/**
 * View completa do Checkout via Gateway Mercado Pago.
 *
 * @param {CheckoutMercadoPagoViewProps} props - Propriedades do componente.
 */
export function CheckoutMercadoPagoView({
  cobrancaPix,
  pollingStatus,
  cancelandoPix,
  erroPix,
  gerarCobranca,
  copiarPix,
  cancelarPix,
  resetarFluxoPix,
  marcarComoExpiradoLocal,
  onSuccess,
  setSnackbarOpen,
}: CheckoutMercadoPagoViewProps) {
  const formRestaurado = obterDadosFormularioCheckoutInicial();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutMercadoPagoFormData>({
    resolver: yupResolver(checkoutMercadoPagoSchema) as any,
    mode: "onChange",
    shouldUnregister: false,
    defaultValues: formRestaurado,
  });

  const { handleCopiarPix, handleCancelarPixExplicito } =
    useCheckoutPixViewController({
      watch,
      incluirDocumento: true,
      mensagemConfirmacaoCancelamento:
        "Se você já enviou o código Pix do Mercado Pago ao comprador, cancelar agora invalidará o pagamento. Deseja realmente cancelar?",
      copiarPix,
      cancelarPix,
      setSnackbarOpen,
    });

  const onSubmit = (dados: CheckoutMercadoPagoFormData) => {
    gerarCobranca(dados);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2.25}>
        <CheckoutMercadoPagoForm
          register={register}
          setValue={setValue}
          errors={errors}
          isDisabled={Boolean(cobrancaPix) || pollingStatus === "gerando"}
        />

        <CheckoutMercadoPagoPixBox
          cobranca={cobrancaPix}
          gerando={pollingStatus === "gerando"}
          cancelando={cancelandoPix}
          erro={erroPix}
          pollingStatus={pollingStatus === "gerando" ? "idle" : pollingStatus}
          onCopiarPix={handleCopiarPix}
          onCancelarPix={handleCancelarPixExplicito}
          onExpirarPix={marcarComoExpiradoLocal}
          onResetPix={resetarFluxoPix}
          onSuccess={onSuccess}
        />

        <CheckoutSubmitButton
          gerandoPix={pollingStatus === "gerando"}
          pagamentoGerado={Boolean(cobrancaPix)}
        />
      </Stack>
    </Box>
  );
}
