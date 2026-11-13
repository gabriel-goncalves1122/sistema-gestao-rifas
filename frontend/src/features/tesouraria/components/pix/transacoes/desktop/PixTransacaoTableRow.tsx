import { memo } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Checkbox,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import {
  formatarData,
  formatarMoeda,
} from "@/shared/utils/formatadores";

import { colors } from "@/shared/tokens/colors";
import { components } from "@/shared/tokens/components";

import { PixTransacao } from "../../../../types/pixTransacoes";
import { podeValidarPixTransacao } from "../../../../utils/pixTransacoesStatusUtils";
import { PixAnaliseOcrChip } from "../shared/PixAnaliseOcrChip";
import { PixOrigemChip } from "../shared/PixOrigemChip";
import { PixTransacaoAcoes } from "../shared/PixTransacaoAcoes";

/**
 * Propriedades de uma linha memoizada da tabela desktop de transações Pix.
 */
export interface PixTransacaoTableRowProps {
  /** Transação Pix imutável exibida na linha. */
  transacao: PixTransacao;
  /** Indica se a coluna de seleção em lote está visível. */
  exibirCheckboxes: boolean;
  /** Indica se a linha atual está selecionada. */
  selecionada: boolean;
  /** Callback para abrir o modal de detalhes da transação. */
  onSelecionarDetalhes: (transacao: PixTransacao) => void;
  /** Callback opcional para alternar a seleção em lote da linha. */
  onToggleSelecao?: (id: string) => void;
  /** Callback de aprovação individual. */
  onAceitar: (id: string, chaveAcao?: string) => Promise<void>;
  /** Callback de recusa individual com motivo. */
  onNegar: (id: string, motivo: string, chaveAcao?: string) => Promise<void>;
}

/**
 * Linha memoizada (`React.memo`) da tabela desktop de transações Pix,
 * evitando re-renderizações em massa ao alternar checkboxes ou abrir o modal de detalhes.
 *
 * @param {PixTransacaoTableRowProps} props - Propriedades da linha.
 * @returns {JSX.Element} Linha da tabela renderizada.
 */
export const PixTransacaoTableRow = memo(function PixTransacaoTableRow({
  transacao,
  exibirCheckboxes,
  selecionada,
  onSelecionarDetalhes,
  onToggleSelecao,
  onAceitar,
  onNegar,
}: PixTransacaoTableRowProps) {
  const valor =
    transacao.statusPagamento === "PAID"
      ? transacao.valorPago
      : transacao.valorBruto;
  const elegivel = podeValidarPixTransacao(transacao);

  return (
    <TableRow
      hover
      selected={selecionada}
      tabIndex={0}
      data-testid={`pix-transacao-${transacao.id}`}
      onClick={() => onSelecionarDetalhes(transacao)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelecionarDetalhes(transacao);
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
            onSelecionarDetalhes(transacao);
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
        {formatarData(transacao.dataPagamento || transacao.dataCriacao)}
      </TableCell>

      <TableCell>
        <Typography sx={{ color: colors.pretoEsverdeado, fontWeight: 850 }}>
          {transacao.compradorNome || "Pagador não informado"}
        </Typography>
        <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.82rem" }}>
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
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            flexWrap="wrap"
            justifyContent="flex-end"
          >
            <PixAnaliseOcrChip
              analiseOcr={transacao.analiseOcr}
              temComprovante={Boolean(transacao.comprovanteUrl)}
            />
            <PixOrigemChip origem={transacao.origem} />
          </Stack>
        </Stack>
      </TableCell>

      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
        <PixTransacaoAcoes
          transacao={transacao}
          compact
          onAceitar={onAceitar}
          onNegar={onNegar}
        />
      </TableCell>
    </TableRow>
  );
});
