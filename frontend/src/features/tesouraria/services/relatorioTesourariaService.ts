import { fetchAPI } from "@/shared/services/api";

import {
  AderidoMetricaDesempenho,
  RelatorioTesourariaResponse,
  ResumoGeralDesempenho,
} from "../types/desempenho";
import { RESUMO_GERAL_DESEMPENHO_VAZIO } from "../utils/desempenhoDataUtils";

/**
 * Normaliza valores numéricos garantindo que números finitos sejam preservados
 * e valores indefinidos/nulos retornem fallback seguro a zero.
 *
 * @param {unknown} valor - Valor a ser validado.
 * @returns {number} Número finito seguro ou zero.
 */
function valorNumericoSeguro(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

/**
 * Normaliza o objeto de resumo geral financeiro retornado pelo endpoint de relatório.
 *
 * @param {unknown} resumo - Resumo recebido do servidor.
 * @returns {ResumoGeralDesempenho} Resumo consolidado com defaults numéricos.
 */
export function normalizarResumoGeral(resumo: unknown): ResumoGeralDesempenho {
  if (!resumo || typeof resumo !== "object") {
    return RESUMO_GERAL_DESEMPENHO_VAZIO;
  }

  const r = resumo as Partial<ResumoGeralDesempenho>;

  const totalArrecadado = valorNumericoSeguro(r.totalArrecadado);
  const totalArrecadadoLiquido =
    typeof r.totalArrecadadoLiquido === "number"
      ? valorNumericoSeguro(r.totalArrecadadoLiquido)
      : totalArrecadado;

  return {
    totalArrecadado,
    totalArrecadadoLiquido,
    rifasPagas: valorNumericoSeguro(r.rifasPagas),
    rifasPagasPix: valorNumericoSeguro(r.rifasPagasPix),
    rifasPagasComprovante: valorNumericoSeguro(r.rifasPagasComprovante),
    valorArrecadadoPixBruto: valorNumericoSeguro(r.valorArrecadadoPixBruto),
    valorArrecadadoPixLiquido: valorNumericoSeguro(r.valorArrecadadoPixLiquido),
    valorArrecadadoComprovante: valorNumericoSeguro(r.valorArrecadadoComprovante),
    rifasPendentes: valorNumericoSeguro(r.rifasPendentes),
    rifasPendentesPix: valorNumericoSeguro(r.rifasPendentesPix),
    rifasPendentesComprovante: valorNumericoSeguro(r.rifasPendentesComprovante),
    aderidosAtivos: valorNumericoSeguro(r.aderidosAtivos),
  };
}

/**
 * Normaliza a lista de aderidos recebida da API preenchendo splits de Pix e Comprovante.
 *
 * @param {unknown} lista - Lista de aderidos brutos do backend.
 * @returns {AderidoMetricaDesempenho[]} Lista normalizada de métricas por aderido.
 */
export function normalizarAderidos(lista: unknown): AderidoMetricaDesempenho[] {
  if (!Array.isArray(lista)) return [];

  return lista.map((item) => {
    const a = (item || {}) as Partial<AderidoMetricaDesempenho>;
    const arrecadado = valorNumericoSeguro(a.arrecadado);
    const arrecadadoLiquido =
      typeof a.arrecadadoLiquido === "number"
        ? valorNumericoSeguro(a.arrecadadoLiquido)
        : arrecadado;

    return {
      id: a.id || undefined,
      nome: a.nome || "Aderido Não Identificado",
      cpf: a.cpf || "-",
      curso: a.curso || undefined,
      modalidadeAdesao: a.modalidadeAdesao || undefined,
      cargo: a.cargo || undefined,
      arrecadado,
      arrecadadoLiquido,
      meta: valorNumericoSeguro(a.meta) || 1200,
      rifasVendidas: valorNumericoSeguro(a.rifasVendidas),
      rifasVendidasPix: valorNumericoSeguro(a.rifasVendidasPix),
      rifasVendidasComprovante: valorNumericoSeguro(a.rifasVendidasComprovante),
      rifasPendentes: valorNumericoSeguro(a.rifasPendentes),
    };
  });
}

/**
 * Service canônico para consulta ao relatório financeiro geral da Tesouraria (/tesouraria/relatorio).
 * Compartilhado entre os domínios de Desempenho e de Aderidos.
 */
export const relatorioTesourariaService = {
  /**
   * Consulta o relatório financeiro consolidado e a lista de desempenho por aderido.
   *
   * @returns {Promise<RelatorioTesourariaResponse>} Relatório consolidado e aderidos.
   */
  async obterRelatorioTesouraria(): Promise<RelatorioTesourariaResponse> {
    const resposta = await fetchAPI("/tesouraria/relatorio");

    if (!resposta || typeof resposta !== "object") {
      return {
        resumoGeral: RESUMO_GERAL_DESEMPENHO_VAZIO,
        aderidos: [],
      };
    }

    const relatorio = resposta as Partial<RelatorioTesourariaResponse>;

    return {
      resumoGeral: normalizarResumoGeral(relatorio.resumoGeral),
      aderidos: normalizarAderidos(relatorio.aderidos),
    };
  },
};
