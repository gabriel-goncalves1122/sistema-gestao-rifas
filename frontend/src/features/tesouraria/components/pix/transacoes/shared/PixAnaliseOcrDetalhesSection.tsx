import { useState } from "react";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { formatarData } from "@/shared/utils/formatadores";

import { colors } from "@/shared/tokens/colors";
import { typographyScale as typography } from "@/shared/tokens/typography";

import { AnaliseOcrDTO, PixTransacao } from "../../../../types/pixTransacoes";
import {
  formatarAlertaOcr,
  formatarValorCentavosOcr,
  obterConfigVisualAnaliseOcr,
} from "../../../../utils/pixAnaliseOcrUtils";

/**
 * Propriedades da seção detalhada de análise OCR no diálogo de transação.
 */
export interface PixAnaliseOcrDetalhesSectionProps {
  /** Transação Pix inspecionada no modal de detalhes. */
  transacao: PixTransacao;
  /** Callback assíncrono disparado ao solicitar reanálise manual do OCR. */
  onReanalisarOcr?: (transacaoId: string) => Promise<AnaliseOcrDTO | null>;
  /** Indica se a transação atual está em processamento de reanálise OCR. */
  reanalisando?: boolean;
}

function ItemChecklistOcr({
  label,
  valor,
}: {
  label: string;
  valor: boolean | null | undefined;
}) {
  const Icone =
    valor === true
      ? CheckCircleIcon
      : valor === false
        ? CancelIcon
        : HelpOutlineIcon;
  const cor =
    valor === true
      ? colors.verdeEscuro
      : valor === false
        ? colors.erroTexto
        : colors.cinzaTexto;

  return (
    <Chip
      size="small"
      icon={<Icone sx={{ fontSize: 15, color: `${cor} !important` }} />}
      label={label}
      sx={{
        bgcolor: colors.branco,
        border: `1px solid ${colors.borda}`,
        color: colors.pretoEsverdeado,
        fontWeight: 700,
        fontSize: "0.75rem",
      }}
    />
  );
}

function DadoExtraidoOcr({
  label,
  valor,
}: {
  label: string;
  valor?: string | null;
}) {
  return (
    <Box
      sx={{
        p: 1,
        borderRadius: 1.5,
        bgcolor: colors.branco,
        border: `1px solid ${colors.borda}`,
      }}
    >
      <Typography sx={{ ...typography.caption, color: colors.cinzaTexto }}>
        {label}
      </Typography>
      <Typography
        sx={{
          color: colors.pretoEsverdeado,
          fontWeight: 750,
          fontSize: "0.82rem",
          mt: 0.2,
          overflowWrap: "anywhere",
        }}
      >
        {valor || "Não identificado"}
      </Typography>
    </Box>
  );
}

/**
 * Seção dedicada à exibição da análise OCR do comprovante dentro do diálogo de detalhes,
 * incluindo veredicto, score, checklist de validação, dados extraídos, alertas e botão de reanálise.
 *
 * @param {PixAnaliseOcrDetalhesSectionProps} props - Propriedades do componente.
 * @returns {JSX.Element | null} Seção renderizada ou `null` quando não há OCR nem comprovante.
 */
