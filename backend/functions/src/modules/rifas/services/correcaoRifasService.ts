// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/services/correcaoRifasService.ts
// ============================================================================
import * as admin from "firebase-admin";

import { Bilhete } from "../../types/models";
import { DadosCorrecaoRifas } from "../types/rifasTypes";
import { obterContextoAderidoPorEmail } from "../helpers/usuarioRifasHelper";

/**
 * Valida a presença obrigatória de rifas, dados cadastrais e URL do novo comprovante para correção.
 *
 * @param {string[]} numerosRifas - Lista de números de rifas a corrigir.
 * @param {DadosCorrecaoRifas} dados - Dados da correção contendo novo comprovante.
 * @throws {Error} Dispara "INVALID_DATA" se algum dado obrigatório estiver faltando.
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
   * Reenvia um novo comprovante e dados cadastrais atualizados para bilhetes que foram recusados pela tesouraria.
   * Regras de negócio:
   * - Apenas bilhetes do vendedor logado com `status === 'recusado'` são atualizados;
   * - O status do bilhete é revertido para 'pendente' para nova validação da tesouraria;
   * - Limpa o motivo de recusa anterior e a flag de pendência;
   * - Atualiza atômica e simultaneamente o comprador na coleção 'compradores'.
   *
   * @param {string} emailLogado - Email do aderido autenticado.
   * @param {string[]} numerosRifas - Lista de números das rifas recusadas.
   * @param {DadosCorrecaoRifas} dadosAtualizados - Novos dados e URL do comprovante reanexado.
   * @returns {Promise<boolean>} Retorna `true` se processado com sucesso.
   * @throws {Error} Se falhar a validação ou se a transação do banco for abortada.
   * @transactional Executa em transação Firestore com consistência entre bilhetes e compradores.
   * @sideEffects Atualiza documentos em 'bilhetes' e 'compradores'.
   */
  static async corrigirRifasRecusadas(
    emailLogado: string,
    numerosRifas: string[],
    dadosAtualizados: DadosCorrecaoRifas,
  ): Promise<boolean> {
    validarDadosCorrecao(numerosRifas, dadosAtualizados);

    const db = admin.firestore();
    const contextoAderido = await obterContextoAderidoPorEmail(emailLogado);

    const nomeLimpo = String(dadosAtualizados.nome).trim();
    const telefoneLimpo = String(dadosAtualizados.telefone).trim();
    const emailLimpo = String(dadosAtualizados.email || "").trim() || null;
    const agora = new Date().toISOString();

    try {
      await db.runTransaction(async (transaction) => {
        const bilhetesRefs = numerosRifas.map((numero) =>
          db.collection("bilhetes").doc(numero),
        );
        const bilhetesSnaps =
          typeof transaction.getAll === "function"
            ? await transaction.getAll(...bilhetesRefs)
            : await Promise.all(
                bilhetesRefs.map((ref) => transaction.get(ref)),
              );

        const compradoresIds = new Set<string>();

        for (let i = 0; i < bilhetesSnaps.length; i++) {
          const bilheteSnap = bilhetesSnaps[i];
          const bilheteRef = bilheteSnap.ref || bilhetesRefs[i];

          if (!bilheteSnap.exists) continue;

          const dadosBilhete = bilheteSnap.data() as Bilhete;

          const podeCorrigir =
            dadosBilhete?.vendedor_id === contextoAderido.idAderido &&
            dadosBilhete?.status === "recusado";

          if (!podeCorrigir) continue;

          if (dadosBilhete.comprador_id) {
            compradoresIds.add(dadosBilhete.comprador_id);
          }

          transaction.update(bilheteRef, {
            status: "pendente",
            comprador_nome: nomeLimpo,
            comprador_telefone: telefoneLimpo,
            comprador_email: emailLimpo,
            comprovante_url: dadosAtualizados.comprovanteUrl,
            motivo_recusa: null,
            correcao_pendente: null,
            log_automacao: null,
            data_reserva: agora,
          });
        }

        compradoresIds.forEach((compradorId) => {
          const compradorRef = db.collection("compradores").doc(compradorId);
          transaction.update(compradorRef, {
            nome: nomeLimpo,
            telefone: telefoneLimpo,
            email: emailLimpo,
          });
        });
      });

      return true;
    } catch (error) {
      console.error("[CorrecaoRifasService] Erro ao corrigir rifas:", error);

      throw new Error("Falha ao salvar a correção no banco de dados.");
    }
  }
}
