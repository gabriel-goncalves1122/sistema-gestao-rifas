import { Box, Chip } from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { colors } from "@/shared/tokens/colors";
import { STATUS_FILTROS_AUDITORIA_COMPRAS } from "../../../utils/auditoriaComprasFiltrosUtils";
import {
  FiltroOrigemAuditoria,
  StatusAuditoriaCompras,
} from "../../../types/auditoriaCompras";
import { AuditoriaComprasFiltrosProps } from "../shared/auditoriaComprasFiltrosTypes";

const CORES_STATUS_CHIP: Record<
  StatusAuditoriaCompras,
  {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  todas: {
    bg: colors.verdeEscuro,
    text: colors.branco,
    border: colors.verdeEscuro,
    badgeBg: "rgba(255, 255, 255, 0.22)",
    badgeText: colors.branco,
  },
  pago: {
    bg: colors.verdeEscuro,
    text: colors.branco,
    border: colors.verdeEscuro,
    badgeBg: "rgba(255, 255, 255, 0.22)",
    badgeText: colors.branco,
  },
  pendente: {
    bg: "#B45309",
    text: colors.branco,
    border: "#B45309",
    badgeBg: "rgba(255, 255, 255, 0.22)",
    badgeText: colors.branco,
  },
  recusado: {
    bg: colors.vermelho,
    text: colors.branco,
    border: colors.vermelho,
    badgeBg: "rgba(255, 255, 255, 0.22)",
    badgeText: colors.branco,
  },
  disponivel: {
    bg: colors.verdeEscuro,
    text: colors.branco,
    border: colors.verdeEscuro,
    badgeBg: "rgba(255, 255, 255, 0.22)",
    badgeText: colors.branco,
  },
};

/**
 * Renderiza os chips de seleção de status para a auditoria de compras com badges numéricos de contagem.
 *
 * @param {Pick<AuditoriaComprasFiltrosProps, 'filtros' | 'onChangeFiltros' | 'contagens'>} props - Propriedades de filtro.
 * @returns {JSX.Element} Conjunto de chips de status.
 */
export function AuditoriaFiltroStatusChips({
  filtros,
  contagens,
  onChangeFiltros,
}: Pick<
  AuditoriaComprasFiltrosProps,
  "filtros" | "onChangeFiltros" | "contagens"
>) {
  return (
    <>
      {STATUS_FILTROS_AUDITORIA_COMPRAS.map((filtro) => {
        const ativo = filtros.status === filtro.value;
        const paleta = CORES_STATUS_CHIP[filtro.value];
        const contagem =
          filtro.value === "todas"
            ? contagens?.todas
            : filtro.value === "pago"
              ? contagens?.pago
              : filtro.value === "pendente"
                ? contagens?.pendente
                : filtro.value === "recusado"
                  ? contagens?.recusado
                  : undefined;

        return (
          <Chip
            key={filtro.value}
            label={
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                }}
              >
                <span>{filtro.label}</span>
                {contagem !== undefined && (
                  <Box
                    component="span"
                    sx={{
                      px: 0.7,
                      py: 0.15,
                      borderRadius: 999,
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      lineHeight: 1,
                      bgcolor: ativo
                        ? paleta.badgeBg
                        : "rgba(2, 27, 22, 0.07)",
                      color: ativo ? paleta.badgeText : colors.cinzaTexto,
                    }}
                  >
                    {contagem}
                  </Box>
                )}
              </Box>
            }
            clickable
            onClick={() =>
              onChangeFiltros({ ...filtros, status: filtro.value })
            }
            sx={{
              height: 34,
              borderRadius: 999,
              fontWeight: ativo ? 850 : 700,
              px: 0.4,
              flexShrink: 0,
              bgcolor: ativo ? paleta.bg : colors.branco,
              color: ativo ? paleta.text : colors.cinzaTexto,
              border: ativo
                ? `1px solid ${paleta.border}`
                : "1px solid rgba(2, 27, 22, 0.12)",
              boxShadow: ativo ? "0 2px 8px rgba(2, 27, 22, 0.08)" : "none",
              "&:hover": {
                bgcolor: ativo ? paleta.bg : "#F6F9F8",
                color: ativo ? paleta.text : colors.pretoEsverdeado,
              },
            }}
          />
        );
      })}
    </>
  );
}

const CANAIS_TOGGLE: Array<{
  label: string;
  value: Exclude<FiltroOrigemAuditoria, "TODAS">;
}> = [
  { label: "Pix", value: "PIX" },
  { label: "Comprovante", value: "COMPROVANTE" },
];