export function PixAnaliseOcrDetalhesSection({
  transacao,
  onReanalisarOcr,
  reanalisando = false,
}: PixAnaliseOcrDetalhesSectionProps) {
  const [erroReanalise, setErroReanalise] = useState<string | null>(null);
  const { analiseOcr, comprovanteUrl } = transacao;

  if (!analiseOcr && !comprovanteUrl) {
    return null;
  }

  const visual = obterConfigVisualAnaliseOcr(analiseOcr);

  const handleReanalisar = async () => {
    if (!onReanalisarOcr || reanalisando) return;
    setErroReanalise(null);
    try {
      await onReanalisarOcr(transacao.id);
    } catch {
      setErroReanalise("Não foi possível reanalisar o comprovante agora.");
    }
  };

  return (
    <Box
      data-testid="pix-analise-ocr-section"
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: colors.fundoSuave,
        border: `1px solid ${colors.borda}`,
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1}
        >
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <AutoFixHighIcon sx={{ fontSize: 18, color: colors.verdeEscuro }} />
            <Typography
              sx={{
                color: colors.pretoEsverdeado,
                fontWeight: 850,
                fontSize: "0.9rem",
              }}
            >
              Análise OCR do Comprovante
            </Typography>
            <Chip
              size="small"
              label={
                typeof analiseOcr?.score === "number"
                  ? `${visual.labelCompleto} (${analiseOcr.score}%)`
                  : visual.labelCompleto
              }
              sx={{
                bgcolor: visual.corFundo,
                color: visual.corTexto,
                border: `1px solid ${visual.corBorda}`,
                fontWeight: 800,
                fontSize: "0.75rem",
              }}
            />
          </Stack>

          {onReanalisarOcr && comprovanteUrl && (
            <Button
              size="small"
              variant="outlined"
              disabled={reanalisando}
              onClick={handleReanalisar}
              startIcon={
                reanalisando ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <RefreshIcon fontSize="small" />
                )
              }
              sx={{
                textTransform: "none",
                fontWeight: 800,
                borderColor: colors.verdeEscuro,
                color: colors.verdeEscuro,
              }}
            >
              {analiseOcr ? "Reanalisar OCR" : "Analisar OCR agora"}
            </Button>
          )}
        </Stack>

        {erroReanalise && (
          <Alert severity="error" sx={{ py: 0.25 }}>
            {erroReanalise}
          </Alert>
        )}

        {!analiseOcr ? (
          <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.82rem" }}>
            Este comprovante ainda não foi processado pelo motor de OCR. Clique em
            &nbsp;&ldquo;Analisar OCR agora&rdquo; para extrair e correlacionar os dados.
          </Typography>
        ) : analiseOcr.statusExecucao === "ERRO" ? (
          <Alert severity="warning" icon={<WarningAmberIcon fontSize="small" />}>
            Falha na leitura automática:{" "}
            {analiseOcr.erroMensagem || "Erro inesperado durante o OCR."}
          </Alert>
        ) : (
          <>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              <ItemChecklistOcr label="TXID RIFA" valor={analiseOcr.txidBate} />
              <ItemChecklistOcr label="Valor" valor={analiseOcr.valorBate} />
              <ItemChecklistOcr label="Recebedor" valor={analiseOcr.recebedorBate} />
              <ItemChecklistOcr label="E2E único" valor={analiseOcr.e2eUnico} />
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1,
              }}
            >
              <DadoExtraidoOcr label="Banco detectado" valor={analiseOcr.bancoDetectado} />
              <DadoExtraidoOcr
                label="Valor extraído"
                valor={formatarValorCentavosOcr(analiseOcr.valorLidoCentavos)}
              />
              <DadoExtraidoOcr label="TXID lido" valor={analiseOcr.txidLido} />
              <DadoExtraidoOcr
                label="Data no comprovante"
                valor={
                  analiseOcr.dataTransacaoIso
                    ? formatarData(analiseOcr.dataTransacaoIso)
                    : null
                }
              />
              <DadoExtraidoOcr label="E2E ID" valor={analiseOcr.e2eIdDetectado} />
              <DadoExtraidoOcr
                label="Recebedor / CNPJ"
                valor={
                  [analiseOcr.recebedorDetectado, analiseOcr.cnpjRecebedorDetectado]
                    .filter(Boolean)
                    .join(" · ") || null
                }
              />
            </Box>

            {analiseOcr.alertas.length > 0 && (
              <Alert severity="warning" icon={<WarningAmberIcon fontSize="small" />}>
                <Stack spacing={0.25}>
                  {analiseOcr.alertas.map((alerta) => (
                    <Typography key={alerta} sx={{ fontSize: "0.78rem", fontWeight: 700 }}>
                      • {formatarAlertaOcr(alerta)}
                    </Typography>
                  ))}
                </Stack>
              </Alert>
            )}

            {analiseOcr.motivos.length > 0 && (
              <Box>
                <Typography
                  sx={{
                    ...typography.caption,
                    color: colors.cinzaTexto,
                    fontWeight: 800,
                    mb: 0.35,
                  }}
                >
                  Motivos da correlação
                </Typography>
                <Stack spacing={0.25}>
                  {analiseOcr.motivos.map((motivo, idx) => (
                    <Typography
                      key={`${idx}-${motivo}`}
                      sx={{ color: colors.pretoEsverdeado, fontSize: "0.78rem" }}
                    >
                      • {motivo}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </>
        )}
      </Stack>
    </Box>
  );
}
