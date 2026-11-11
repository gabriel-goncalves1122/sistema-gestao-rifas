// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/novaApi/CheckoutNovaApiPixBox.tsx
// ============================================================================
import { useState } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PixIcon from "@mui/icons-material/Pix";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";

import type { CheckoutPixCobranca } from "../../../types/checkoutPix";
import type { PixStatus } from "../../../hooks/usePixStateMachine";
import {
  CheckoutPixConfirmed,
  CheckoutPixCopiaECola,
  CheckoutPixEmpty,
  CheckoutPixError,
  CheckoutPixLoading,
  CheckoutQrCodeDisplay,
} from "../CheckoutPixBoxStates";
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
  /** Callback para submeter o comprovante ou confirmação de pagamento */
  onConfirmarEnvio?: (
    arquivo: File | null,
    resultado: ResultadoValidacaoArquivo | null,
  ) => void;
}

/**
 * Extrai a fonte da imagem do QR Code a partir da cobrança.
 *
 * @param {CheckoutPixCobranca} cobranca - Objeto da cobrança.
 * @returns {string} URI da imagem Base64 ou URL HTTP.
 */
function obterQrCodeSrc(cobranca: CheckoutPixCobranca): string {
  if (cobranca.qrCodeImagemUrl) return cobranca.qrCodeImagemUrl;
  if (cobranca.qrCodeBase64) {
    return `data:image/png;base64,${cobranca.qrCodeBase64}`;
  }
  return "";
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
    if (onConfirmarEnvio) {
      onConfirmarEnvio(arquivoComprovante, resultadoValidacao);
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: colors.branco,
        border: `1px solid ${colors.borda}`,
      }}
    >
      {/* Header do Box */}
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
            Chave Pix da Comissão (InfinitePay)
          </Typography>
        </Box>

        {!gerando && cobranca && pollingStatus !== "sucesso" && onCancelarPix && (
          <IconButton
            onClick={onCancelarPix}
            disabled={cancelando || enviandoComprovante}
            size="small"
            sx={{ color: colors.erroForte }}
            aria-label="Cancelar pagamento"
            title="Cancelar cobrança Pix e liberar rifas"
          >
            {cancelando ? <CircularProgress size={18} color="inherit" /> : <CloseIcon />}
          </IconButton>
        )}
      </Stack>

      {/* Estado: Carregando geração */}
      {gerando && <CheckoutPixLoading />}

      {/* Estado: Erro */}
      {!gerando && erro && (
        <Box sx={{ mb: 1.5 }}>
          <CheckoutPixError erro={erro} />
          {onResetPix && (
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

      {/* Estado: Vazio */}
      {!gerando && !erro && !cobranca && <CheckoutPixEmpty />}

      {/* Estado: Sucesso */}
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

      {/* Estado: Cobrança Ativa */}
      {!gerando && cobranca && pollingStatus !== "sucesso" && (
        <Stack spacing={1.75}>
          {/* Instrução limpa e objetiva */}
          <Stack
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
          </Stack>

          {/* QR Code */}
          <CheckoutQrCodeDisplay qrCodeSrc={qrCodeSrc} />

          {/* Copia e Cola */}
          <CheckoutPixCopiaECola codigo={cobranca.copiaECola} />

          {/* Botão Copiar */}
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

          {/* Upload de Comprovante */}
          <CheckoutComprovanteUpload
            arquivoSelecionado={arquivoComprovante}
            onArquivoValido={handleArquivoValido}
            disabled={enviandoComprovante || cancelando}
          />

          {/* Botão de Envio para Análise */}
          {onConfirmarEnvio && (
            <Button
              onClick={handleSubmeterEnvio}
              variant="contained"
              fullWidth
              disabled={enviandoComprovante || cancelando}
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
                : arquivoComprovante
                  ? "Enviar Comprovante para Análise"
                  : "Confirmar Pagamento Realizado"}
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
}
