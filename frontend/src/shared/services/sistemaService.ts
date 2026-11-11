import { fetchAPI } from "./api";
import {
  AtualizarManutencaoPayload,
  ManutencaoStatusDto,
} from "../types/sistema";

export const sistemaService = {
  /**
   * Consulta pública do status atual de manutenção do sistema.
   * Não requer autenticação do usuário.
   *
   * @returns {Promise<ManutencaoStatusDto>} Objeto contendo estado de manutenção.
   */
  async obterStatusManutencao(): Promise<ManutencaoStatusDto> {
    return await fetchAPI<ManutencaoStatusDto>(
      "/sistema/manutencao",
      "GET",
      undefined,
      false,
    );
  },

  /**
   * Atualiza o estado do modo de manutenção via rota administrativa.
   * Requer privilégios de administrador autenticado.
   *
   * @param {AtualizarManutencaoPayload} payload - Parâmetros do modo de manutenção.
   * @returns {Promise<ManutencaoStatusDto>} Status atualizado retornado pelo backend.
   */
  async atualizarStatusManutencao(
    payload: AtualizarManutencaoPayload,
  ): Promise<ManutencaoStatusDto> {
    const resposta = await fetchAPI<{
      success: boolean;
      manutencao: ManutencaoStatusDto;
    }>("/admin/manutencao", "PUT", payload, true);

    return resposta.manutencao;
  },
};
