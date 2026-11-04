import { memo } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { typographyScale as typography } from "@/shared/tokens/typography";
import { PixTransacao } from "../../../../types/pixTransacoes";
import {
  formatarDataPix,
  formatarMoedaPix,
  formatarRifasPix,
} from "../../../../utils/pixTransacoesUtils";
import { PixTransacaoAcoes } from "../shared/PixTransacaoAcoes";

/**
 * Propriedades do cartão mobile de transação Pix.
 */
export interface PixTransacaoCardProps {
  /** Objeto de transação Pix */
  transacao: PixTransacao;
  /** Callback para aceitar transação */
  onAceitar: (id: string) => Promise<void>;
  /** Callback para recusar transação */
  onNegar: (id: string, motivo: string) => Promise<void>;
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
}: PixTransacaoCardProps) {
  const valor =
    transacao.statusPagamento === "PAID"
      ? transacao.valorPago
      : transacao.valorBruto;

  const aderidoLabel = transacao.aderido?.nome || "Sem aderido vinculado";
  const dataLabel = formatarDataPix(
    transacao.dataPagamento || transacao.dataCriacao,
  );

  return (
    <Paper
      elevation={0}
      data-testid={`pix-transacao-${transacao.id}`}
      sx={{
        ...surfaces.paperComSombra,
        p: 1.75,
        borderLeft: `4px solid ${colors.verdeEscuro}`,
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
          </Stack>
        </Box>

        <Box
          sx={{
            ...surfaces.fundoVerdeClaro,
            p: 1.25,
            borderRadius: 2.25,
            border: "1px solid rgba(6, 61, 49, 0.12)",
          }}
        >
          <Typography sx={{ ...typography.label, fontWeight: 850 }}>
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
