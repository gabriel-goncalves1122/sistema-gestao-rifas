import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

import { AuditoriaCompraActions } from "../shared/AuditoriaCompraActions";
import { AuditoriaStatusChip } from "../shared/AuditoriaStatusChip";
import { TransacaoTesouraria } from "../../../types/auditoriaCompras";
import {
  formatarDataAuditoria,
  formatarMoedaAuditoria,
} from "../../../utils/auditoriaComprasUtils";
import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { components } from "@/shared/tokens/components";
import { typographyScale as typography } from "@/shared/tokens/typography";

interface AuditoriaComprasCardProps {
  compra: TransacaoTesouraria;
  onVerComprovante: (compra: TransacaoTesouraria) => void;
  onEditar: (compra: TransacaoTesouraria) => void;
  onVerDetalhes: (compra: TransacaoTesouraria) => void;
  onReenviarEmailComprovante: (compra: TransacaoTesouraria) => void;
  reenviandoEmailComprovante?: boolean;
  onAceitar?: (compra: TransacaoTesouraria) => void;
  onNegar?: (compra: TransacaoTesouraria) => void;
  processandoAcaoId?: string | null;
}

export function AuditoriaCompraCard({
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
  return (
    <Paper
      elevation={0}
      data-testid={`auditoria-compra-${compra.id}`}
      sx={styles.cardContainer}
    >
      <Stack spacing={0}>
        <Box onClick={() => onVerDetalhes(compra)} sx={{ cursor: "pointer" }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            spacing={1}
            sx={styles.headerStack}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={styles.nomeComprador}>
              {compra.compradorNome}
            </Typography>
              <Typography sx={styles.dataReserva}>
                {formatarDataAuditoria(compra.dataReserva)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: "right", flexShrink: 0 }}>
              <Typography sx={styles.valorTotal}>
                {formatarMoedaAuditoria(compra.valorTotal)}
              </Typography>
              <Typography sx={styles.rifasBadge}>
                {compra.bilhetes.length} rifa(s)
              </Typography>
            </Box>
          </Stack>

        <Stack spacing={1.25} sx={{ p: 1.5 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            <AuditoriaStatusChip status={compra.status} />
            {compra.comprovanteUrl ? (
              <Chip
                label="Com comprovante"
                size="small"
                sx={styles.chipComprovante}
              />
            ) : null}
          </Stack>

          <Box sx={styles.infoGrid}>
            <Box sx={styles.contatoBox}>
              <Typography sx={typography.label}>Contato do comprador</Typography>
              <Typography sx={styles.contatoEmail}>
                {compra.compradorEmail || "Sem e-mail"}
              </Typography>
              <Typography sx={styles.contatoTelefone}>
                {compra.compradorTelefone || "Sem telefone"}
              </Typography>
            </Box>

            <Box sx={styles.vendedorBox}>
              <Typography sx={typography.label}>Vendedor responsável</Typography>
              <Typography sx={{ ...typography.bodyDestaque, mt: 0.25 }}>
                {compra.vendedorNome}
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={0.65} flexWrap="wrap" useFlexGap>
            {compra.bilhetes.slice(0, 5).map((bilhete) => (
              <Chip
                key={bilhete}
                label={`Rifa ${bilhete}`}
                size="small"
                sx={styles.chipRifa}
              />
            ))}
            {compra.bilhetes.length > 5 && (
              <Chip
                label={`+ ${compra.bilhetes.length - 5}`}
                size="small"
                sx={styles.chipRifaExtra}
              />
            )}
          </Stack>
        </Stack>
      </Box>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          sx={styles.actionsStack}
        >
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
        </Stack>
      </Stack>
    </Paper>
  );
}

const styles = {
  cardContainer: {
    ...surfaces.paper,
    p: 0,
    boxShadow: "0 12px 28px rgba(2, 27, 22, 0.07)",
    overflow: "hidden",
  },
  headerStack: {
    p: 1.5,
    borderLeft: `5px solid ${colors.verdeEscuro}`,
    borderBottom: "1px solid rgba(2, 27, 22, 0.08)",
  },
  nomeComprador: {
    ...typography.titulo,
    fontSize: "1rem",
    lineHeight: 1.18,
  },
  dataReserva: {
    ...typography.bodyPequeno,
    mt: 0.35,
  },
  valorTotal: {
    color: colors.verdeEscuro,
    fontWeight: 950,
    fontSize: "1.12rem",
    whiteSpace: "nowrap",
  },
  rifasBadge: {
    color: colors.cinzaTexto,
    fontSize: "0.74rem",
    mt: 0.25,
  },
  chipComprovante: {
    ...components.chipBilhete,
    height: 28,
    borderRadius: 2,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 1,
  },
  contatoBox: {
    ...surfaces.cartaoInfo,
    p: 1.15,
    borderRadius: 2.25,
  },
  contatoEmail: {
    ...typography.bodyDestaque,
    mt: 0.25,
    overflowWrap: "anywhere",
  },
  contatoTelefone: {
    color: colors.cinzaTexto,
    fontSize: "0.8rem",
    mt: 0.2,
  },
  vendedorBox: {
    ...surfaces.fundoVerdeClaro,
    p: 1.15,
    borderRadius: 2.25,
  },
  chipRifa: {
    ...components.chipBilhete,
    height: 28,
    borderRadius: 2,
    border: "1px solid rgba(6, 61, 49, 0.14)",
  },
  chipRifaExtra: {
    ...components.chipBilhete,
    height: 28,
    borderRadius: 2,
    bgcolor: colors.fundoSuave,
    color: colors.cinzaTexto,
    border: "1px solid rgba(6, 61, 49, 0.08)",
  },
  actionsStack: {
    px: 1.25,
    py: 0.75,
    bgcolor: colors.fundoDialogActions,
    borderTop: "1px solid rgba(2, 27, 22, 0.08)",
  },
};
