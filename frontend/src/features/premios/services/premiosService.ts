import { fetchAPI } from "@/shared/services/api";
import { storageService } from "@/shared/services/storageService";
import type { PremioData } from "../types/premio";
import type { InfoSorteio } from "../types/sorteio";

/**
 * Estrutura de resposta retornada pelo backend para listagem de prêmios e metadados do sorteio.
 */
interface BuscarPremiosResponse {
  /** Informações gerais do sorteio (título, data, descrição). */
  infoSorteio: InfoSorteio;
  /** Lista ordenada dos prêmios cadastrados. */
  premios: PremioData[];
}

/**
 * Serviço responsável pelas requisições REST da feature de Prêmios e upload de imagens no Firebase Storage.
 */
export const premiosService = {
  /**
   * Consulta pública dos prêmios e informações gerais do sorteio.
   * Não exige autenticação.
   *
   * @returns {Promise<BuscarPremiosResponse | null>} Dados da vitrine de prêmios ou null em caso de falha.
   * @sideEffects Requisição GET para `/premios`.
   */
  buscar: async (): Promise<BuscarPremiosResponse | null> => {
    try {
      return await fetchAPI("/premios", "GET", undefined, false);
    } catch {
      return null;
    }
  },

  /**
   * Atualiza as informações gerais do cabeçalho do sorteio (título, data estimada, descrição).
   *
   * @param {Partial<InfoSorteio>} dados - Campos a atualizar.
   * @returns {Promise<void>}
   * @sideEffects Requisição PUT autenticada para `/premios/sorteio`.
   */
  salvarInfoSorteio: async (dados: Partial<InfoSorteio>): Promise<void> => {
    await fetchAPI("/premios/sorteio", "PUT", dados);
  },

  /**
   * Cria ou atualiza um prêmio específico (se possuir id, o backend atualiza; se não, cria).
   *
   * @param {PremioData} dados - Dados do prêmio (colocação, título, descrição, imagem).
   * @returns {Promise<void>}
   * @sideEffects Requisição POST autenticada para `/premios`.
   */
  salvarPremio: async (dados: PremioData): Promise<void> => {
    await fetchAPI("/premios", "POST", dados);
  },

  /**
   * Exclui um prêmio permanentemente.
   *
   * @param {string} id - Identificador único do prêmio.
   * @returns {Promise<void>}
   * @sideEffects Requisição DELETE autenticada para `/premios/:id`.
   */
  excluir: async (id: string): Promise<void> => {
    await fetchAPI(`/premios/${id}`, "DELETE");
  },

  /**
   * Realiza o upload direto de imagem de prêmio para o Firebase Storage usando o SDK Web.
   *
   * @param {File} arquivo - Arquivo de imagem selecionado no navegador.
   * @returns {Promise<string>} URL pública de download da imagem no Storage.
   * @throws {Error} Se o upload falhar no Firebase Storage.
   * @sideEffects Upload de binário para o Firebase Storage na pasta `premios`.
   */
  uploadImagem: async (arquivo: File): Promise<string> => {
    try {
      return await storageService.uploadImagem(arquivo, "premios");
    } catch {
      throw new Error("Falha no upload da imagem para o Firebase Storage.");
    }
  },
};
