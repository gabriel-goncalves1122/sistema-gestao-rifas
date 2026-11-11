import { memo } from "react";
import { Box, Checkbox, Paper, Stack, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { typographyScale as typography } from "@/shared/tokens/typography";

import { PixTransacao } from "../../../../types/pixTransacoes";
import {
  formatarDataPix,
  formatarMoedaPix,
  formatarRifasPix,
  podeValidarPixTransacao,
} from "../../../../utils/pixTransacoesUtils";
import { PixOrigemChip } from "../shared/PixOrigemChip";
import { PixTransacaoAcoes } from "../shared/PixTransacaoAcoes";

/**
 * Propriedades do cartão mobile de transação Pix.
 */
export interface PixTransacaoCardProps {
  /** Objeto de transação Pix */
  transacao: PixTransacao;
  /** Callback para aceitar transação */
  onAceitar: (id: string, chaveAcao?: string) => Promise<void>;
  /** Callback para recusar transação */
  onNegar: (id: string, motivo: string, chaveAcao?: string) => Promise<void>;
  /** Indica se a transação está selecionada para ação em lote */
  selecionada?: boolean;
  /** Callback opcional para alternar a seleção em lote do cartão */
  onToggleSelecao?: (id: string) => void;
}

/**
 * Cartão mobile memoizado para exibição de transação Pix na Tesouraria.
 *
 * @param {PixTransacaoCardProps} props - Propriedades do componente.
 * @returns {JSX.Element} Cartão renderizado.
 */
export const PixTransacaoCard = memo(function PixTransacaoCard({
  transacao,
  onAceitar,
  onNegar,
  selecionada = false,
  onToggleSelecao,
}: PixTransacaoCardProps) {
  const valor =
    transacao.statusPagamento === "PAID"
      ? transacao.valorPago
      : transacao.valorBruto;

  const aderidoLabel = transacao.aderido?.nome || "Sem aderido vinculado";
  const dataLabel = formatarDataPix(
    transacao.dataPagamento || transacao.dataCriacao,
  );
  const elegivelSelecao = Boolean(
    onToggleSelecao && podeValidarPixTransacao(transacao),
  );

  return (
    <Paper
      elevation={0}
      data-testid={`pix-transacao-${transacao.id}`}
      sx={{
        ...surfaces.card,
        p: 1.75,
        borderLeft: `4px solid ${colors.verdeEscuro}`,
        bgcolor: selecionada ? colors.fundoSuave : colors.branco,
      }}
    >
      <Stack spacing={1.35}>
        <Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={1}
          >
            <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
              {elegivelSelecao && (
                <Checkbox
                  size="small"
                  checked={selecionada}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleSelecao?.(transacao.id)}
                  inputProps={{
                    "aria-label": `Selecionar transação ${transacao.compradorNome || transacao.id}`,
                  }}
                  sx={{
                    p: 0.25,
                    mr: 0.5,
                    color: colors.verdeEscuro,
                    "&.Mui-checked": {
                      color: colors.verdeEscuro,
                    },
                  }}
                />
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    color: colors.pretoEsverdeado,
                    fontWeight: 950,
                    fontSize: "1.02rem",
                    lineHeight: 1.18,
                    wordBreak: "break-word",
                  }}
                >
                  {transacao.compradorNome || "Pagador não informado"}
                </Typography>

                <Typography
                  sx={{
                    color: colors.cinzaTexto,
                    fontSize: "0.78rem",
                    mt: 0.35,
                    lineHeight: 1.25,
                  }}
                >
                  {dataLabel}
                </Typography>
              </Box>
            </Stack>

            <Stack alignItems="flex-end" spacing={0.5}>
              <Typography
                sx={{
                  color:
                    transacao.statusPagamento === "PAID"
                      ? colors.verdeEscuro
                      : colors.alertaTexto,
                  fontWeight: 950,
                  fontSize: "1.28rem",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {formatarMoedaPix(valor)}
              </Typography>
              <PixOrigemChip origem={transacao.origem} />
            </Stack>
          </Stack>
        </Box>

        <Box
          sx={{
            bgcolor: colors.verdeClaro,
            p: 1.25,
            borderRadius: 2.25,
            border: "1px solid rgba(6, 61, 49, 0.12)",
          }}
        >
          <Typography sx={{ ...typography.caption, color: colors.cinzaTexto, fontWeight: 850 }}>
            Aderido responsável
          </Typography>

          <Typography
            sx={{
              color: colors.pretoEsverdeado,
              fontWeight: 850,
              fontSize: "0.94rem",
              mt: 0.25,
              lineHeight: 1.25,
            }}
          >
            {aderidoLabel}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.84rem" }}>
            {transacao.rifas?.length
              ? `Rifas ${formatarRifasPix(transacao)}`
              : "Sem rifas vinculadas"}
          </Typography>
          <PixTransacaoAcoes
            transacao={transacao}
            compact
            onAceitar={onAceitar}
            onNegar={onNegar}
          />
        </Box>
      </Stack>
    </Paper>
  );
});
