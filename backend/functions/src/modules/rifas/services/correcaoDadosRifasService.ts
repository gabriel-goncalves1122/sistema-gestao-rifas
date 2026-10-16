// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/services/correcaoDadosRifasService.ts
// ============================================================================
import * as admin from "firebase-admin";

import { Bilhete } from "../../types/models";
import { DadosCorrecaoDadosRifas } from "../types/rifasTypes";
import { obterContextoAderidoPorEmail } from "../helpers/usuarioRifasHelper";

/**
 * Valida a presença de rifas e dados cadastrais mínimos obrigatórios (nome e telefone) para a correção.
 *
 * @param {string[]} numerosRifas - Lista de números de rifa.
 * @param {DadosCorrecaoDadosRifas} dados - Dados do comprador a validar.
 * @throws {Error} Dispara "INVALID_DATA" se o array estiver vazio ou campos essenciais ausentes.
 */
function validarDadosCorrecao(
  numerosRifas: string[],
  dados: DadosCorrecaoDadosRifas,
): void {
  if (!Array.isArray(numerosRifas) || numerosRifas.length === 0) {
    throw new Error("INVALID_DATA");
  }

  if (!String(dados.nome || "").trim() || !String(dados.telefone || "").trim()) {
    throw new Error("INVALID_DATA");
  }
}

export class CorrecaoDadosRifasService {
  /**
   * Corrige os dados cadastrais (nome, telefone, email) de bilhetes recusados ou com pendência cadastral.
   * Regras de negócio aplicadas:
   * 1. Se `status === 'recusado'`: a rifa volta para status transacional `pendente` para reavaliação pela tesouraria.
   * 2. Se `correcao_pendente === true`: o bilhete já está `pago` (ex: Pix recebido com erro cadastral);
   *    portanto a flag `correcao_pendente` é limpa (null) e o status `pago` é preservado intacto.
   * 3. A coleção 'compradores' é atualizada transacionalmente como fonte da verdade primária.
   *
   * @param {string} emailLogado - Email do aderido vendedor autenticado.
   * @param {string[]} numerosRifas - Lista de números de rifas a corrigir.
   * @param {DadosCorrecaoDadosRifas} dadosAtualizados - Novos dados sanitizados do comprador.
   * @returns {Promise<boolean>} Retorna `true` se ao menos um bilhete foi corrigido.
   * @throws {Error} Dispara "INVALID_DATA" ou "RIFAS_NOT_FOUND" se nenhuma rifa elegível for encontrada.
   * @transactional Executa leitura e atualização atômica de bilhetes e compradores em transação Firestore.
   * @sideEffects Atualiza coleções 'bilhetes' e 'compradores'.
   */
  static async corrigirDadosRifasRecusadas(
    emailLogado: string,
    numerosRifas: string[],
    dadosAtualizados: DadosCorrecaoDadosRifas,
  ): Promise<boolean> {
    validarDadosCorrecao(numerosRifas, dadosAtualizados);

    const db = admin.firestore();
    const contextoAderido = await obterContextoAderidoPorEmail(emailLogado);
    const nomeLimpo = String(dadosAtualizados.nome).trim();
    const telefoneLimpo = String(dadosAtualizados.telefone).trim();
    const emailLimpo = String(dadosAtualizados.email || "").trim() || null;
    const agora = new Date().toISOString();
    let atualizadas = 0;

    await db.runTransaction(async (transaction) => {
      const bilhetesRefs = numerosRifas.map((numero) =>
        db.collection("bilhetes").doc(numero),
      );
      const snaps =
        typeof transaction.getAll === "function"
          ? await transaction.getAll(...bilhetesRefs)
          : await Promise.all(
              bilhetesRefs.map((ref) => transaction.get(ref)),
            );

      const compradoresIds = new Set<string>();

      for (let i = 0; i < snaps.length; i++) {
        const bilheteSnap = snaps[i];
        if (!bilheteSnap.exists) continue;

        const bilhete = bilheteSnap.data() as Bilhete;
        const podeCorrigir =
          bilhete.vendedor_id === contextoAderido.idAderido &&
          (bilhete.status === "recusado" || bilhete.correcao_pendente === true);

        if (!podeCorrigir) continue;

        if (bilhete.comprador_id) {
          compradoresIds.add(bilhete.comprador_id);
        }

        const eraRecusado = bilhete.status === "recusado";
        const payload: Partial<Bilhete> = {
          comprador_nome: nomeLimpo,
          comprador_telefone: telefoneLimpo,
          comprador_email: emailLimpo,
          motivo_recusa: null,
          correcao_pendente: null,
          ...(eraRecusado
            ? {
                status: "pendente",
                status_validacao: null,
                log_automacao: null,
                data_reserva: agora,
              }
            : {}),
        };

        transaction.update(bilheteSnap.ref || bilhetesRefs[i], payload);
        atualizadas += 1;
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

    if (atualizadas === 0) {
      throw new Error("RIFAS_NOT_FOUND");
    }

    return true;
  }
}

