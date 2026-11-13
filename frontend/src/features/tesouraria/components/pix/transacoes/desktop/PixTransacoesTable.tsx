import { useEffect, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Checkbox,
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
import {
  formatarData,
  formatarMoeda,
} from "@/shared/utils/formatadores";

import { colors } from "@/shared/tokens/colors";
import { components } from "@/shared/tokens/components";
import { surfaces } from "@/shared/tokens/surfaces";

import { PixTransacao } from "../../../../types/pixTransacoes";
import { podeValidarPixTransacao } from "../../../../utils/pixTransacoesStatusUtils";
import { PixOrigemChip } from "../shared/PixOrigemChip";
import { PixTransacaoAcoes } from "../shared/PixTransacaoAcoes";
import { PixTransacaoDetalhesDialog } from "../shared/PixTransacaoDetalhesDialog";

/**
 * Propriedades da tabela desktop de transações Pix.
 */
export interface PixTransacoesTableProps {
  /** Lista de transações filtradas a exibir. */
  transacoes: PixTransacao[];
  /** Callback de aprovação individual. */
  onAceitar: (id: string, chaveAcao?: string) => Promise<void>;
  /** Callback de recusa individual com justificativa. */
  onNegar: (id: string, motivo: string, chaveAcao?: string) => Promise<void>;
  /** Conjunto de IDs selecionados para ações em lote. */
  selecionadosIds?: Set<string>;
  /** Callback para alternar seleção de uma transação específica. */
  onToggleSelecao?: (id: string) => void;
  /** Callback para alternar seleção de todas as transações elegíveis da página. */
  onToggleTodas?: (ids: string[]) => void;
}

/**
 * Tabela desktop de transações Pix com paginação nativa, seleção múltipla e chip de origem.
 *
 * @param {PixTransacoesTableProps} props - Propriedades da tabela.
 * @returns {JSX.Element} Tabela renderizada com modal Split-View de detalhes.
 */
export function PixTransacoesTable({
  transacoes,
  onAceitar,
  onNegar,
  selecionadosIds,
  onToggleSelecao,
  onToggleTodas,
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

  const idsElegiveisPagina = transacoesPaginadas
    .filter(podeValidarPixTransacao)
    .map((t) => t.id);

  const qtdSelecionadasPagina = idsElegiveisPagina.filter((id) =>
    selecionadosIds?.has(id),
  ).length;

  const todasSelecionadasPagina =
    idsElegiveisPagina.length > 0 &&
    qtdSelecionadasPagina === idsElegiveisPagina.length;

  const selecaoParcialPagina =
    qtdSelecionadasPagina > 0 &&
    qtdSelecionadasPagina < idsElegiveisPagina.length;

  const exibirCheckboxes = Boolean(onToggleSelecao);

  return (
    <>
      <Paper elevation={0} sx={{ ...surfaces.card, overflow: "hidden" }}>
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
              {exibirCheckboxes && (
                <TableCell padding="checkbox" sx={{ width: 48 }}>
                  <Checkbox
                    size="small"
                    checked={todasSelecionadasPagina}
                    indeterminate={selecaoParcialPagina}
                    disabled={idsElegiveisPagina.length === 0 || !onToggleTodas}
                    onChange={() => onToggleTodas?.(idsElegiveisPagina)}
                    inputProps={{ "aria-label": "Selecionar todas" }}
                    sx={{
                      color: colors.verdeEscuro,
                      "&.Mui-checked, &.MuiCheckbox-indeterminate": {
                        color: colors.verdeEscuro,
                      },
                    }}
                  />
                </TableCell>
              )}
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
              const elegivel = podeValidarPixTransacao(transacao);
              const selecionada = Boolean(selecionadosIds?.has(transacao.id));

              return (
                <TableRow
                  key={transacao.id}
                  hover
                  selected={selecionada}
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
                  {exibirCheckboxes && (
                    <TableCell
                      padding="checkbox"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        size="small"
                        checked={selecionada}
                        disabled={!elegivel}
                        onChange={() => onToggleSelecao?.(transacao.id)}
                        inputProps={{
                          "aria-label": `Selecionar transação ${transacao.compradorNome || transacao.id}`,
                        }}
                        sx={{
                          color: colors.verdeEscuro,
                          "&.Mui-checked": {
                            color: colors.verdeEscuro,
                          },
                        }}
                      />
                    </TableCell>
                  )}

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
                    {formatarData(
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
                    <Stack alignItems="flex-end" spacing={0.5}>
                      <Typography
                        sx={{
                          color:
                            transacao.statusPagamento === "PAID"
                              ? colors.verdeEscuro
                              : colors.alertaTexto,
                          fontWeight: 950,
                        }}
                      >
                        {formatarMoeda(valor)}
                      </Typography>
                      <PixOrigemChip origem={transacao.origem} />
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
