// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/novaApi/CheckoutNovaApiView.tsx
// ============================================================================
import { Box, Stack } from "@mui/material";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";

import {
  CheckoutNovaApiFormData,
  checkoutNovaApiSchema,
} from "./checkoutNovaApiSchema";
import { CheckoutNovaApiForm } from "./CheckoutNovaApiForm";
import { CheckoutNovaApiPixBox } from "./CheckoutNovaApiPixBox";
import { CheckoutSubmitButton } from "../CheckoutSubmitButton";
import { CheckoutPixCobranca } from "../../../types/checkoutPix";
import { PixStatus } from "../../../hooks/usePixStateMachine";
import {
  obterDadosFormularioCheckoutInicial,
  useCheckoutPixViewController,
} from "../../../hooks/useCheckoutPixViewController";
import { ResultadoValidacaoArquivo } from "@/shared/utils/validadorComprovante";

/**
 * Propriedades para renderização da View de Checkout Nova API.
 */
interface CheckoutNovaApiViewProps {
  /** Lista de bilhetes selecionados */
  numerosRifas: string[];
  /** Cobrança Pix ativa no backend */
  cobrancaPix: CheckoutPixCobranca | null;
  /** Estado de ciclo de vida da FSM */
  pollingStatus: PixStatus;
  /** Se `true`, indica cancelamento em andamento */
  cancelandoPix: boolean;
  /** Se `true`, indica upload de comprovante em andamento */
  enviandoComprovante: boolean;
  /** Mensagem de erro caso a geração falhe */
  erroPix: string | null;
  /** Dispara a criação do Pix com a chave InfinitePay */
  gerarCobranca: (dados: CheckoutNovaApiFormData) => void;
  /** Copia a chave para a área de transferência */
  copiarPix: () => boolean;
  /** Cancela o Pix e libera bilhetes */
  cancelarPix: (reter: boolean) => void;
  /** Reseta o fluxo local */
  resetarFluxoPix: () => void;
  /** Callback ao finalizar a venda com sucesso */
  onSuccess: () => void;
  /** Callback para envio do comprovante obrigatório */
  confirmarEnvioComprovante: (
    arquivo: File,
    hash?: string | null,
    mime?: string,
  ) => void;
  /** Abre o snackbar de feedback visual */
  setSnackbarOpen: (open: boolean) => void;
}

/**
 * View completa do Checkout da Nova API (Pix Direto / Chave Oficial InfinitePay + Comprovante).
 *
 * @param {CheckoutNovaApiViewProps} props - Propriedades do componente.
 */
export function CheckoutNovaApiView({
  cobrancaPix,
  pollingStatus,
  cancelandoPix,
  enviandoComprovante,
  erroPix,
  gerarCobranca,
  copiarPix,
  cancelarPix,
  resetarFluxoPix,
  onSuccess,
  confirmarEnvioComprovante,
  setSnackbarOpen,
}: CheckoutNovaApiViewProps) {
  const formRestaurado = obterDadosFormularioCheckoutInicial();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutNovaApiFormData>({
    resolver: yupResolver(checkoutNovaApiSchema) as any,
    mode: "onChange",
    shouldUnregister: false,
    defaultValues: {
      nome: formRestaurado.nome,
      telefone: formRestaurado.telefone,
      email: formRestaurado.email,
    },
  });

  const { handleCopiarPix, handleCancelarPixExplicito } =
    useCheckoutPixViewController({
      watch,
      incluirDocumento: false,
      mensagemConfirmacaoCancelamento:
        "Se você já enviou a chave Pix para o comprador, cancelar agora liberará as rifas. Deseja realmente cancelar?",
      copiarPix,
      cancelarPix,
      setSnackbarOpen,
    });

  const handleConfirmarEnvio = (
    arquivo: File,
    resultado: ResultadoValidacaoArquivo | null,
  ) => {
    confirmarEnvioComprovante(
      arquivo,
      resultado?.hashSha256,
      resultado?.mimeDetectado,
    );
  };

  const onSubmit = (dados: CheckoutNovaApiFormData) => {
    gerarCobranca(dados);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2.25}>
        <CheckoutNovaApiForm
          register={register}
          setValue={setValue}
          errors={errors}
          isDisabled={Boolean(cobrancaPix) || pollingStatus === "gerando"}
        />

        <CheckoutNovaApiPixBox
          cobranca={cobrancaPix}
          gerando={pollingStatus === "gerando"}
          cancelando={cancelandoPix}
          enviandoComprovante={enviandoComprovante}
          erro={erroPix}
          pollingStatus={pollingStatus === "gerando" ? "idle" : pollingStatus}
          onCopiarPix={handleCopiarPix}
          onCancelarPix={handleCancelarPixExplicito}
          onResetPix={resetarFluxoPix}
          onSuccess={onSuccess}
          onConfirmarEnvio={handleConfirmarEnvio}
        />

        <CheckoutSubmitButton
          gerandoPix={pollingStatus === "gerando"}
          pagamentoGerado={Boolean(cobrancaPix)}
        />
      </Stack>
    </Box>
  );
}
