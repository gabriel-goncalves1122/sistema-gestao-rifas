// ============================================================================
// ARQUIVO: frontend/src/features/secretaria/membros/services/secretariaService.ts
// ============================================================================
import { fetchAPI } from "@/shared/services/api";

import {
  AderidoSecretaria,
  FormEditarAderido,
  FormNovoAderido,
} from "../../../../shared/types/secretaria";

import { normalizarAderidoSecretaria } from "../mappers/secretariaMapper";

/**
 * Extrai com segurança o identificador primário do registro de aderido (id ou id_aderido).
 *
 * @param {unknown} registro - Objeto bruto retornado pela API.
 * @returns {string | null} Identificador limpo ou null se inexistente.
 */
function obterIdRegistroSecretaria(registro: unknown): string | null {
  if (!registro || typeof registro !== "object") return null;

  const dados = registro as Record<string, unknown>;
  const id = dados.id ?? dados.id_aderido;
  const idNormalizado = String(id || "").trim();

  return idNormalizado || null;
}

/**
 * Serviço frontend responsável pela comunicação com os endpoints administrativos de aderidos (`/admin/aderidos`).
 */
export const secretariaService = {
  /**
   * Busca a listagem completa de aderidos cadastrados, aplicando mapeamento defensivo de contratos legados.
   *
   * @returns {Promise<AderidoSecretaria[]>} Lista de aderidos normalizados.
   * @sideEffects Requisição GET para `/admin/aderidos`.
   */
  async buscarAderidos(): Promise<AderidoSecretaria[]> {
    // A API já deve retornar a lista com o contrato preenchido e na ordem correta
    const dados = await fetchAPI("/admin/aderidos", "GET");

    // Mantemos a normalização para segurança (defensiva)
    // caso ainda haja dados legados que o backend não tratou.
    const lista = (Array.isArray(dados) ? dados : []).flatMap((registro) => {
      const id = obterIdRegistroSecretaria(registro);

      return id ? [normalizarAderidoSecretaria(id, registro)] : [];
    });

    return lista;
  },

  /**
   * Envia os dados para criação de um novo aderido, gerando posições e bilhetes no backend.
   *
   * @param {FormNovoAderido} dados - Dados do formulário de novo aderido.
   * @returns {Promise<any>} Resposta da API com id e faixa gerada.
   * @sideEffects Requisição POST para `/admin/aderidos`.
   */
  async adicionarAderidoIndividual(dados: FormNovoAderido) {
    // Criação fica no backend porque envolve regra de negócio e dados relacionados.
    return fetchAPI("/admin/aderidos", "POST", dados);
  },

  /**
   * Atualiza parcialmente os dados de um aderido existente.
   *
   * @param {string} id - Identificador único do aderido.
   * @param {FormEditarAderido} dados - Campos modificados no formulário de edição.
   * @returns {Promise<any>} Confirmação de atualização do backend.
   * @throws {Error} Se o ID não for informado.
   * @sideEffects Requisição PUT para `/admin/aderidos/:id`.
   */
  async atualizarAderidoSecretaria(id: string, dados: FormEditarAderido) {
    const idSeguro = id.trim();

    if (!idSeguro) {
      throw new Error("ID do aderido não informado para atualização.");
    }

    // O backend deve usar update/merge para preservar documentos legados do Firestore.
    return fetchAPI(
      `/admin/aderidos/${encodeURIComponent(idSeguro)}`,
      "PUT",
      dados,
    );
  },
};
