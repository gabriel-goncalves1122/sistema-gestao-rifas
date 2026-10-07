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
import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { components } from "@/shared/tokens/components";
import { typographyScale as typography } from "@/shared/tokens/typography";

interface AuditoriaComprasTableProps {
  compras: TransacaoTesouraria[];
  onVerComprovante: (compra: TransacaoTesouraria) => void;
  onEditar: (compra: TransacaoTesouraria) => void;
  onVerDetalhes: (compra: TransacaoTesouraria) => void;
  onReenviarEmailComprovante: (compra: TransacaoTesouraria) => void;
  reenviandoEmailComprovanteId?: string | null;
  onAceitar?: (compra: TransacaoTesouraria) => void;
  onNegar?: (compra: TransacaoTesouraria) => void;
  processandoAcaoId?: string | null;
}

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
          <TableRow
            sx={components.tabelaCabecalho}
          >
            <TableCell>Data</TableCell>
            <TableCell>Comprador</TableCell>
            <TableCell>Contato</TableCell>
            <TableCell>Vendedor</TableCell>
            <TableCell>Rifas</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Valor</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {compras.map((compra) => (
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
                <Typography sx={typography.bodyPequeno}>
                  Reserva
                </Typography>
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
                <Typography sx={{ ...typography.bodyPequeno, mt: 0.3 }}>
                  ID: {compra.compradorId || "sem compradorId"}
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
                  {compra.compradorTelefone || "Sem telefone"}
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
                  sx={{ maxWidth: 160 }}
                >
                  {compra.bilhetes.map((bilhete) => (
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
                </Stack>
              </TableCell>
              <TableCell>
                <AuditoriaStatusChip status={compra.status} />
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 118 }}>
                <Box
                  sx={components.labelVerde}
                >
                  {formatarMoedaAuditoria(compra.valorTotal)}
                </Box>
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
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
