import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import { ReactNode } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";

import { ResumoAuditoriaCompras } from "../../../types/auditoriaCompras";
import { formatarMoedaAuditoria } from "../../../utils/auditoriaComprasUtils";
import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { typographyScale as typography } from "@/shared/tokens/typography";

interface ContadorAuditoriaProps {
  label: string;
  valor: string;
  detalhe: string;
  icon: ReactNode;
  destaque?: boolean;
}

function ContadorAuditoria({
  label,
  valor,
  detalhe,
  icon,
  destaque = false,
}: ContadorAuditoriaProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...surfaces.cartaoResumo(destaque),
        position: "relative",
        overflow: "hidden",
        p: { xs: 1.65, md: 2 },
        borderRadius: 2.25,
        bgcolor: destaque ? colors.verdeEscuro : colors.branco,
        border: destaque
          ? "1px solid rgba(255, 255, 255, 0.16)"
          : "1px solid rgba(2, 27, 22, 0.10)",
        boxShadow: destaque
          ? "0 16px 34px rgba(6, 61, 49, 0.18)"
          : "0 12px 28px rgba(2, 27, 22, 0.06)",
        minWidth: 0,
        height: "100%",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "0 auto 0 0",
          width: 5,
          bgcolor: destaque ? "#A8DCCB" : colors.verdeMedio,
        },
      }}
    >
      <Stack spacing={1.25} sx={{ pl: 0.65 }}>
        <Stack direction="row" spacing={1.1} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.2,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              color: colors.verdeEscuro,
              bgcolor: destaque ? colors.branco : colors.verdeClaro,
            }}
          >
            {icon}
          </Box>

          <Typography
            sx={{
              ...typography.label,
              color: destaque ? "rgba(255,255,255,0.82)" : colors.cinzaTexto,
              fontSize: { xs: "0.72rem", md: "0.76rem" },
              letterSpacing: "0.05em",
              lineHeight: 1.18,
            }}
          >
            {label}
          </Typography>
        </Stack>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              ...typography.titulo,
              color: destaque ? colors.branco : colors.pretoEsverdeado,
              fontSize: destaque
                ? { xs: "1.42rem", md: "1.78rem" }
                : { xs: "1.24rem", md: "1.48rem" },
              lineHeight: 1.08,
              overflowWrap: "anywhere",
            }}
          >
            {valor}
          </Typography>

          <Typography
            sx={{
              ...typography.bodyPequeno,
              color: destaque ? "rgba(255,255,255,0.76)" : colors.cinzaTexto,
              fontSize: { xs: "0.78rem", md: "0.84rem" },
              fontStyle: "italic",
              mt: 0.6,
              lineHeight: 1.35,
            }}
          >
            {detalhe}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

/**
 * Propriedades para renderização do resumo quantitativo e financeiro da auditoria.
 */
export interface AuditoriaComprasResumoProps {
  /** Estrutura com valores e quantidades consolidadas das compras */
  resumo: ResumoAuditoriaCompras;
}

/**
 * Componente dumb para exibição dos cards de resumo consolidados da auditoria de compras,
 * destacando arrecadação líquida e separação entre Pix e Comprovantes manuais.
 *
 * @param {AuditoriaComprasResumoProps} props - Propriedades contendo o resumo calculado.
 * @returns {JSX.Element} Grid com os 4 cartões de indicadores.
 */
export function AuditoriaComprasResumo({
  resumo,
}: AuditoriaComprasResumoProps) {
  const detalheValor = `Bruto: ${formatarMoedaAuditoria(
    resumo.valorTotal,
  )} • Pix: ${resumo.comprasPix} • Comp: ${resumo.comprasComprovante}`;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          md: "1.35fr repeat(3, minmax(0, 1fr))",
        },
        gap: { xs: 1.15, md: 2 },
        mb: { xs: 1.75, md: 2.5 },
      }}
    >
      <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
        <ContadorAuditoria
          label="Valor auditável (Líquido)"
          valor={formatarMoedaAuditoria(resumo.valorLiquido)}
          detalhe={detalheValor}
          icon={<AttachMoneyOutlinedIcon fontSize="small" />}
          destaque
        />
      </Box>
      <ContadorAuditoria
        label="Compras"
        valor={String(resumo.totalCompras)}
        detalhe="Grupos auditáveis"
        icon={<GroupsOutlinedIcon fontSize="small" />}
      />
      <ContadorAuditoria
        label="Rifas"
        valor={String(resumo.totalRifas)}
        detalhe="Bilhetes no resultado"
        icon={<ConfirmationNumberOutlinedIcon fontSize="small" />}
      />
      <ContadorAuditoria
        label="Status"
        valor={`${resumo.pagas}/${resumo.pendentes}`}
        detalhe={`${resumo.recusadas} recusada(s)`}
        icon={<FactCheckOutlinedIcon fontSize="small" />}
      />
    </Box>
  );
}
