import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

import { AuditoriaCompraActions } from "../shared/AuditoriaCompraActions";
import { AuditoriaStatusChip } from "../shared/AuditoriaStatusChip";
import { AuditoriaOrigemChip } from "../shared/AuditoriaOrigemChip";
import { AuditoriaCorrecaoChip } from "../shared/AuditoriaCorrecaoChip";
import { TransacaoTesouraria } from "../../../types/auditoriaCompras";
import {
  formatarDataAuditoria,
  formatarMoedaAuditoria,
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

/**
 * Cartão de compra mobile para a tela de auditoria, exibindo status,
 * canal de origem (Pix ou Comprovante), tag de correção pendente e valores discriminados.
 *
 * @param {AuditoriaComprasCardProps} props - Propriedades do cartão.
 * @returns {JSX.Element} Card responsivo com ações acopladas.
 */
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
  const valorLiquido = compra.valorLiquido ?? compra.valorTotal;
  const possuiTaxa =
    compra.valorLiquido !== undefined &&
    compra.valorLiquido !== compra.valorTotal;

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
                {formatarMoedaAuditoria(valorLiquido)}
              </Typography>
              {possuiTaxa && (
                <Typography sx={styles.valorBruto}>
                  Bruto: {formatarMoedaAuditoria(compra.valorTotal)}
                </Typography>
              )}
              <Typography sx={styles.rifasBadge}>
                {compra.bilhetes.length} rifa(s)
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={1.25} sx={{ p: 1.5 }}>
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
            >
              <AuditoriaStatusChip status={compra.status} />
              <AuditoriaOrigemChip origem={compra.origem} />
              <AuditoriaCorrecaoChip pendente={compra.correcaoPendente} />
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
                  {compra.compradorTelefone
                    ? formatarTelefone(compra.compradorTelefone)
                    : "Sem telefone"}
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
  valorBruto: {
    color: colors.cinzaTexto,
    fontSize: "0.74rem",
    fontStyle: "italic",
    mt: 0.2,
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
