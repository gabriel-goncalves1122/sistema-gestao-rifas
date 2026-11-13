import { useEffect, useState } from "react";
import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";

import { TransacaoTesouraria } from "../../../types/auditoriaCompras";

import { AuditoriaCompraActions } from "../shared/AuditoriaCompraActions";
import { AuditoriaStatusChip } from "../shared/AuditoriaStatusChip";
import { AuditoriaOrigemChip } from "../shared/AuditoriaOrigemChip";
import { AuditoriaCorrecaoChip } from "../shared/AuditoriaCorrecaoChip";
import {
  formatarTelefone,
  formatarDataCurta,
  formatarMoeda,
} from "@/shared/utils/formatadores";
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
 * com paginação nativa (25/50/100 por página), comprador + contato unificados,
 * valor nominal bruto e suporte visual a status, canal de origem e pendência de correção.
 *
 * @param {AuditoriaComprasTableProps} props - Propriedades do componente.
 * @returns {JSX.Element} Tabela estilizada e paginada.
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
  const [pagina, setPagina] = useState(0);
  const [itensPorPagina, setItensPorPagina] = useState(25);

  useEffect(() => {
    setPagina(0);
  }, [compras]);

  const comprasPaginadas = compras.slice(
    pagina * itensPorPagina,
    pagina * itensPorPagina + itensPorPagina,
  );

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
            <TableCell>Comprador & Contato</TableCell>
            <TableCell>Vendedor</TableCell>
            <TableCell>Rifas</TableCell>
            <TableCell>Status & Canal</TableCell>
            <TableCell align="right">Valor</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {comprasPaginadas.map((compra) => (
            <TableRow
              key={compra.id}
              hover
              onClick={() => onVerDetalhes(compra)}
              data-testid={`auditoria-compra-${compra.id}`}
              sx={{
                ...components.linhaTabela,
                cursor: "pointer",
              }}
            >
              <TableCell sx={{ minWidth: 115 }}>
                <Typography sx={typography.bodyDestaque}>
                  {formatarDataCurta(compra.dataReserva)}
                </Typography>
                <Typography sx={typography.bodyPequeno}>Reserva</Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 210 }}>
                <Typography
                  sx={{
                    ...typography.bodyDestaque,
                    fontWeight: 950,
                  }}
                >
                  {compra.compradorNome}
                </Typography>
                <Typography
                  sx={{
                    color: colors.cinzaTexto,
                    fontSize: "0.78rem",
                    overflowWrap: "anywhere",
                  }}
                >
                  {compra.compradorEmail || "Sem e-mail"}
                  {compra.compradorTelefone
                    ? ` • ${formatarTelefone(compra.compradorTelefone)}`
                    : ""}
                </Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 165 }}>
                <Typography sx={typography.bodyDestaque}>
                  {compra.vendedorNome}
                </Typography>
                <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.78rem" }}>
                  {compra.vendedorCpf}
                </Typography>
              </TableCell>
              <TableCell>
                <Stack
                  direction="row"
                  spacing={0.5}
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ maxWidth: 185 }}
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
              <TableCell sx={{ minWidth: 155 }}>
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
              <TableCell align="right" sx={{ minWidth: 110 }}>
                <Box sx={components.labelVerde}>
                  {formatarMoeda(compra.valorTotal)}
                </Box>
              </TableCell>
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
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

      {compras.length > 25 && (
        <TablePagination
          component="div"
          count={compras.length}
          page={pagina}
          onPageChange={(_, novaPagina) => setPagina(novaPagina)}
          rowsPerPage={itensPorPagina}
          onRowsPerPageChange={(event) => {
            setItensPorPagina(Number.parseInt(event.target.value, 10));
            setPagina(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
          labelRowsPerPage="Compras por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} de ${count}`
          }
          sx={{
            borderTop: "1px solid rgba(2, 27, 22, 0.08)",
          }}
        />
      )}
    </Paper>
  );
}
