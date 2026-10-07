import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  Snackbar,
  Stack,
} from "@mui/material";
import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import {
  CheckoutFormData,
  checkoutSchema,
} from "./components/checkout/checkoutSchema";
import { CheckoutDadosCompradorForm } from "./components/checkout/CheckoutDadosCompradorForm";
import { CheckoutModalHeader } from "./components/checkout/CheckoutModalHeader";
import { CheckoutPixBox } from "./components/checkout/CheckoutPixBox";
import { CheckoutResumoVenda } from "./components/checkout/CheckoutResumoVenda";
import { CheckoutSubmitButton } from "./components/checkout/CheckoutSubmitButton";
import { usePixStateMachine } from "./hooks/usePixStateMachine";
import { checkoutStorage } from "./utils/checkoutStorage";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  numerosRifas: string[];
  invalidarDadosPainel: () => Promise<void>;
}

function CheckoutModalContent({
  open,
  onClose,
  onSuccess,
  numerosRifas,
  invalidarDadosPainel,
}: CheckoutModalProps) {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const sessaoCheckoutId = useRef(
    checkoutStorage.get().sessaoCheckoutId || `sessao_${Date.now()}`
  ).current;

  useEffect(() => {
    checkoutStorage.update({ sessaoCheckoutId });
  }, [sessaoCheckoutId]);

  const {
    status: pollingStatus,
    cobrancaPix,
    erro: erroPix,
    cancelando: cancelandoPix,
    gerarCobranca,
    copiarPix,
    cancelarCobranca: cancelarPix,
    resetarFluxo: resetarFluxoPix,
    liberarReservaTotal,
    abortarGeracaoPendente,
  } = usePixStateMachine({ numerosRifas, sessaoCheckoutId, invalidarDadosPainel });

  const formRestaurado = checkoutStorage.get().formData || {
    nome: "",
    telefone: "",
    email: "",
    documento: "",
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: yupResolver(checkoutSchema) as any,
    mode: "onChange",
    shouldUnregister: false,
    defaultValues: formRestaurado,
  });

  useEffect(() => {
    const subscription = watch((value) => {
      checkoutStorage.update({ formData: value as CheckoutFormData });
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const prevOpen = useRef(open);

  useEffect(() => {
    if (open && !prevOpen.current) {
      const cobrancaAtual = checkoutStorage.get().cobrancaPix;
      const temMesmasRifas =
        cobrancaAtual &&
        JSON.stringify([...cobrancaAtual.numerosRifas].sort()) ===
          JSON.stringify([...numerosRifas].sort());

      if (cobrancaAtual && cobrancaAtual.status === "aguardando_pagamento" && temMesmasRifas) {
        // Retoma o fluxo silenciosamente (usePixStateMachine já carrega do storage)
      } else {
        resetarFluxoPix();
      }
    }
    prevOpen.current = open;
  }, [open, resetarFluxoPix, numerosRifas]);

  const fecharModal = () => {
    if (pollingStatus === "gerando") {
      abortarGeracaoPendente();
      onClose();
      return;
    }

    if (pollingStatus === "sucesso") {
      onSuccess();
      return;
    }

    if (pollingStatus === "aguardando_pagamento") {
      const confirmar = window.confirm("Você tem um pagamento em andamento. Deseja cancelar o Pix e liberar as rifas?");
      if (!confirmar) return;
    }

    liberarReservaTotal().catch(console.error);
    onClose();
  };

  const numerosRifasEfetivos = cobrancaPix?.numerosRifas?.length
    ? cobrancaPix.numerosRifas
    : numerosRifas;

  const onSubmit = (dados: CheckoutFormData) => {
    gerarCobranca(dados);
  };

  const handleCopiarPix = () => {
    const sucesso = copiarPix();
    if (sucesso) {
      setSnackbarOpen(true);
    }
  };

  return (
    <>
      <CheckoutModalHeader 
        gerandoPix={pollingStatus === "gerando"} 
        onClose={fecharModal} 
      />

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2.25}>
            
            <CheckoutResumoVenda numerosRifas={numerosRifasEfetivos} />

            <CheckoutDadosCompradorForm
              register={register}
              setValue={setValue}
              errors={errors}
              isDisabled={Boolean(cobrancaPix) || pollingStatus === "gerando"}
            />

            <CheckoutPixBox
              cobranca={cobrancaPix}
              gerando={pollingStatus === "gerando"}
              cancelando={cancelandoPix}
              erro={erroPix}
              pollingStatus={pollingStatus === "gerando" ? "idle" : pollingStatus}
              onCopiarPix={handleCopiarPix}
              onCancelarPix={() => cancelarPix(false)}
              onResetPix={resetarFluxoPix}
              onSuccess={onSuccess}
            />

            <CheckoutSubmitButton
              gerandoPix={pollingStatus === "gerando"}
              pagamentoGerado={Boolean(cobrancaPix)}
            />
          </Stack>
        </Box>
      </DialogContent>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2200}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          sx={{
            borderRadius: 2,
            fontWeight: 800,
          }}
        >
          Pix copia-e-cola copiado.
        </Alert>
      </Snackbar>
    </>
  );
}

export function CheckoutModal(props: CheckoutModalProps) {
  return (
    <Dialog
      open={props.open}
      disableEscapeKeyDown={false}
      onClose={(_, reason) => {
        if (reason === "backdropClick") return;
        if (reason === "escapeKeyDown") {
           return;
        }
      }}
      fullWidth
      maxWidth="sm"
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(4px)",
        },
      }}
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: { xs: "20px 20px 0 0", sm: 3 },
          m: { xs: 0, sm: 2 },
          position: { xs: "absolute", sm: "relative" },
          bottom: { xs: 0, sm: "auto" },
          width: "100%",
          maxHeight: { xs: "calc(100% - 64px)", sm: "calc(100% - 64px)" },
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        },
      }}
    >
      <CheckoutModalContent {...props} />
    </Dialog>
  );
}
