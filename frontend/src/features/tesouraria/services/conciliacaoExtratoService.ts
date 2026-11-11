/**
 * Serviço de comunicação com as rotas de conciliação por extrato bancário.
 *
 * @module conciliacaoExtratoService
 */
import { fetchAPI } from "@/shared/services/api";

import {
  ItemAprovacaoLotePayload,
  ResultadoAnaliseExtrato,
  ResultadoAprovacaoLote,
} from "../types/conciliacaoExtrato";

export const conciliacaoExtratoService = {
  /**
   * Envia o conteúdo do extrato CSV ou OFX para cruzamento analítico no backend.
   *
   * @param {string} conteudoArquivo - Conteúdo textual do extrato bancário.
   * @param {string} [nomeArquivo] - Nome do arquivo enviado.
   * @returns {Promise<ResultadoAnaliseExtrato>} Resumo consolidado e lista de matches.
   */
  async analisarExtrato(
    conteudoArquivo: string,
    nomeArquivo?: string,
  ): Promise<ResultadoAnaliseExtrato> {
    return fetchAPI("/tesouraria/conciliacao/analisar", "POST", {
      conteudoArquivo,
      nomeArquivo,
    });
  },

  /**
   * Executa a aprovação atômica em lote das transações conciliadas.
   *
   * @param {ItemAprovacaoLotePayload[]} itens - Lista de itens selecionados para aprovação.
   * @returns {Promise<ResultadoAprovacaoLote>} Resultado da aprovação com totalizadores.
   */
  async aprovarLote(
    itens: ItemAprovacaoLotePayload[],
  ): Promise<ResultadoAprovacaoLote> {
    return fetchAPI("/tesouraria/conciliacao/aprovar-lote", "POST", {
      itens,
    });
  },
};
