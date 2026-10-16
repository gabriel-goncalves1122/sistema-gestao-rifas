import { Box, Drawer, Paper, Stack, Typography } from "@mui/material";

import { PixAderidoResumo } from "../../../../utils/pixAderidosUtils";
import {
  formatarDataPix,
  formatarMoedaPix,
} from "../../../../utils/pixTransacoesUtils";
import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { typographyScale as typography } from "@/shared/tokens/typography";
import { layout } from "../../../../styles/layout";

/**
 * Propriedades para renderização da gaveta inferior de detalhes do aderido.
 */
export interface PixAderidoDetalhesDrawerProps {
  /** Resumo do aderido selecionado ou `null` se fechado */
  aderido: PixAderidoResumo | null;
  /** Callback para fechamento da gaveta */
  onClose: () => void;
}

/**
 * Gaveta inferior (BottomDrawer) de conferência individual do aderido,
 * exibindo valores totais arrecadados, divisão entre Pix e Comprovante e transações pagas vinculadas.
 *
 * @param {PixAderidoDetalhesDrawerProps} props - Propriedades do componente.
 * @returns {JSX.Element} BottomDrawer responsivo.
 */
export function PixAderidoDetalhesDrawer({
  aderido,
  onClose,
}: PixAderidoDetalhesDrawerProps) {
  const transacoesPagas = (aderido?.transacoes || []).filter(
    (transacao) => transacao.statusPagamento === "PAID",
  );

  const temSplit =
    aderido &&
    (aderido.valorPix !== undefined || aderido.valorComprovante !== undefined);

  return (
    <Drawer
      anchor="bottom"
      open={Boolean(aderido)}
      onClose={onClose}
      PaperProps={{
        sx: layout.drawerPaper,
      }}
    >
      {aderido && (
        <Stack spacing={2} sx={{ pb: 1 }}>
          <Box sx={layout.drawerPullHandle} />

          <Box>
            <Typography
              sx={{
                ...typography.bodyDestaque,
                fontWeight: 950,
                fontSize: "1.08rem",
              }}
            >
              {aderido.nome}
            </Typography>
            <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.82rem", mt: 0.4 }}>
              {aderido.cpfLabel}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
            }}
          >
            <Paper
              elevation={0}
              sx={surfaces.cartaoResumo(true)}
            >
              <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.72rem" }}>
                Arrecadado
              </Typography>
              <Typography sx={{ ...typography.valorMonetario, mt: 0.35 }}>
                {formatarMoedaPix(aderido.totalArrecadado)}
              </Typography>
              {temSplit && (
                <Typography sx={{ color: "rgba(255,255,255,0.78)", fontSize: "0.72rem", mt: 0.4, fontStyle: "italic" }}>
                  Pix: {formatarMoedaPix(aderido.valorPix || 0)} • Comp: {formatarMoedaPix(aderido.valorComprovante || 0)}
                </Typography>
              )}
            </Paper>

            <Paper
              elevation={0}
              sx={surfaces.cartaoResumo()}
            >
              <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.72rem" }}>
                Rifas restantes
              </Typography>
              <Typography sx={{ color: colors.pretoEsverdeado, fontWeight: 950, mt: 0.35 }}>
                {aderido.rifasRestantes}
              </Typography>
              <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.72rem", mt: 0.4 }}>
                {aderido.rifasPagas} rifa(s) vendida(s)
              </Typography>
            </Paper>
          </Box>

          <Box>
            <Typography sx={typography.secaoTitulo}>
              Transações relacionadas
            </Typography>

            <Stack spacing={1}>
              {transacoesPagas.length > 0 ? (
                transacoesPagas.slice(0, 10).map((transacao) => (
                  <Box
                    key={transacao.id}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                      py: 0.85,
                      borderTop: "1px solid rgba(2, 27, 22, 0.08)",
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          ...typography.bodyDestaque,
                          fontSize: "0.85rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {transacao.compradorNome || "Pagador não informado"}
                      </Typography>
                      <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.75rem" }}>
                        {formatarDataPix(transacao.dataPagamento)}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        ...typography.valorMonetario,
                        fontSize: "0.9rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatarMoedaPix(transacao.valorPago)}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.85rem" }}>
                  Nenhum Pix pago vinculado.
                </Typography>
              )}
            </Stack>
          </Box>
        </Stack>
      )}
    </Drawer>
  );
}
