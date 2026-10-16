import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { TransacaoTesouraria } from "../../../types/auditoriaCompras";
import {
  formatarDataAuditoria,
  formatarMoedaAuditoria,
} from "../../../utils/auditoriaComprasUtils";
import { AuditoriaCompraActions } from "../shared/AuditoriaCompraActions";
import { AuditoriaStatusChip } from "../shared/AuditoriaStatusChip";
import { AuditoriaOrigemChip } from "../shared/AuditoriaOrigemChip";
import { AuditoriaCorrecaoChip } from "../shared/AuditoriaCorrecaoChip";
import { formatarTelefone } from "@/shared/utils/formatadores";
import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { components } from "@/shared/tokens/components";
import { typographyScale as typography } from "@/shared/tokens/typography";

/**
 * Propriedades para renderização da tabela de auditoria de compras no desktop.
 */
export interface AuditoriaComprasTableProps {
  /** Lista de compras filtradas a exibir */
  compras: TransacaoTesouraria[];
  /** Callback para visualização do arquivo de comprovante */
  onVerComprovante: (compra: TransacaoTesouraria) => void;
  /** Callback para abertura do diálogo de edição do comprador */
  onEditar: (compra: TransacaoTesouraria) => void;
  /** Callback para abertura do modal com os detalhes completos da compra */
  onVerDetalhes: (compra: TransacaoTesouraria) => void;
  /** Callback para reenvio do e-mail com os bilhetes e comprovante */
  onReenviarEmailComprovante: (compra: TransacaoTesouraria) => void;
  /** ID da compra atualmente em processamento de reenvio de e-mail */
  reenviandoEmailComprovanteId?: string | null;
  /** Callback opcional para aceitar compra pendente */
  onAceitar?: (compra: TransacaoTesouraria) => void;
  /** Callback opcional para recusar compra pendente */
  onNegar?: (compra: TransacaoTesouraria) => void;
  /** ID da compra atualmente em processamento de ação transacional */
  processandoAcaoId?: string | null;
}

/**
 * Tabela detalhada de auditoria de compras para exibição em desktop,
 * com suporte visual a status, canal de origem (Pix/Comprovante), pendência de correção
 * e discriminação de valores líquidos e brutos.
 *
 * @param {AuditoriaComprasTableProps} props - Propriedades do componente.
 * @returns {JSX.Element} Tabela estilizada.
 */
export function AuditoriaComprasTable({
  compras,
  onVerComprovante,
  onEditar,
  onVerDetalhes,
  onReenviarEmailComprovante,
  reenviandoEmailComprovanteId,
  onAceitar,
  onNegar,
  processandoAcaoId,
}: AuditoriaComprasTableProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        display: { xs: "none", md: "block" },
        ...surfaces.paperComSombra,
        overflow: "hidden",
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow sx={components.tabelaCabecalho}>
            <TableCell>Data</TableCell>
            <TableCell>Comprador</TableCell>
            <TableCell>Contato</TableCell>
            <TableCell>Vendedor</TableCell>
            <TableCell>Rifas</TableCell>
            <TableCell>Status & Origem</TableCell>
            <TableCell align="right">Valor (Líquido)</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {compras.map((compra) => {
            const valorLiquido = compra.valorLiquido ?? compra.valorTotal;
            const possuiTaxa =
              compra.valorLiquido !== undefined &&
              compra.valorLiquido !== compra.valorTotal;

            return (
              <TableRow
                key={compra.id}
                hover
                data-testid={`auditoria-compra-${compra.id}`}
                sx={components.linhaTabela}
              >
                <TableCell sx={{ minWidth: 128 }}>
                  <Typography sx={typography.bodyDestaque}>
                    {formatarDataAuditoria(compra.dataReserva)}
                  </Typography>
                  <Typography sx={typography.bodyPequeno}>Reserva</Typography>
                </TableCell>
                <TableCell sx={{ minWidth: 180 }}>
                  <Typography
                    sx={{
                      ...typography.bodyDestaque,
                      fontWeight: 950,
                    }}
                  >
                    {compra.compradorNome}
                  </Typography>
                </TableCell>
                <TableCell sx={{ minWidth: 190 }}>
                  <Typography
                    sx={{
                      color: colors.pretoEsverdeado,
                      fontSize: "0.86rem",
                      fontWeight: 750,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {compra.compradorEmail || "Sem e-mail"}
                  </Typography>
                  <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.8rem" }}>
                    {compra.compradorTelefone
                      ? formatarTelefone(compra.compradorTelefone)
                      : "Sem telefone"}
                  </Typography>
                </TableCell>
                <TableCell sx={{ minWidth: 170 }}>
                  <Typography sx={typography.bodyDestaque}>
                    {compra.vendedorNome}
                  </Typography>
                  <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.8rem" }}>
                    {compra.vendedorCpf}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ maxWidth: 180 }}
                  >
                    {compra.bilhetes.slice(0, 5).map((bilhete) => (
                      <Chip
                        key={bilhete}
                        label={bilhete}
                        size="small"
                        sx={{
                          ...components.chipBilhete,
                          height: 24,
                          borderRadius: 1.5,
                          border: "1px solid rgba(6, 61, 49, 0.18)",
                        }}
                      />
                    ))}
                    {compra.bilhetes.length > 5 && (
                      <Chip
                        label={`+ ${compra.bilhetes.length - 5}`}
                        size="small"
                        sx={{
                          ...components.chipBilhete,
                          height: 24,
                          borderRadius: 1.5,
                          bgcolor: colors.fundoSuave,
                          color: colors.cinzaTexto,
                          border: "1px solid rgba(6, 61, 49, 0.12)",
                        }}
                      />
                    )}
                  </Stack>
                </TableCell>
                <TableCell sx={{ minWidth: 160 }}>
                  <Stack spacing={0.65}>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <AuditoriaStatusChip status={compra.status} />
                      <AuditoriaOrigemChip origem={compra.origem} />
                    </Stack>
                    {compra.correcaoPendente && (
                      <AuditoriaCorrecaoChip pendente={compra.correcaoPendente} />
                    )}
                  </Stack>
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 120 }}>
                  <Box sx={components.labelVerde}>
                    {formatarMoedaAuditoria(valorLiquido)}
                  </Box>
                  {possuiTaxa && (
                    <Typography
                      sx={{
                        color: colors.cinzaTexto,
                        fontSize: "0.74rem",
                        fontStyle: "italic",
                        mt: 0.3,
                      }}
                    >
                      Bruto: {formatarMoedaAuditoria(compra.valorTotal)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <AuditoriaCompraActions
                    compra={compra}
                    onVerComprovante={onVerComprovante}
                    onEditar={onEditar}
                    onVerDetalhes={onVerDetalhes}
                    onReenviarEmailComprovante={onReenviarEmailComprovante}
                    reenviandoEmailComprovante={
                      Boolean(compra.compradorId) &&
                      compra.compradorId === reenviandoEmailComprovanteId
                    }
                    onAceitar={onAceitar}
                    onNegar={onNegar}
                    processandoAcaoId={processandoAcaoId}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}
