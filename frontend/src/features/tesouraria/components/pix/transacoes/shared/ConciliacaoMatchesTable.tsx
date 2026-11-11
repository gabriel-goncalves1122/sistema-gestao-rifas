import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
  Alert,
  Checkbox,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { formatarMoeda } from "@/shared/utils/formatadores";
import type { ItemMatchConciliacao } from "../../../../types/conciliacaoExtrato";

/**
 * Propriedades da tabela de seleção de correspondências encontradas na conciliação bancária.
 */
export interface ConciliacaoMatchesTableProps {
  /** Lista de correspondências identificadas no cruzamento do extrato. */
  matches: ItemMatchConciliacao[];
  /** Conjunto com os IDs de pagamento atualmente selecionados para aprovação em lote. */
  selecionados: Set<string>;
  /** Alterna a seleção individual de uma correspondência pelo `pagamentoId`. */
  onToggleSelecao: (pagamentoId: string) => void;
  /** Seleciona ou desmarca todas as correspondências listadas. */
  onToggleTodos: () => void;
}

/**
 * Tabela rolável de revisão e seleção dos matches sugeridos ou exatos da conciliação de extrato Pix.
 *
 * @param {ConciliacaoMatchesTableProps} props - Lista de matches e callbacks de seleção.
 * @returns {JSX.Element} Alerta quando vazio ou tabela interativa com cabeçalho fixo.
 */
export function ConciliacaoMatchesTable({
  matches,
  selecionados,
  onToggleSelecao,
  onToggleTodos,
}: ConciliacaoMatchesTableProps) {
  if (matches.length === 0) {
    return (
      <Alert severity="warning">
        Nenhuma compra pendente pôde ser conciliada com as transações deste extrato.
      </Alert>
    );
  }

  const todosSelecionados =
    matches.length > 0 && selecionados.size === matches.length;

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ border: `1px solid ${colors.borda}`, maxHeight: 360 }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow sx={{ bgcolor: colors.fundoSuave }}>
            <TableCell padding="checkbox">
              <Checkbox
                checked={todosSelecionados}
                indeterminate={selecionados.size > 0 && !todosSelecionados}
                onChange={onToggleTodos}
              />
            </TableCell>
            <TableCell sx={{ fontWeight: 800 }}>Tipo de Match</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>Comprador / Rifas</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>Pagador no Banco</TableCell>
            <TableCell sx={{ fontWeight: 800 }} align="right">
              Valor
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {matches.map((item: ItemMatchConciliacao) => {
            const isSelected = selecionados.has(item.pagamentoId);
            const isExato =
              item.tipoMatch === "TXID_EXATO" || item.tipoMatch === "E2E_EXATO";
            const isAderido = item.alvoMatch === "ADERIDO";

            return (
              <TableRow
                key={item.pagamentoId}
                hover
                selected={isSelected}
                onClick={() => onToggleSelecao(item.pagamentoId)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell padding="checkbox">
                  <Checkbox checked={isSelected} />
                </TableCell>
                <TableCell>
                  {isExato ? (
                    <Chip
                      size="small"
                      icon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
                      label="Exato (txid)"
                      sx={{
                        bgcolor: colors.verdeClaro,
                        color: colors.verdeForte,
                        fontWeight: 700,
                      }}
                    />
                  ) : (
                    <Chip
                      size="small"
                      icon={<HelpOutlineIcon sx={{ fontSize: 16 }} />}
                      label={
                        isAderido
                          ? "Pago por Aderido"
                          : `Nome similar (${Math.round(item.confianca * 100)}%)`
                      }
                      sx={{
                        bgcolor: colors.alertaSuave,
                        color: colors.alertaTexto,
                        fontWeight: 700,
                      }}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {item.compradorNome}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: colors.cinzaTexto }}
                  >
                    {item.numerosRifas.length} rifa(s):{" "}
                    {item.numerosRifas.join(", ")}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {item.nomePagadorBanco}
                  </Typography>
                  {isAderido && item.vendedorNome && (
                    <Typography
                      variant="caption"
                      sx={{ color: colors.alertaTexto }}
                    >
                      Repasse do Aderido: {item.vendedorNome}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 800, color: colors.verdeEscuro }}
                  >
                    {formatarMoeda(item.valorBanco)}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
