// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/novaApi/CheckoutNovaApiPixBox.tsx
// ============================================================================
import { useState } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Button, CircularProgress, Stack, Typography } from "@mui/material";

import type { CheckoutPixCobranca } from "../../../types/checkoutPix";
import type { PixStatus } from "../../../hooks/usePixStateMachine";
import {
  CheckoutPixCopiaECola,
  CheckoutQrCodeDisplay,
} from "../states/CheckoutPixPaymentControls";
import {
  CheckoutPixBoxShell,
  obterQrCodeSrc,
} from "../CheckoutPixBoxShell";
import { CheckoutComprovanteUpload } from "../CheckoutComprovanteUpload";
import { ResultadoValidacaoArquivo } from "@/shared/utils/validadorComprovante";
import { colors } from "@/shared/tokens/colors";

/**
 * Propriedades do componente CheckoutNovaApiPixBox.
 */
interface CheckoutNovaApiPixBoxProps {
  /** Objeto da cobrança Pix ativa gerada no backend */
  cobranca?: CheckoutPixCobranca | null;
  /** Se `true`, indica que o backend está gerando a cobrança */
  gerando?: boolean;
  /** Se `true`, indica que o upload de comprovante está em andamento */
  enviandoComprovante?: boolean;
  /** Mensagem de erro caso a geração falhe */
  erro?: string | null;
  /** Estado atual da máquina de estados do Pix */
  pollingStatus?: PixStatus;
  /** Se `true`, indica cancelamento em processamento */
  cancelando?: boolean;
  /** Callback para copiar o código Pix para a área de transferência */
  onCopiarPix: () => void;
  /** Callback para cancelar o Pix e liberar rifas */
  onCancelarPix?: () => void;
  /** Callback para resetar o fluxo caso ocorra erro */
  onResetPix?: () => void;
  /** Callback disparado ao concluir com sucesso */
  onSuccess?: () => void;
  /** Callback para submeter o comprovante obrigatório de pagamento */
  onConfirmarEnvio?: (
    arquivo: File,
    resultado: ResultadoValidacaoArquivo | null,
  ) => void;
}

/**
 * Painel Pix exclusivo da Nova API (Chave Direta / InfinitePay + Comprovante).
 * Foco na agilidade: sem contadores regressivos artificiais, sem polling enganoso e com
 * upload direto de comprovante para liberação ágil pela tesouraria.
 *
 * @param {CheckoutNovaApiPixBoxProps} props - Propriedades do componente.
 */
export function CheckoutNovaApiPixBox({
  cobranca,
  gerando = false,
  enviandoComprovante = false,
  erro,
  pollingStatus = "idle",
  cancelando = false,
  onCopiarPix,
  onCancelarPix,
  onResetPix,
  onSuccess,
  onConfirmarEnvio,
}: CheckoutNovaApiPixBoxProps) {
  const qrCodeSrc = cobranca ? obterQrCodeSrc(cobranca) : "";
  const [arquivoComprovante, setArquivoComprovante] = useState<File | null>(null);
  const [resultadoValidacao, setResultadoValidacao] =
    useState<ResultadoValidacaoArquivo | null>(null);

  const handleArquivoValido = (
    arquivo: File | null,
    resultado: ResultadoValidacaoArquivo | null,
  ) => {
    setArquivoComprovante(arquivo);
    setResultadoValidacao(resultado);
  };

  const handleSubmeterEnvio = () => {
    if (onConfirmarEnvio && arquivoComprovante) {
      onConfirmarEnvio(arquivoComprovante, resultadoValidacao);
    }
  };

  return (
    <CheckoutPixBoxShell
      titulo="Chave Pix Copia-e-Cola"
      cobranca={cobranca}
      gerando={gerando}
      ocupado={enviandoComprovante}
      erro={erro}
      pollingStatus={pollingStatus}
      cancelando={cancelando}
      permitirResetNoErro
      onCancelarPix={onCancelarPix}
      onResetPix={onResetPix}
      onSuccess={onSuccess}
    >
      <Stack spacing={1.75}>
        {/* <Stack
          direction="row"
          spacing={1}
          alignItems="flex-start"
          sx={{
            p: 1.25,
            borderRadius: 2,
            bgcolor: colors.fundoSuave,
            border: `1px solid ${colors.bordaDestaque}`,
          }}
        >
          <InfoOutlinedIcon
            fontSize="small"
            sx={{ color: colors.verdeEscuro, mt: 0.2 }}
          />
          <Typography
            sx={{
              fontSize: "0.82rem",
              color: colors.cinzaTexto,
              lineHeight: 1.4,
            }}
          >
            Transfira pelo app do seu banco ou envie o Copia-e-Cola ao comprador.
            Após o pagamento, anexe o comprovante abaixo para validação da comissão.
          </Typography>
        </Stack> */}

        <CheckoutQrCodeDisplay qrCodeSrc={qrCodeSrc} />

        <CheckoutPixCopiaECola codigo={cobranca?.copiaECola} />

        <Button
          type="button"
          variant="outlined"
          fullWidth
          startIcon={<ContentCopyIcon />}
          onClick={onCopiarPix}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 900,
            color: colors.verdeEscuro,
            borderColor: colors.bordaDestaque,
            py: 1,
            "&:hover": {
              borderColor: colors.verdeEscuro,
              bgcolor: colors.verdeClaro,
            },
          }}
        >
          Copiar Chave Pix Copia-e-Cola
        </Button>

        <CheckoutComprovanteUpload
          arquivoSelecionado={arquivoComprovante}
          onArquivoValido={handleArquivoValido}
          disabled={enviandoComprovante || cancelando}
        />

        {!arquivoComprovante }

        {onConfirmarEnvio && (
          <Button
            onClick={handleSubmeterEnvio}
            variant="contained"
            fullWidth
            disabled={enviandoComprovante || cancelando || !arquivoComprovante}
            startIcon={
              enviandoComprovante ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <CheckCircleIcon />
              )
            }
            sx={{
              mt: 0.5,
              py: 1.35,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 900,
              fontSize: "0.95rem",
              bgcolor: colors.verdeForteEscuro,
              color: colors.branco,
              "&:hover": { bgcolor: colors.verdeEscuro },
            }}
          >
            {enviandoComprovante
              ? "Enviando comprovante..."
              : "Enviar Comprovante para Análise"}
          </Button>
        )}
      </Stack>
    </CheckoutPixBoxShell>
  );
}
