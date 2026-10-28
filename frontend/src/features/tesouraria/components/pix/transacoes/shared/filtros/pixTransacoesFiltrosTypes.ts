import {
  FiltroRapidoTransacoesPix,
  PixTransacoesFiltros,
} from "../../../../../types/pixTransacoes";

/**
 * Propriedades para renderização dos filtros da barra de validação de transações Pix.
 */
export interface PixTransacoesFiltrosProps {
  /** Estado atual dos filtros de busca e status */
  filtros: PixTransacoesFiltros;
  /** Callback para atualização dos filtros */
  onChangeFiltros: (filtros: PixTransacoesFiltros) => void;
  /** Quantidade total de resultados filtrados para exibição */
  totalResultados?: number;
  /** Contadores pré-calculados para exibição em badges nos chips */
  contagens?: Partial<Record<FiltroRapidoTransacoesPix, number>>;
}

export interface ConfigFiltroPix {
  label: string;
  value: FiltroRapidoTransacoesPix;
  corAtiva: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    badgeText: string;
  };
}

export const FILTROS_PIX: ConfigFiltroPix[] = [
  {
    label: "Novas",
    value: "novas",
    corAtiva: {
      bg: "#063D31",
      text: "#FFFFFF",
      border: "#063D31",
      badgeBg: "rgba(255, 255, 255, 0.25)",
      badgeText: "#FFFFFF",
    },
  },
  {
    label: "Aprovadas",
    value: "aprovadas",
    corAtiva: {
      bg: "#EAF5EE",
      text: "#0B7A61",
      border: "rgba(11, 122, 97, 0.35)",
      badgeBg: "rgba(11, 122, 97, 0.18)",
      badgeText: "#0B7A61",
    },
  },
  {
    label: "Recusadas",
    value: "recusadas",
    corAtiva: {
      bg: "#FDF0ED",
      text: "#C53030",
      border: "rgba(197, 48, 48, 0.35)",
      badgeBg: "rgba(197, 48, 48, 0.18)",
      badgeText: "#C53030",
    },
  },
  {
    label: "Aguardando Pagamento",
    value: "aguardando_pagamento",
    corAtiva: {
      bg: "#FEF7EA",
      text: "#B7791F",
      border: "rgba(183, 121, 31, 0.35)",
      badgeBg: "rgba(183, 121, 31, 0.18)",
      badgeText: "#B7791F",
    },
  },
  {
    label: "Todas",
    value: "todas",
    corAtiva: {
      bg: "#F1F5F4",
      text: "#021B16",
      border: "rgba(2, 27, 22, 0.25)",
      badgeBg: "rgba(2, 27, 22, 0.12)",
      badgeText: "#021B16",
    },
  },
];
