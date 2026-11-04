import { memo } from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

import { AuditoriaCompraActions } from "../shared/AuditoriaCompraActions";
import { AuditoriaStatusChip } from "../shared/AuditoriaStatusChip";
import { AuditoriaOrigemChip } from "../shared/AuditoriaOrigemChip";
import { AuditoriaCorrecaoChip } from "../shared/AuditoriaCorrecaoChip";
import { TransacaoTesouraria } from "../../../types/auditoriaCompras";
import {
  formatarDataAuditoria,
  formatarMoedaAuditoria,
  normalizarTexto,
} from "../../../utils/auditoriaComprasUtils";
import { formatarTelefone } from "@/shared/utils/formatadores";
import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { components } from "@/shared/tokens/components";
import { typographyScale as typography } from "@/shared/tokens/typography";

/**
 * Propriedades para renderização do cartão mobile de auditoria de compra.
 */
export interface AuditoriaComprasCardProps {
  /** Transação de compra avaliada */
  compra: TransacaoTesouraria;
  /** Callback para abrir o arquivo de comprovante */
  onVerComprovante: (compra: TransacaoTesouraria) => void;
  /** Callback para editar os dados cadastrais do comprador */
  onEditar: (compra: TransacaoTesouraria) => void;
  /** Callback para inspecionar os detalhes protegidos da compra */
  onVerDetalhes: (compra: TransacaoTesouraria) => void;
  /** Callback para reenvio do e-mail do comprador */
  onReenviarEmailComprovante: (compra: TransacaoTesouraria) => void;
  /** Se `true`, indica que o e-mail desta compra está em reenvio */
  reenviandoEmailComprovante?: boolean;
  /** Callback opcional para aceitar compra */
  onAceitar?: (compra: TransacaoTesouraria) => void;
  /** Callback opcional para recusar compra */
  onNegar?: (compra: TransacaoTesouraria) => void;
  /** ID da ação em processamento */
  processandoAcaoId?: string | null;
}

function obterCorBordaStatus(status: string): string {
  const normalizado = normalizarTexto(status);
  if (normalizado === "pago") return colors.verdeEscuro;
  if (normalizado === "pendente") return "#D97706";
  if (normalizado === "recusado") return colors.vermelho;
  return colors.cinzaTexto;
}

/**
 * Cartão de compra mobile para a tela de auditoria, alinhado ao design do `PixTransacaoCard`.
 * Exibe o valor nominal bruto da compra, bloco limpo de vendedor e status, e rifas no rodapé.
 *
 * @param {AuditoriaComprasCardProps} props - Propriedades do cartão.
 * @returns {JSX.Element} Card responsivo e memoizado.
 */
export const AuditoriaCompraCard = memo(function AuditoriaCompraCard({
  compra,
  onVerComprovante,
  onEditar,
  onVerDetalhes,
  onReenviarEmailComprovante,
  reenviandoEmailComprovante = false,
  onAceitar,
  onNegar,
  processandoAcaoId,
}: AuditoriaComprasCardProps) {
  const corBorda = obterCorBordaStatus(compra.status);

  return (
    <Paper
      elevation={0}
      data-testid={`auditoria-compra-${compra.id}`}
      onClick={() => onVerDetalhes(compra)}
      sx={{
        ...surfaces.paperComSombra,
        p: 1.75,
        borderLeft: `4px solid ${corBorda}`,
        cursor: "pointer",
        transition: "background-color 140ms ease",
        "&:hover": {
          bgcolor: "rgba(6, 61, 49, 0.02)",
        },
      }}
    >
      <Stack spacing={1.35}>
        {/* Topo: Comprador + Data/Telefone à esquerda | Valor Bruto à direita */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                color: colors.pretoEsverdeado,
                fontWeight: 950,
                fontSize: "1.02rem",
                lineHeight: 1.18,
                wordBreak: "break-word",
              }}
            >
              {compra.compradorNome}
            </Typography>
            <Typography
              sx={{
                color: colors.cinzaTexto,
                fontSize: "0.78rem",
                mt: 0.35,
                lineHeight: 1.25,
              }}
            >
              {formatarDataAuditoria(compra.dataReserva)}
              {compra.compradorTelefone
                ? ` • ${formatarTelefone(compra.compradorTelefone)}`
                : ""}
            </Typography>
          </Box>

          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
            <Typography
              sx={{
                color:
                  normalizarTexto(compra.status) === "pago"
                    ? colors.verdeEscuro
                    : colors.alertaTexto,
                fontWeight: 950,
                fontSize: "1.24rem",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {formatarMoedaAuditoria(compra.valorTotal)}
            </Typography>
            <Typography
              sx={{
                color: colors.cinzaTexto,
                fontSize: "0.74rem",
                fontWeight: 700,
                mt: 0.35,
              }}
            >
              {compra.bilhetes.length} rifa(s)
            </Typography>
          </Box>
        </Stack>

        {/* Bloco Central (Estilo PixTransacaoCard): Vendedor responsável + Chips de Status/Origem */}
        <Box
          sx={{
            ...surfaces.fundoVerdeClaro,
            p: 1.25,
            borderRadius: 2.25,
            border: "1px solid rgba(6, 61, 49, 0.12)",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ ...typography.label, fontWeight: 850 }}>
                Vendedor responsável
              </Typography>
              <Typography
                sx={{
                  color: colors.pretoEsverdeado,
                  fontWeight: 850,
                  fontSize: "0.92rem",
                  mt: 0.25,
                  lineHeight: 1.25,
                  wordBreak: "break-word",
                }}
              >
                {compra.vendedorNome}
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
            >
              <AuditoriaStatusChip status={compra.status} />
              <AuditoriaOrigemChip origem={compra.origem} />
              <AuditoriaCorrecaoChip pendente={compra.correcaoPendente} />
            </Stack>
          </Stack>
        </Box>

        {/* Rodapé: Rifas à esquerda + Ações à direita */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
        >
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ minWidth: 0, flex: 1 }}
          >
            {compra.bilhetes.slice(0, 4).map((bilhete) => (
              <Chip
                key={bilhete}
                label={bilhete}
                size="small"
                sx={{
                  ...components.chipBilhete,
                  height: 24,
                  fontSize: "0.74rem",
                  borderRadius: 1.5,
                  border: "1px solid rgba(6, 61, 49, 0.14)",
                }}
              />
            ))}
            {compra.bilhetes.length > 4 && (
              <Chip
                label={`+${compra.bilhetes.length - 4}`}
                size="small"
                sx={{
                  ...components.chipBilhete,
                  height: 24,
                  fontSize: "0.72rem",
                  borderRadius: 1.5,
                  bgcolor: colors.fundoSuave,
                  color: colors.cinzaTexto,
                  border: "1px solid rgba(6, 61, 49, 0.08)",
                }}
              />
            )}
          </Stack>

          <Box onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0 }}>
            <AuditoriaCompraActions
              compra={compra}
              onVerComprovante={onVerComprovante}
              onEditar={onEditar}
              onVerDetalhes={onVerDetalhes}
              onReenviarEmailComprovante={onReenviarEmailComprovante}
              reenviandoEmailComprovante={reenviandoEmailComprovante}
              onAceitar={onAceitar}
              onNegar={onNegar}
              processandoAcaoId={processandoAcaoId}
            />
          </Box>
        </Stack>
      </Stack>
    </Paper>
  );
});
