import { useEffect, useState } from "react";
import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";

import { TransacaoTesouraria } from "../../../types/auditoriaCompras";

import { AuditoriaCompraActions } from "../shared/AuditoriaCompraActions";
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
}

/**
 * Tabela detalhada de auditoria de compras para exibição em desktop,
 * com paginação nativa (25/50/100 por página), scroll horizontal protegido,
 * coluna de ações fixa à direita e suporte a status e pendência de correção.
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
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={components.tabelaCabecalho}>
              <TableCell>Data</TableCell>
              <TableCell>Comprador & Contato</TableCell>
              <TableCell>Vendedor</TableCell>
              <TableCell>Rifas</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell
                align="right"
                sx={{
                  position: "sticky",
                  right: 0,
                  zIndex: 2,
                  bgcolor: colors.fundoSuave,
                  boxShadow: "-6px 0 12px -4px rgba(2, 27, 22, 0.08)",
                  minWidth: 112,
                }}
              >
                Ações
              </TableCell>
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
                  "&:hover .auditoria-acoes-sticky": {
                    bgcolor: "#F4F8F6",
                  },
                }}
              >
                <TableCell sx={{ minWidth: 96, whiteSpace: "nowrap" }}>
                  <Typography sx={typography.bodyDestaque}>
                    {formatarDataCurta(compra.dataReserva)}
                  </Typography>
                  <Typography sx={typography.bodyPequeno}>Reserva</Typography>
                </TableCell>
                <TableCell sx={{ minWidth: 175, maxWidth: 245 }}>
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
                      fontSize: "0.76rem",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {compra.compradorEmail || "Sem e-mail"}
                    {compra.compradorTelefone
                      ? ` • ${formatarTelefone(compra.compradorTelefone)}`
                      : ""}
                  </Typography>
                </TableCell>
                <TableCell sx={{ minWidth: 130, maxWidth: 175 }}>
                  <Typography sx={typography.bodyDestaque}>
                    {compra.vendedorNome}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ maxWidth: 165 }}
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
                  {compra.correcaoPendente && (
                    <Box sx={{ mt: 0.5 }}>
                      <AuditoriaCorrecaoChip pendente={compra.correcaoPendente} />
                    </Box>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 96, whiteSpace: "nowrap" }}>
                  <Box sx={components.labelVerde}>
                    {formatarMoeda(compra.valorTotal)}
                  </Box>
                </TableCell>
                <TableCell
                  align="right"
                  className="auditoria-acoes-sticky"
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    position: "sticky",
                    right: 0,
                    zIndex: 1,
                    bgcolor: colors.branco,
                    boxShadow: "-6px 0 12px -4px rgba(2, 27, 22, 0.08)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <AuditoriaCompraActions
                    compra={compra}
                    variante="desktop"
                    onVerComprovante={onVerComprovante}
                    onEditar={onEditar}
                    onVerDetalhes={onVerDetalhes}
                    onReenviarEmailComprovante={onReenviarEmailComprovante}
                    reenviandoEmailComprovante={
                      Boolean(compra.compradorId) &&
                      compra.compradorId === reenviandoEmailComprovanteId
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
