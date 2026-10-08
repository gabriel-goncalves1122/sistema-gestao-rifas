// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/services/vendaRifasService.ts
// ============================================================================
import * as admin from "firebase-admin";

import { enviarEmailRecibo } from "../emailService";
import { Bilhete, Comprador } from "../../types/models";
import { DadosVenda } from "../types/rifasTypes";
import { obterContextoAderidoPorEmail } from "../helpers/usuarioRifasHelper";

export class VendaRifasService {
  static async processarVenda(
    uid: string,
    emailLogado: string,
    dadosVenda: DadosVenda,
  ): Promise<void> {
    const db = admin.firestore();

    const { nome, telefone, email, numerosRifas, comprovanteUrl } = dadosVenda;

    if (!comprovanteUrl || !numerosRifas || numerosRifas.length === 0) {
      throw new Error("INVALID_DATA");
    }

    const contextoAderido = await obterContextoAderidoPorEmail(emailLogado);
    const momentoExatoDaReserva = new Date().toISOString();
    const compradorRef = db.collection("compradores").doc();

    await db.runTransaction(async (transaction) => {
      const rifasRefs = numerosRifas.map((numero: string) => ({
        numero,
        ref: db.collection("bilhetes").doc(numero),
      }));

      for (const { ref } of rifasRefs) {
        const snap = await transaction.get(ref);
        if (!snap.exists) {
          throw new Error("RIFA_NOT_FOUND");
        }

        const bilhete = snap.data() as Bilhete;

        if (bilhete.vendedor_id && bilhete.vendedor_id !== contextoAderido.idAderido) {
          throw new Error("RIFA_INDISPONIVEL"); // Pertence a outro aderido (Cross-Seller Theft)
        }

        if (bilhete.status !== "disponivel") {
          throw new Error("RIFA_INDISPONIVEL"); // Já vendida ou reservada
        }
      }

      const novoComprador: Comprador = {
        id: compradorRef.id,
        nome,
        telefone,
        email: email || null,
        criado_em: momentoExatoDaReserva,
      };

      transaction.set(compradorRef, novoComprador);

      rifasRefs.forEach(({ ref }) => {
        const updateBilhete: Partial<Bilhete> & Record<string, any> = {
          status: "pendente",
          comprador_id: compradorRef.id,
          comprador_nome: nome,
          vendedor_nome: contextoAderido.vendedorNome,
          vendedor_cpf: contextoAderido.vendedorCpf,
          vendedor_id: contextoAderido.idAderido,
          data_reserva: momentoExatoDaReserva,
          comprovante_url: comprovanteUrl,
        };

        transaction.set(ref, updateBilhete, { merge: true });
      });
    });

    if (email) {
      await enviarEmailRecibo(email, nome, numerosRifas, "pendente")
        .catch((erro) => {
          console.error("[Venda] Falha ao enviar email:", erro);
        });
    }
  }
}