/**
 * Renderiza os chips alternadores (toggle) de canal de origem (Pix e Comprovante).
 * Clicar novamente no canal ativo restaura o filtro para 'TODAS', evitando chips duplicados.
 *
 * @param {Pick<AuditoriaComprasFiltrosProps, 'filtros' | 'onChangeFiltros' | 'contagens'>} props - Propriedades de filtro.
 * @returns {JSX.Element} Conjunto de chips de canal.
 */
export function AuditoriaFiltroOrigemChips({
  filtros,
  contagens,
  onChangeFiltros,
}: Pick<
  AuditoriaComprasFiltrosProps,
  "filtros" | "onChangeFiltros" | "contagens"
>) {
  const origemAtual = filtros.origem || "TODAS";

  return (
    <>
      {CANAIS_TOGGLE.map((canal) => {
        const ativo = origemAtual === canal.value;
        const contagem =
          canal.value === "PIX" ? contagens?.pix : contagens?.comprovante;

        return (
          <Chip
            key={canal.value}
            label={
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.65,
                }}
              >
                <span>{canal.label}</span>
                {contagem !== undefined && (
                  <Box
                    component="span"
                    sx={{
                      px: 0.65,
                      py: 0.12,
                      borderRadius: 999,
                      fontSize: "0.7rem",
                      fontWeight: 900,
                      lineHeight: 1,
                      bgcolor: ativo
                        ? "rgba(255, 255, 255, 0.22)"
                        : "rgba(2, 27, 22, 0.07)",
                      color: ativo ? colors.branco : colors.cinzaTexto,
                    }}
                  >
                    {contagem}
                  </Box>
                )}
              </Box>
            }
            clickable
            onClick={() =>
              onChangeFiltros({
                ...filtros,
                origem: ativo ? "TODAS" : canal.value,
              })
            }
            sx={{
              height: 30,
              borderRadius: 999,
              fontWeight: ativo ? 850 : 700,
              fontSize: "0.78rem",
              flexShrink: 0,
              bgcolor: ativo ? colors.verdeEscuro : "rgba(11, 122, 97, 0.06)",
              color: ativo ? colors.branco : colors.verdeEscuro,
              border: ativo
                ? `1px solid ${colors.verdeEscuro}`
                : "1px solid rgba(6, 61, 49, 0.16)",
              "&:hover": {
                bgcolor: ativo
                  ? colors.verdeEscuroHover
                  : "rgba(11, 122, 97, 0.12)",
              },
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
 * @param {Pick<AuditoriaComprasFiltrosProps, 'filtros' | 'onChangeFiltros' | 'contagens'>} props - Propriedades de filtro.
 * @returns {JSX.Element} Chip toggle para pendências de correção.
 */
export function AuditoriaFiltroCorrecaoChip({
  filtros,
  contagens,
  onChangeFiltros,
}: Pick<
  AuditoriaComprasFiltrosProps,
  "filtros" | "onChangeFiltros" | "contagens"
>) {
  const ativo = Boolean(filtros.somenteCorrecaoPendente);
  const contagem = contagens?.correcaoPendente;

  return (
    <Chip
      icon={
        <WarningAmberRoundedIcon
          sx={{
            fontSize: "15px !important",
            color: ativo ? `${colors.branco} !important` : "#C2410C !important",
          }}
        />
      }
      label={
        <Box
          component="span"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.6,
          }}
        >
          <span>Correção pendente</span>
          {contagem !== undefined && contagem > 0 && (
            <Box
              component="span"
              sx={{
                px: 0.65,
                py: 0.12,
                borderRadius: 999,
                fontSize: "0.7rem",
                fontWeight: 900,
                lineHeight: 1,
                bgcolor: ativo
                  ? "rgba(255, 255, 255, 0.22)"
                  : "rgba(194, 65, 12, 0.14)",
                color: ativo ? colors.branco : "#C2410C",
              }}
            >
              {contagem}
            </Box>
          )}
        </Box>
      }
      clickable
      onClick={() =>
        onChangeFiltros({
          ...filtros,
          somenteCorrecaoPendente: !ativo,
        })
      }
      sx={{
        height: 30,
        borderRadius: 999,
        fontWeight: 850,
        fontSize: "0.78rem",
        flexShrink: 0,
        bgcolor: ativo ? "#C2410C" : "rgba(194, 65, 12, 0.08)",
        color: ativo ? colors.branco : "#C2410C",
        border: ativo
          ? "1px solid #C2410C"
          : "1px solid rgba(194, 65, 12, 0.3)",
        "& .MuiChip-icon": {
          ml: 0.75,
          mr: -0.25,
        },
      }}
    />
  );
}
