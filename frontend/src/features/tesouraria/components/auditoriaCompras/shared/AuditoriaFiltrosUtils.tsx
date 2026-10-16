import { Chip, TextField } from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { colors } from "@/shared/tokens/colors";
import {
  STATUS_FILTROS_AUDITORIA_COMPRAS,
  ORIGEM_FILTROS_AUDITORIA_COMPRAS,
} from "../../../utils/auditoriaComprasUtils";
import { AuditoriaComprasFiltrosProps } from "../shared/auditoriaComprasFiltrosTypes";

/**
 * Renderiza os chips de seleção de status para a auditoria de compras.
 *
 * @param {Pick<AuditoriaComprasFiltrosProps, 'filtros' | 'onChangeFiltros'>} props - Propriedades de filtro.
 * @returns {JSX.Element} Conjunto de chips de status.
 */
export function AuditoriaFiltroStatusChips({
  filtros,
  onChangeFiltros,
}: Pick<AuditoriaComprasFiltrosProps, "filtros" | "onChangeFiltros">) {
  return (
    <>
      {STATUS_FILTROS_AUDITORIA_COMPRAS.map((filtro) => {
        const ativo = filtros.status === filtro.value;

        return (
          <Chip
            key={filtro.value}
            label={filtro.label}
            clickable
            onClick={() => onChangeFiltros({ ...filtros, status: filtro.value })}
            sx={{
              height: 32,
              borderRadius: 999,
              fontWeight: 850,
              flexShrink: 0,
              bgcolor: ativo ? colors.verdeEscuro : colors.branco,
              color: ativo ? colors.branco : colors.verdeEscuro,
              border: ativo
                ? `1px solid ${colors.verdeEscuro}`
                : "1px solid rgba(6, 61, 49, 0.18)",
            }}
          />
        );
      })}
    </>
  );
}

/**
 * Renderiza os chips de seleção de canal de origem (Todas, Pix, Comprovante).
 *
 * @param {Pick<AuditoriaComprasFiltrosProps, 'filtros' | 'onChangeFiltros'>} props - Propriedades de filtro.
 * @returns {JSX.Element} Conjunto de chips de canal.
 */
export function AuditoriaFiltroOrigemChips({
  filtros,
  onChangeFiltros,
}: Pick<AuditoriaComprasFiltrosProps, "filtros" | "onChangeFiltros">) {
  const origemAtual = filtros.origem || "TODAS";

  return (
    <>
      {ORIGEM_FILTROS_AUDITORIA_COMPRAS.map((filtro) => {
        const ativo = origemAtual === filtro.value;

        return (
          <Chip
            key={filtro.value}
            label={filtro.label}
            clickable
            onClick={() => onChangeFiltros({ ...filtros, origem: filtro.value })}
            sx={{
              height: 32,
              borderRadius: 999,
              fontWeight: 850,
              flexShrink: 0,
              bgcolor: ativo ? colors.verdeEscuro : colors.branco,
              color: ativo ? colors.branco : colors.verdeEscuro,
              border: ativo
                ? `1px solid ${colors.verdeEscuro}`
                : "1px solid rgba(6, 61, 49, 0.18)",
            }}
          />
        );
      })}
    </>
  );
}

/**
 * Renderiza o chip alternador (toggle) para filtrar exclusivamente compras com correção cadastral pendente.
 *
 * @param {Pick<AuditoriaComprasFiltrosProps, 'filtros' | 'onChangeFiltros'>} props - Propriedades de filtro.
 * @returns {JSX.Element} Chip toggle para pendências de correção.
 */
export function AuditoriaFiltroCorrecaoChip({
  filtros,
  onChangeFiltros,
}: Pick<AuditoriaComprasFiltrosProps, "filtros" | "onChangeFiltros">) {
  const ativo = Boolean(filtros.somenteCorrecaoPendente);

  return (
    <Chip
      icon={
        <WarningAmberRoundedIcon
          sx={{
            fontSize: "16px !important",
            color: ativo ? `${colors.branco} !important` : "#C2410C !important",
          }}
        />
      }
      label="Correção pendente"
      clickable
      onClick={() =>
        onChangeFiltros({
          ...filtros,
          somenteCorrecaoPendente: !ativo,
        })
      }
      sx={{
        height: 32,
        borderRadius: 999,
        fontWeight: 850,
        flexShrink: 0,
        bgcolor: ativo ? "#C2410C" : "rgba(194, 65, 12, 0.08)",
        color: ativo ? colors.branco : "#C2410C",
        border: ativo ? "1px solid #C2410C" : "1px solid rgba(194, 65, 12, 0.3)",
        "& .MuiChip-icon": {
          ml: 0.75,
          mr: -0.25,
        },
      }}
    />
  );
}

/**
 * Renderiza os campos de seleção de intervalo de datas para a auditoria de compras.
 *
 * @param {Pick<AuditoriaComprasFiltrosProps, 'filtros' | 'onChangeFiltros'> & { bgColor?: string }} props - Propriedades.
 * @returns {JSX.Element} Inputs HTML5 de data de início e fim.
 */
export function AuditoriaFiltroDatas({
  filtros,
  onChangeFiltros,
  bgColor = colors.fundoSuave,
}: Pick<AuditoriaComprasFiltrosProps, "filtros" | "onChangeFiltros"> & {
  bgColor?: string;
}) {
  return (
    <>
      <TextField
        size="small"
        label="Início"
        type="date"
        value={filtros.dataInicio}
        onChange={(event) =>
          onChangeFiltros({
            ...filtros,
            dataInicio: event.target.value,
          })
        }
        InputLabelProps={{ shrink: true }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 2,
            bgcolor: bgColor,
          },
        }}
      />

      <TextField
        size="small"
        label="Fim"
        type="date"
        value={filtros.dataFim}
        onChange={(event) =>
          onChangeFiltros({ ...filtros, dataFim: event.target.value })
        }
        InputLabelProps={{ shrink: true }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 2,
            bgcolor: bgColor,
          },
        }}
      />
    </>
  );
}
