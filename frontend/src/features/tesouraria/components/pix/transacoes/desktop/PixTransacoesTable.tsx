import { useEffect, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  IconButton,
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

import { colors } from "@/shared/tokens/colors";
import { components } from "@/shared/tokens/components";
import { surfaces } from "@/shared/tokens/surfaces";
import { PixTransacao } from "../../../../types/pixTransacoes";
import {
  formatarDataPix,
  formatarMoedaPix,
} from "../../../../utils/pixTransacoesUtils";
import { PixTransacaoDetalhesDialog } from "../shared/PixTransacaoDetalhesDialog";
import { PixTransacaoAcoes } from "../shared/PixTransacaoAcoes";

interface PixTransacoesTableProps {
  transacoes: PixTransacao[];
  onAceitar: (id: string) => Promise<void>;
  onNegar: (id: string, motivo: string) => Promise<void>;
}

/**
 * Tabela desktop de transações Pix com paginação nativa para evitar gargalos de DOM.
 */
export function PixTransacoesTable({
  transacoes,
  onAceitar,
  onNegar,
}: PixTransacoesTableProps) {
  const [transacaoDetalhada, setTransacaoDetalhada] =
    useState<PixTransacao | null>(null);
  const [pagina, setPagina] = useState(0);
  const [itensPorPagina, setItensPorPagina] = useState(25);

  useEffect(() => {
    setPagina(0);
  }, [transacoes]);

  const transacoesPaginadas = transacoes.slice(
    pagina * itensPorPagina,
    pagina * itensPorPagina + itensPorPagina,
  );

  return (
    <>
      <Paper elevation={0} sx={{ ...surfaces.paper, overflow: "hidden" }}>
        <Table>
          <TableHead>
            <TableRow
              sx={{
                ...components.tabelaCabecalho,
                "& th": {
                  ...components.tabelaCabecalho["& th"],
                  fontSize: "0.75rem",
                },
              }}
            >
              <TableCell sx={{ width: 54 }} />
              <TableCell>Data</TableCell>
              <TableCell>Pagador</TableCell>
              <TableCell align="right">Valor / Status</TableCell>
              <TableCell align="center" sx={{ width: 100 }}>
                Ações
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {transacoesPaginadas.map((transacao) => {
              const valor =
                transacao.statusPagamento === "PAID"
                  ? transacao.valorPago
                  : transacao.valorBruto;

              return (
                <TableRow
                  key={transacao.id}
                  hover
                  tabIndex={0}
                  data-testid={`pix-transacao-${transacao.id}`}
                  onClick={() => setTransacaoDetalhada(transacao)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setTransacaoDetalhada(transacao);
                    }
                  }}
                  sx={{
                    cursor: "pointer",
                    transition: "background-color 160ms ease",
                    ...components.linhaTabela,
                    "&:hover": {
                      bgcolor: colors.fundoSuave,
                    },
                    "&:focus-visible": {
                      outline: `2px solid ${colors.verdeEscuro}`,
                      outlineOffset: -2,
                    },
                  }}
                >
                  <TableCell>
                    <IconButton
                      aria-label={`Abrir detalhes da transação Pix ${transacao.compradorNome || transacao.id}`}
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        setTransacaoDetalhada(transacao);
                      }}
                      sx={{
                        borderRadius: 2,
                        color: colors.verdeEscuro,
                        bgcolor: colors.verdeClaro,
                        "&:hover": {
                          bgcolor: colors.verdeHover,
                        },
                      }}
                    >
                      <ExpandMoreIcon
                        sx={{
                          transform: "rotate(-90deg)",
                          fontSize: 20,
                        }}
                      />
                    </IconButton>
                  </TableCell>

                  <TableCell sx={{ color: colors.cinzaTexto, fontWeight: 700 }}>
                    {formatarDataPix(
                      transacao.dataPagamento || transacao.dataCriacao,
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography
                      sx={{ color: colors.pretoEsverdeado, fontWeight: 850 }}
                    >
                      {transacao.compradorNome || "Pagador não informado"}
                    </Typography>
                    <Typography
                      sx={{ color: colors.cinzaTexto, fontSize: "0.82rem" }}
                    >
                      {transacao.compradorEmail ||
                        transacao.aderido?.nome ||
                        "Sem e-mail informado"}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Stack alignItems="flex-end" spacing={0.75}>
                      <Typography
                        sx={{
                          color:
                            transacao.statusPagamento === "PAID"
                              ? colors.verdeEscuro
                              : colors.alertaTexto,
                          fontWeight: 950,
                        }}
                      >
                        {formatarMoedaPix(valor)}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell
                    align="center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PixTransacaoAcoes
                      transacao={transacao}
                      compact
                      onAceitar={onAceitar}
                      onNegar={onNegar}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {transacoes.length > 25 && (
          <TablePagination
            component="div"
            count={transacoes.length}
            page={pagina}
            onPageChange={(_, novaPagina) => setPagina(novaPagina)}
            rowsPerPage={itensPorPagina}
            onRowsPerPageChange={(event) => {
              setItensPorPagina(Number.parseInt(event.target.value, 10));
              setPagina(0);
            }}
            rowsPerPageOptions={[25, 50, 100]}
            labelRowsPerPage="Transações por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} de ${count}`
            }
            sx={{
              borderTop: "1px solid rgba(2, 27, 22, 0.08)",
            }}
          />
        )}
      </Paper>

      <PixTransacaoDetalhesDialog
        transacao={transacaoDetalhada}
        onClose={() => setTransacaoDetalhada(null)}
        onAceitar={onAceitar}
        onNegar={onNegar}
      />
    </>
  );
}
