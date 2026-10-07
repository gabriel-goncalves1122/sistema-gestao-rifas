// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/services/correcaoDadosRifasService.ts
// ============================================================================
import * as admin from "firebase-admin";

import { Bilhete } from "../../types/models";
import { DadosCorrecaoDadosRifas } from "../types/rifasTypes";
import { obterContextoAderidoPorEmail } from "../helpers/usuarioRifasHelper";

function validarDadosCorrecao(
  numerosRifas: string[],
  dados: DadosCorrecaoDadosRifas,
) {
  if (!Array.isArray(numerosRifas) || numerosRifas.length === 0) {
    throw new Error("INVALID_DATA");
  }

  if (!String(dados.nome || "").trim() || !String(dados.telefone || "").trim()) {
    throw new Error("INVALID_DATA");
  }
}

export class CorrecaoDadosRifasService {
  static async corrigirDadosRifasRecusadas(
    emailLogado: string,
    numerosRifas: string[],
    dadosAtualizados: DadosCorrecaoDadosRifas,
  ): Promise<boolean> {
    validarDadosCorrecao(numerosRifas, dadosAtualizados);

    const db = admin.firestore();
    const contextoAderido = await obterContextoAderidoPorEmail(emailLogado);
    let atualizadas = 0;

    await db.runTransaction(async (transaction) => {
      const bilhetesRefs = numerosRifas.map((numero) =>
        db.collection("bilhetes").doc(numero),
      );
      const snaps = await transaction.getAll(...bilhetesRefs);

      for (let i = 0; i < snaps.length; i++) {
        const bilheteSnap = snaps[i];
        if (!bilheteSnap.exists) continue;

        const bilhete = bilheteSnap.data() as Bilhete;
        const podeCorrigir =
          bilhete.vendedor_id === contextoAderido.idAderido &&
          (bilhete.status === "recusado" || bilhete.correcao_pendente === true);

        if (!podeCorrigir) continue;

        const payload: Partial<Bilhete> = {
          comprador_nome: dadosAtualizados.nome,
          status_validacao: null,
          motivo_recusa: null,
          log_automacao: null,
          data_reserva: new Date().toISOString(),
          status: "pendente", // Volta para fila de validação (Tesouraria precisa conferir)
          correcao_pendente: null as any, // Limpa a flag
        };

        transaction.update(bilheteSnap.ref, payload);
        atualizadas += 1;
      }
    });

    if (atualizadas === 0) {
      throw new Error("RIFAS_NOT_FOUND");
    }

    return true;
  }
}

