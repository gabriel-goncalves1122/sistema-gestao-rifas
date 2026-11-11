import { colors } from "@/shared/tokens/colors";

/** Meta padrão de rifas por aderido utilizada como fallback no ranking. */
export const META_RIFAS_ADERIDO_PADRAO = 50;

/**
 * Item mínimo aceito pelos helpers do ranking de desempenho de aderidos.
 */
export interface ItemRankingDesempenhoBase {
  /** Posição do aderido no ranking (1-indexed). */
  posicao: number;
  /** CPF do aderido (campo padrão). */
  cpf?: string;
  /** CPF já formatado ou mascarado vindo de DTO auxiliar. */
  cpfLabel?: string;
  /** Quantidade total de rifas vendidas pelo aderido. */
  rifasVendidas?: number;
  /** Quantidade de rifas restantes para atingir a meta. */
  rifasRestantes?: number;
  /** Valor total arrecadado (bruto). */
  arrecadado: number;
  /** Valor total arrecadado líquido. */
  arrecadadoLiquido?: number;
  /** Subtotal via Pix. */
  valorPix?: number;
  /** Subtotal via comprovante manual. */
  valorComprovante?: number;
}

/**
 * Métricas derivadas e estilo visual de posição calculados para um item do ranking.
 */
export interface DadosExibicaoItemRanking {
  /** Indica se a posição está entre os três primeiros colocados. */
  ehTop3: boolean;
  /** Cor associada ao medalhão ou posição no ranking. */
  corPosicao: string;
  /** Texto de CPF a ser exibido na UI. */
  cpfExibicao: string;
  /** Quantidade de rifas vendidas normalizada. */
  rifasVendidas: number;
  /** Quantidade restante para atingir a meta informada. */
  rifasRestantes: number;
  /** Indica se há detalhamento entre valores Pix e Comprovante. */
  temSplitValores: boolean;
  /** Valor líquido exibido como principal. */
  valorLiquido: number;
  /** Indica se existe diferença entre valor bruto e líquido. */
  temDiferencaBrutoLiquido: boolean;
}

/**
 * Resolve a cor de destaque correspondente à posição no ranking (ouro, prata, bronze ou padrão).
 *
 * @param {number} posicao - Posição do aderido no ranking (base 1).
 * @returns {string} Token ou código hexadecimal da cor da posição.
 */
export function obterCorPosicaoRanking(posicao: number): string {
  if (posicao === 1) return "#D4AF37";
  if (posicao === 2) return "#9E9E9E";
  if (posicao === 3) return "#CD7F32";
  return colors.cinzaTexto;
}

/**
 * Consolida os dados derivados e flags visuais de um item do ranking de desempenho,
 * evitando duplicação entre a tabela desktop e os cards mobile.
 *
 * @param {ItemRankingDesempenhoBase} item - Registro do aderido no ranking.
 * @param {number} [metaPadrao=META_RIFAS_ADERIDO_PADRAO] - Meta padrão usada quando `rifasRestantes` não vier preenchido.
 * @returns {DadosExibicaoItemRanking} Estrutura pronta para renderização nas views.
 */
export function calcularDadosExibicaoItemRanking(
  item: ItemRankingDesempenhoBase,
  metaPadrao: number = META_RIFAS_ADERIDO_PADRAO,
): DadosExibicaoItemRanking {
  const rifasVendidas = item.rifasVendidas ?? 0;
  const rifasRestantes =
    item.rifasRestantes ?? Math.max(metaPadrao - rifasVendidas, 0);
  const valorLiquido = item.arrecadadoLiquido ?? item.arrecadado;

  return {
    ehTop3: item.posicao <= 3,
    corPosicao: obterCorPosicaoRanking(item.posicao),
    cpfExibicao: item.cpfLabel || item.cpf || "-",
    rifasVendidas,
    rifasRestantes,
    temSplitValores:
      item.valorPix !== undefined || item.valorComprovante !== undefined,
    valorLiquido,
    temDiferencaBrutoLiquido:
      item.arrecadadoLiquido !== undefined &&
      item.arrecadadoLiquido !== item.arrecadado,
  };
}
