import * as admin from "firebase-admin";

import { Bilhete } from "../../types/models";
import { enviarEmailRecibo } from "../../rifas/emailService";
import { ResultadoReenvioEmailComprovante } from "../types/tesourariaTypes";

/**
 * Sanitiza valores textuais para evitar inconsistências com nulos ou espaços sobressalentes.
 *
 * @param {string | null} [valor] - Texto bruto de entrada.
 * @returns {string} String limpa ou vazia.
 */
function normalizarTexto(valor?: string | null): string {
  return String(valor || "").trim();
}

/**
 * Extrai o número do bilhete a partir dos dados do documento Firestore ou do ID do documento.
 *
 * @param {admin.firestore.QueryDocumentSnapshot} doc - Snapshot do Firestore.
 * @returns {string} Número do bilhete de rifa formatado.
 */
function obterNumeroRifa(doc: admin.firestore.QueryDocumentSnapshot): string {
  const dados = doc.data() as Partial<Bilhete>;

  return normalizarTexto(dados.numero) || doc.id;
}

export class EmailComprovanteService {
  /**
   * Reenvia o email de recibo/comprovante de compra para o comprador de um lote de bilhetes.
   * Realiza validações de segurança:
   * - Garante que a compra existe na base;
   * - Garante que todos os bilhetes vinculados estão efetivamente com status 'pago';
   * - Garante que o comprador possui endereço de email cadastrado.
   *
   * @param {string} compradorId - Identificador único do comprador na coleção 'compradores'.
   * @returns {Promise<ResultadoReenvioEmailComprovante>} Resultado contendo email de destino, lista ordenada de rifas e status.
   * @throws {Error} Dispara "COMPRA_NAO_ENCONTRADA", "COMPRA_NAO_PAGA", "COMPRA_SEM_EMAIL" ou "EMAIL_COMPROVANTE_NAO_ENVIADO".
   * @sideEffects Dispara email transacional via Nodemailer (`enviarEmailRecibo`).
   */
  static async reenviarEmailComprovante(
    compradorId: string,
  ): Promise<ResultadoReenvioEmailComprovante> {
    const db = admin.firestore();
    const bilhetesSnap = await db
      .collection("bilhetes")
      .where("comprador_id", "==", compradorId)
      .get();

    if (bilhetesSnap.empty) {
      throw new Error("COMPRA_NAO_ENCONTRADA");
    }

    const bilhetes = bilhetesSnap.docs.map((doc) => ({
      numero: obterNumeroRifa(doc),
      dados: doc.data() as Bilhete,
    }));

    const todosPagos = bilhetes.every(
      ({ dados }) => normalizarTexto(dados.status) === "pago",
    );

    if (!todosPagos) {
      throw new Error("COMPRA_NAO_PAGA");
    }

    const email = normalizarTexto(
      bilhetes.find(({ dados }) => normalizarTexto(dados.comprador_email))
        ?.dados.comprador_email,
    );

    if (!email) {
      throw new Error("COMPRA_SEM_EMAIL");
    }

    const nome =
      normalizarTexto(
        bilhetes.find(({ dados }) => normalizarTexto(dados.comprador_nome))
          ?.dados.comprador_nome,
      ) || "Comprador";
    const rifas = bilhetes
      .map(({ numero }) => numero)
      .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

    const enviado = await enviarEmailRecibo(email, nome, rifas, "aprovado");

    if (!enviado) {
      throw new Error("EMAIL_COMPROVANTE_NAO_ENVIADO");
    }

    return {
      comprador_id: compradorId,
      email,
      rifas,
      status: "aprovado",
    };
  }
}
