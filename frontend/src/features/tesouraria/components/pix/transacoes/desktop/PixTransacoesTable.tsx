import { useCallback, useEffect, useState } from "react";
import {
  Checkbox,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { components } from "@/shared/tokens/components";
import { surfaces } from "@/shared/tokens/surfaces";

import { AnaliseOcrDTO, PixTransacao } from "../../../../types/pixTransacoes";
import { podeValidarPixTransacao } from "../../../../utils/pixTransacoesStatusUtils";
import { PixTransacaoDetalhesDialog } from "../shared/PixTransacaoDetalhesDialog";
import { PixTransacaoTableRow } from "./PixTransacaoTableRow";

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
  /** Callback opcional para reanalisar OCR de um comprovante. */
  onReanalisarOcr?: (id: string) => Promise<AnaliseOcrDTO | null>;
  /** Identificador da transação atualmente em reanálise OCR. */
  reanalisandoOcrId?: string | null;
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
  onReanalisarOcr,
  reanalisandoOcrId,
  selecionadosIds,
  onToggleSelecao,
  onToggleTodas,
}: PixTransacoesTableProps) {
  const [transacaoDetalhada, setTransacaoDetalhada] =
    useState<PixTransacao | null>(null);
  const transacaoDetalhadaAtiva = transacaoDetalhada
    ? (transacoes.find((t) => t.id === transacaoDetalhada.id) ?? transacaoDetalhada)
    : null;
  const [pagina, setPagina] = useState(0);
  const [itensPorPagina, setItensPorPagina] = useState(25);

  const handleFecharDetalhes = useCallback(() => {
    setTransacaoDetalhada(null);
  }, []);

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
            {transacoesPaginadas.map((transacao) => (
              <PixTransacaoTableRow
                key={transacao.id}
                transacao={transacao}
                exibirCheckboxes={exibirCheckboxes}
                selecionada={Boolean(selecionadosIds?.has(transacao.id))}
                onSelecionarDetalhes={setTransacaoDetalhada}
                onToggleSelecao={onToggleSelecao}
                onAceitar={onAceitar}
                onNegar={onNegar}
              />
            ))}
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
        transacao={transacaoDetalhadaAtiva}
        onClose={handleFecharDetalhes}
        onAceitar={onAceitar}
        onNegar={onNegar}
        onReanalisarOcr={onReanalisarOcr}
        reanalisandoOcr={
          Boolean(transacaoDetalhadaAtiva) &&
          reanalisandoOcrId === transacaoDetalhadaAtiva?.id
        }
      />
    </>
  );
}
