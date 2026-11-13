// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/services/correcaoRifasService.ts
// ============================================================================
import { DadosCorrecaoRifas } from "../types/rifasTypes";
import { obterContextoAderidoPorEmail } from "../helpers/usuarioRifasHelper";
import { CorrecaoRifasRepository } from "../repositories/correcaoRifasRepository";

/**
 * Valida a presença obrigatória de rifas, dados cadastrais e URL do novo comprovante para correção.
 *
 * @param {string[]} numerosRifas - Lista de números de rifas a corrigir.
 * @param {DadosCorrecaoRifas} dados - Dados da correção contendo novo comprovante.
 * @throws {Error} Dispara `"INVALID_DATA"` se algum dado obrigatório estiver faltando.
 */
function validarDadosCorrecao(numerosRifas: string[], dados: DadosCorrecaoRifas): void {
  if (!Array.isArray(numerosRifas) || numerosRifas.length === 0) {
    throw new Error("INVALID_DATA");
  }

  if (!String(dados.nome || "").trim() || !String(dados.telefone || "").trim()) {
    throw new Error("INVALID_DATA");
  }

  if (!dados.comprovanteUrl) {
    throw new Error("INVALID_DATA");
  }
}

export class CorrecaoRifasService {
  /**
   * Reenvia um novo comprovante e dados cadastrais atualizados para bilhetes recusados pela tesouraria,
   * revertendo-os para `'pendente'` e atualizando o comprador correspondente.
   *
   * @param {string} emailLogado - Email do aderido autenticado.
   * @param {string[]} numerosRifas - Lista de números das rifas recusadas.
   * @param {DadosCorrecaoRifas} dadosAtualizados - Novos dados e URL do comprovante reanexado.
   * @returns {Promise<boolean>} Retorna `true` se processado com sucesso.
   * @throws {Error} `"INVALID_DATA"`, `"USER_NOT_FOUND"` ou erro de persistência.
   * @transactional Executa em transação Firestore via `CorrecaoRifasRepository`.
   */
  static async corrigirRifasRecusadas(
    emailLogado: string,
    numerosRifas: string[],
    dadosAtualizados: DadosCorrecaoRifas,
  ): Promise<boolean> {
    validarDadosCorrecao(numerosRifas, dadosAtualizados);

    const contextoAderido = await obterContextoAderidoPorEmail(emailLogado);
    const agora = new Date().toISOString();

    try {
      await CorrecaoRifasRepository.corrigirBilhetesRecusadosAtomicamente({
        idAderido: contextoAderido.idAderido,
        numerosRifas,
        dados: dadosAtualizados,
        agora,
      });

      return true;
    } catch (error) {
      console.error("[CorrecaoRifasService] Erro ao corrigir rifas:", error);
      throw new Error("Falha ao salvar a correção no banco de dados.");
    }
  }

  /**
   * Cancela em definitivo a venda de rifas recusadas, liberando os bilhetes de volta
   * para o inventário com status `'disponivel'` e removendo o comprador vinculado.
   *
   * @param {string} emailLogado - Email do aderido autenticado.
   * @param {string[]} numerosRifas - Lista de números de bilhetes recusados a liberar.
   * @returns {Promise<boolean>} Retorna `true` caso a transação seja concluída com sucesso.
   * @throws {Error} `"INVALID_DATA"`, `"USER_NOT_FOUND"` ou erro de persistência.
   * @transactional Executa em transação Firestore via `CorrecaoRifasRepository`.
   */
  static async desistirRifasRecusadas(
    emailLogado: string,
    numerosRifas: string[],
  ): Promise<boolean> {
    if (!Array.isArray(numerosRifas) || numerosRifas.length === 0) {
      throw new Error("INVALID_DATA");
    }

    const contextoAderido = await obterContextoAderidoPorEmail(emailLogado);

    try {
      await CorrecaoRifasRepository.liberarBilhetesRecusadosAtomicamente({
        idAderido: contextoAderido.idAderido,
        numerosRifas,
      });

      return true;
    } catch (error: any) {
      if (error?.message === "USER_NOT_FOUND" || error?.message === "INVALID_DATA") {
        throw error;
      }
      console.error("[CorrecaoRifasService] Erro ao desistir de rifas:", error);
      throw new Error("Falha ao liberar rifas recusadas no banco de dados.");
    }
  }
}
