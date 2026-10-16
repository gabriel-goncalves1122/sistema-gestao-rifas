// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/services/vendaRifasService.ts
// ============================================================================
import * as admin from "firebase-admin";

import { enviarEmailRecibo } from "../emailService";
import { Bilhete, Comprador } from "../../types/models";
import { DadosVenda } from "../types/rifasTypes";
import { obterContextoAderidoPorEmail } from "../helpers/usuarioRifasHelper";

export class VendaRifasService {
  /**
   * Processa transacionalmente a venda direta de bilhetes de rifa por envio de comprovante bancário manual.
   * Regras e garantias de segurança:
   * - Garante que todas as rifas existem no banco;
   * - Impede roubo de cotas entre aderidos (Cross-Seller Theft): cada rifa deve pertencer ao lote do vendedor logado;
   * - Garante que as rifas estão com status 'disponivel';
   * - Cria o registro na coleção 'compradores';
   * - Atualiza atômica e simultaneamente todos os bilhetes para status 'pendente' com a URL do comprovante;
   * - Envia email de notificação assíncrono para o comprador caso o email seja informado.
   *
   * @param {string} uid - Identificador do usuário no Firebase Auth.
   * @param {string} emailLogado - Email do aderido vendedor autenticado.
   * @param {DadosVenda} dadosVenda - Dados cadastrais do comprador, comprovante anexado e array de números de rifas.
   * @returns {Promise<void>}
   * @throws {Error} Dispara "INVALID_DATA", "RIFA_NOT_FOUND" ou "RIFA_INDISPONIVEL".
   * @transactional Executa leitura prévia e mutação dos bilhetes em `db.runTransaction`.
   * @sideEffects Cria registro em 'compradores', atualiza documentos em 'bilhetes' e dispara email transacional via Nodemailer.
   */
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

      const snaps =
        typeof transaction.getAll === "function"
          ? await transaction.getAll(...rifasRefs.map(({ ref }) => ref))
          : await Promise.all(
              rifasRefs.map(({ ref }) => transaction.get(ref)),
            );

      for (const snap of snaps) {
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
          comprador_telefone: telefone,
          comprador_email: email || null,
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
