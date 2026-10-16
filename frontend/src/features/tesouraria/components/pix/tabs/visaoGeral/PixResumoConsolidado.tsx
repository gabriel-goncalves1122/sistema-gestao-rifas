import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import PixIcon from "@mui/icons-material/Pix";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { typographyScale as typography } from "@/shared/tokens/typography";
import { PixTransacoesResumo } from "../../../../types/pixTransacoes";
import {
  formatarMoedaPix,
  obterIndicadoresConsolidados,
} from "../../../../utils/pixTransacoesUtils";

/**
 * Interface de propriedades do componente PixResumoConsolidado.
 */
export interface PixResumoConsolidadoProps {
  /** Objeto consolidado de métricas financeiras recebido da API. */
  resumo: PixTransacoesResumo;
  /** Flag indicando se a visualização está em dispositivo móvel. */
  isMobile?: boolean;
}

/**
 * Painel consolidado unificado da Tesouraria exibindo as métricas comparativas
 * entre vendas automatizadas via Pix, comprovantes manuais e o Total Geral.
 *
 * @param {PixResumoConsolidadoProps} props - Propriedades do componente.
 * @returns {JSX.Element} Visualização em cards de resumo por canal.
 */
export function PixResumoConsolidado({
  resumo,
  isMobile = false,
}: PixResumoConsolidadoProps) {
  const ind = obterIndicadoresConsolidados(resumo);

  return (
    <Box sx={{ mb: { xs: 2, sm: 3 } }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
      >
        <Typography
          sx={{
            ...typography.sectionTitle,
            color: colors.pretoEsverdeado,
            fontSize: { xs: "1.05rem", sm: "1.2rem" },
            fontWeight: 900,
          }}
        >
          Consolidação de Canais de Entrada
        </Typography>
        <Chip
          size="small"
          label="Pix Gateway + Comprovantes"
          sx={{
            bgcolor: colors.verdeClaro,
            color: colors.verdeEscuro,
            fontWeight: 700,
            fontSize: "0.74rem",
            mt: { xs: 0.5, md: 0 },
          }}
        />
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        {/* Bloco 1: Total Geral Consolidado (Destaque) */}
        <Paper
          elevation={0}
          sx={{
            ...surfaces.paperComSombra,
            p: 2.2,
            borderRadius: 2.5,
            border: `1.5px solid ${colors.verdeEscuro}`,
            bgcolor: colors.branco,
            order: { xs: -1, md: 0 },
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              bgcolor: colors.verdeEscuro,
            },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ ...typography.label, color: colors.verdeEscuro, fontWeight: 900 }}>
              TOTAL GERAL CONSOLIDADO
            </Typography>
            <AccountBalanceWalletIcon sx={{ color: colors.verdeEscuro, fontSize: 22 }} />
          </Stack>

          <Typography
            sx={{
              color: colors.pretoEsverdeado,
              fontSize: { xs: "1.5rem", sm: "1.75rem" },
              fontWeight: 950,
              lineHeight: 1.1,
              mt: 0.5,
            }}
          >
            {formatarMoedaPix(ind.totalGeral.recebidoLiquido)}
          </Typography>

          <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.78rem", mt: 0.25 }}>
            Valor bruto: {formatarMoedaPix(ind.totalGeral.recebidoBruto)}
          </Typography>

          <Box
            sx={{
              mt: 1.75,
              pt: 1.5,
              borderTop: "1px dashed rgba(2, 27, 22, 0.12)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
            }}
          >
            <Box>
              <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.72rem", fontWeight: 700 }}>
                RIFAS PAGAS
              </Typography>
              <Typography sx={{ color: colors.pretoEsverdeado, fontSize: "1.1rem", fontWeight: 900 }}>
                {ind.totalGeral.rifasPagas}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.72rem", fontWeight: 700 }}>
                PENDENTES
              </Typography>
              <Typography sx={{ color: colors.dourado, fontSize: "1.1rem", fontWeight: 900 }}>
                {ind.totalGeral.rifasPendentes} rifas
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Bloco 2: Pix Automatizado */}
        <Paper
          elevation={0}
          sx={{
            ...surfaces.paperComSombra,
            p: 2.2,
            borderRadius: 2.5,
            border: "1px solid rgba(2, 27, 22, 0.10)",
            bgcolor: colors.branco,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ ...typography.label, color: colors.verdeForte, fontWeight: 900 }}>
              PIX AUTOMATIZADO
            </Typography>
            <PixIcon sx={{ color: colors.verdeForte, fontSize: 22 }} />
          </Stack>

          <Typography
            sx={{
              color: colors.pretoEsverdeado,
              fontSize: { xs: "1.4rem", sm: "1.55rem" },
              fontWeight: 950,
              lineHeight: 1.1,
              mt: 0.5,
            }}
          >
            {formatarMoedaPix(ind.pix.recebidoLiquido)}
          </Typography>

          <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.78rem", mt: 0.25 }}>
            Bruto: {formatarMoedaPix(ind.pix.recebidoBruto)} (taxa de 1% deduzida)
          </Typography>

          <Box
            sx={{
              mt: 1.75,
              pt: 1.5,
              borderTop: "1px dashed rgba(2, 27, 22, 0.12)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
            }}
          >
            <Box>
              <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.72rem", fontWeight: 700 }}>
                PAGAMENTOS PIX
              </Typography>
              <Typography sx={{ color: colors.pretoEsverdeado, fontSize: "1.05rem", fontWeight: 900 }}>
                {ind.pix.rifasPagas} rifas
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.72rem", fontWeight: 700 }}>
                AGUARDANDO
              </Typography>
              <Typography sx={{ color: colors.dourado, fontSize: "1.05rem", fontWeight: 900 }}>
                {formatarMoedaPix(ind.pix.valorAguardandoBruto)}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Bloco 3: Comprovantes Manuais */}
        <Paper
          elevation={0}
          sx={{
            ...surfaces.paperComSombra,
            p: 2.2,
            borderRadius: 2.5,
            border: "1px solid rgba(2, 27, 22, 0.10)",
            bgcolor: colors.branco,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ ...typography.label, color: colors.cinzaTexto, fontWeight: 900 }}>
              COMPROVANTES MANUAIS
            </Typography>
            <ReceiptLongIcon sx={{ color: colors.cinzaTexto, fontSize: 22 }} />
          </Stack>

          <Typography
            sx={{
              color: colors.pretoEsverdeado,
              fontSize: { xs: "1.4rem", sm: "1.55rem" },
              fontWeight: 950,
              lineHeight: 1.1,
              mt: 0.5,
            }}
          >
            {formatarMoedaPix(ind.comprovantes.valorRecebido)}
          </Typography>

          <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.78rem", mt: 0.25 }}>
            {ind.comprovantes.transacoesPagas} compras conferidas manualmente
          </Typography>

          <Box
            sx={{
              mt: 1.75,
              pt: 1.5,
              borderTop: "1px dashed rgba(2, 27, 22, 0.12)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
            }}
          >
            <Box>
              <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.72rem", fontWeight: 700 }}>
                RIFAS PAGAS
              </Typography>
              <Typography sx={{ color: colors.pretoEsverdeado, fontSize: "1.05rem", fontWeight: 900 }}>
                {ind.comprovantes.rifasPagas} rifas
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.72rem", fontWeight: 700 }}>
                A CONFERIR
              </Typography>
              <Typography sx={{ color: colors.dourado, fontSize: "1.05rem", fontWeight: 900 }}>
                {formatarMoedaPix(ind.comprovantes.valorPendente)}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
