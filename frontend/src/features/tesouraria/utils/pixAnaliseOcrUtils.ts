import { colors } from "@/shared/tokens/colors";
import { formatarMoeda } from "@/shared/utils/formatadores";

import {
  AnaliseOcrDTO,
  CodigoAlertaOcr,
  VeredictoCorrelacaoOcr,
} from "../types/pixTransacoes";

/**
 * Metadados visuais calculados para exibição de um veredicto OCR em chips e cards.
 */
export interface ConfigVisualOcr {
  labelCurto: string;
  labelCompleto: string;
  corTexto: string;
  corFundo: string;
  corBorda: string;
}

const MAPA_VISUAL_VEREDICTO: Record<VeredictoCorrelacaoOcr, ConfigVisualOcr> = {
  CORRELACAO_FORTE: {
    labelCurto: "Forte",
    labelCompleto: "Correlação Forte",
    corTexto: colors.verdeEscuro,
    corFundo: colors.verdeClaro,
    corBorda: "rgba(6, 61, 49, 0.25)",
  },
  CORRELACAO_PARCIAL: {
    labelCurto: "Parcial",
    labelCompleto: "Correlação Parcial",
    corTexto: colors.alertaTexto,
    corFundo: colors.alertaFundo,
    corBorda: "rgba(180, 83, 9, 0.28)",
  },
  DIVERGENTE: {
    labelCurto: "Divergente",
    labelCompleto: "Divergente",
    corTexto: colors.erroTexto,
    corFundo: colors.erroFundo,
    corBorda: "rgba(185, 28, 28, 0.25)",
  },
  SUSPEITO: {
    labelCurto: "Suspeito",
    labelCompleto: "Suspeito",
    corTexto: colors.erroTexto,
    corFundo: colors.erroFundo,
    corBorda: "rgba(185, 28, 28, 0.35)",
  },
  ILEGIVEL: {
    labelCurto: "Ilegível",
    labelCompleto: "Comprovante Ilegível",
    corTexto: colors.cinzaTexto,
    corFundo: colors.fundoSuave,
    corBorda: colors.borda,
  },
};

const CONFIG_ERRO_OCR: ConfigVisualOcr = {
  labelCurto: "Erro OCR",
  labelCompleto: "Erro na Análise OCR",
  corTexto: colors.erroTexto,
  corFundo: colors.erroFundo,
  corBorda: "rgba(185, 28, 28, 0.25)",
};

const CONFIG_SEM_OCR: ConfigVisualOcr = {
  labelCurto: "Sem OCR",
  labelCompleto: "Aguardando Análise OCR",
  corTexto: colors.cinzaTexto,
  corFundo: colors.fundoSuave,
  corBorda: colors.borda,
};

const MAPA_ALERTAS_OCR: Record<CodigoAlertaOcr, string> = {
  AGENDAMENTO_DETECTADO: "Comprovante indica Pix agendado",
  STATUS_CANCELADO_OU_RECUSADO: "Comprovante com status cancelado ou recusado",
  E2E_DUPLICADO: "E2E ID já utilizado em outro pagamento",
  VALOR_DIVERGENTE: "Valor lido diverge do valor esperado",
  VALOR_NAO_ENCONTRADO: "Valor não identificado no comprovante",
  TXID_NAO_ENCONTRADO: "Código RIFA (TXID) não encontrado",
  TXID_DE_OUTRO_PEDIDO: "Código RIFA pertence a outro pedido",
  RECEBEDOR_DIVERGENTE: "Recebedor/CNPJ diverge da comissão",
  COMPROVANTE_ANTERIOR_AO_PEDIDO: "Data do comprovante anterior à criação do pedido",
  TEXTO_INSUFICIENTE: "Texto extraído insuficiente para leitura confiável",
};

/**
 * Resolve o estilo visual e os rótulos do badge de análise OCR sem lógica condicional no JSX.
 *
 * @param {AnaliseOcrDTO | null | undefined} analise - Resultado OCR da transação.
 * @returns {ConfigVisualOcr} Cores, borda e rótulos formatados para UI.
 */
export function obterConfigVisualAnaliseOcr(
  analise?: AnaliseOcrDTO | null,
): ConfigVisualOcr {
  if (!analise) {
    return CONFIG_SEM_OCR;
  }

  if (analise.statusExecucao === "ERRO" || !analise.veredicto) {
    return CONFIG_ERRO_OCR;
  }

  const base = MAPA_VISUAL_VEREDICTO[analise.veredicto] ?? CONFIG_SEM_OCR;
  const sufixoScore =
    typeof analise.score === "number" ? ` ${analise.score}%` : "";

  return {
    ...base,
    labelCurto: `${base.labelCurto}${sufixoScore}`,
  };
}

/**
 * Traduz um código técnico de alerta OCR em mensagem legível para a Tesouraria.
 *
 * @param {CodigoAlertaOcr} alerta - Código padronizado retornado pelo backend.
 * @returns {string} Descrição amigável em português.
 */
export function formatarAlertaOcr(alerta: CodigoAlertaOcr): string {
  return MAPA_ALERTAS_OCR[alerta] || alerta;
}

/**
 * Formata um valor em centavos retornado pelo OCR para moeda BRL.
 *
 * @param {number | null | undefined} centavos - Valor em centavos extraído do comprovante.
 * @returns {string} Valor formatado (ex: "R$ 20,00") ou "Não identificado".
 */
export function formatarValorCentavosOcr(centavos?: number | null): string {
  if (typeof centavos !== "number" || !Number.isFinite(centavos)) {
    return "Não identificado";
  }

  return formatarMoeda(centavos / 100);
}
