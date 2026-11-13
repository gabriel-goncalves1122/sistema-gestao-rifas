// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/repositories/correcaoRifasRepository.ts
// ============================================================================

import * as admin from "firebase-admin";

import { Bilhete } from "../../types/models";
import { DadosCorrecaoRifas } from "../types/rifasTypes";

interface ContextoBilhetesRecusados {
  alvos: Array<{
    ref: FirebaseFirestore.DocumentReference;
    dados: Bilhete;
  }>;
  compradoresIds: Set<string>;
  listaPixOrderIds: string[];
  pagamentosSnaps: FirebaseFirestore.DocumentSnapshot[];
}

/**
 * Repositório transacional responsável por carregar e atualizar/liberar
 * bilhetes recusados, compradores e registros em `pagamentos_pix`.
 */
export class CorrecaoRifasRepository {
  /**
   * Lê dentro de uma transação Firestore os bilhetes elegíveis (pertencentes ao vendedor
   * e em status `"recusado"`) e os respectivos documentos de `pagamentos_pix`.
   *
   * @param {FirebaseFirestore.Transaction} transaction - Transação Firestore ativa.
   * @param {admin.firestore.Firestore} db - Instância do Firestore.
   * @param {string[]} numerosRifas - Números de rifas solicitados.
   * @param {string} idAderido - UID do vendedor aderido titular.
   * @returns {Promise<ContextoBilhetesRecusados>} Conjunto consolidado para escrita na mesma transação.
   * @transactional Executa apenas leituras antes de qualquer mutação.
   */
  private static async resolverBilhetesRecusadosNaTransacao(
    transaction: FirebaseFirestore.Transaction,
    db: admin.firestore.Firestore,
    numerosRifas: string[],
    idAderido: string,
  ): Promise<ContextoBilhetesRecusados> {
    const bilhetesRefs = numerosRifas.map((numero) => db.collection("bilhetes").doc(numero));
    const bilhetesSnaps =
      typeof transaction.getAll === "function"
        ? await transaction.getAll(...bilhetesRefs)
        : await Promise.all(bilhetesRefs.map((ref) => transaction.get(ref)));

    const alvos: ContextoBilhetesRecusados["alvos"] = [];
    const compradoresIds = new Set<string>();
    const pixOrderIds = new Set<string>();

    for (let i = 0; i < bilhetesSnaps.length; i++) {
      const snap = bilhetesSnaps[i];
      if (!snap.exists) continue;

      const dados = snap.data() as Bilhete;
      const elegivel = dados?.vendedor_id === idAderido && dados?.status === "recusado";
      if (!elegivel) continue;

      if (dados.comprador_id) compradoresIds.add(dados.comprador_id);
      if (dados.pix_order_id) pixOrderIds.add(dados.pix_order_id);

      alvos.push({
        ref: snap.ref || bilhetesRefs[i],
        dados,
      });
    }

    const listaPixOrderIds = Array.from(pixOrderIds);
    const pagamentosSnaps = await Promise.all(
      listaPixOrderIds.map(async (orderId) => {
        const querySnap = await transaction.get(
          db.collection("pagamentos_pix").where("pix_order_id", "==", orderId).limit(1),
        );
        if (!querySnap.empty) {
          return querySnap.docs[0];
        }
        return transaction.get(db.collection("pagamentos_pix").doc(orderId));
      }),
    );

    return {
      alvos,
      compradoresIds,
      listaPixOrderIds,
      pagamentosSnaps,
    };
  }

  /**
   * Atualiza transacionalmente bilhetes recusados para `"pendente"`, sincronizando
   * os dados cadastrais em `compradores` e `pagamentos_pix`.
   *
   * @param {object} params - Identificador do vendedor, números e novos dados do comprador.
   * @returns {Promise<void>}
   * @transactional Opera todas as leituras antes das escritas em `db.runTransaction`.
   */
  static async corrigirBilhetesRecusadosAtomicamente(params: {
    idAderido: string;
    numerosRifas: string[];
    dados: DadosCorrecaoRifas;
    agora: string;
  }): Promise<void> {
    const db = admin.firestore();
    const nomeLimpo = String(params.dados.nome).trim();
    const telefoneLimpo = String(params.dados.telefone).trim();
    const emailLimpo = String(params.dados.email || "").trim() || null;

    await db.runTransaction(async (transaction) => {
      const { alvos, compradoresIds, listaPixOrderIds, pagamentosSnaps } =
        await this.resolverBilhetesRecusadosNaTransacao(
          transaction,
          db,
          params.numerosRifas,
          params.idAderido,
        );

      for (const { ref, dados } of alvos) {
        transaction.update(ref, {
          status: "pendente",
          status_validacao: null,
          validado_em: null,
          validado_por: null,
          comprador_nome: nomeLimpo,
          comprador_telefone: telefoneLimpo,
          comprador_email: emailLimpo,
          comprovante_url: params.dados.comprovanteUrl,
          motivo_recusa: null,
          correcao_pendente: null,
          log_automacao: null,
          data_reserva: params.agora,
          ...(dados.status_pagamento_banco === "DECLINED"
            ? { status_pagamento_banco: "IN_ANALYSIS" }
            : {}),
        });
      }

      compradoresIds.forEach((compradorId) => {
        transaction.update(db.collection("compradores").doc(compradorId), {
          nome: nomeLimpo,
          telefone: telefoneLimpo,
          email: emailLimpo,
        });
      });

      pagamentosSnaps.forEach((pagSnap, index) => {
        if (!pagSnap?.exists) return;
        const orderId = listaPixOrderIds[index];
        const dadosPag = pagSnap.data() || {};
        const pagRef = pagSnap.ref || db.collection("pagamentos_pix").doc(orderId);

        transaction.update(pagRef, {
          comprador_nome: nomeLimpo,
          comprador_telefone: telefoneLimpo,
          comprador_email: emailLimpo,
          comprovante_url: params.dados.comprovanteUrl,
          status_validacao: "pendente",
          validado_em: null,
          validado_por: null,
          motivo_recusa: null,
          motivo_negacao: null,
          ...(dadosPag.status_pagamento_banco === "DECLINED"
            ? { status_pagamento_banco: "IN_ANALYSIS" }
            : {}),
        });
      });
    });
  }

  /**
   * Libera transacionalmente bilhetes recusados de volta para `"disponivel"`,
   * removendo compradores órfãos e cancelando os registros em `pagamentos_pix`.
   *
   * @param {object} params - Identificador do vendedor e lista de números a liberar.
   * @returns {Promise<void>}
   * @transactional Opera todas as leituras antes das escritas em `db.runTransaction`.
   */
  static async liberarBilhetesRecusadosAtomicamente(params: {
    idAderido: string;
    numerosRifas: string[];
  }): Promise<void> {
    const db = admin.firestore();

    await db.runTransaction(async (transaction) => {
      const { alvos, compradoresIds, listaPixOrderIds, pagamentosSnaps } =
        await this.resolverBilhetesRecusadosNaTransacao(
          transaction,
          db,
          params.numerosRifas,
          params.idAderido,
        );

      // Identifica compradores que ainda possuem outros bilhetes ativos para não deletar cadastros válidos
      const compradoresParaDeletar: string[] = [];
      const numerosRecusadosAlvo = new Set(alvos.map((a) => a.dados.numero || a.ref.id));
      for (const compradorId of Array.from(compradoresIds)) {
        const outrosBilhetesSnap = await transaction.get(
          db.collection("bilhetes").where("comprador_id", "==", compradorId).limit(10),
        );
        const docs = outrosBilhetesSnap?.docs || [];
        const temOutroBilheteAtivo = docs.some((doc: any) => {
          const dadosDoc = typeof doc.data === "function" ? doc.data() : doc.data;
          return !numerosRecusadosAlvo.has(doc.id) && dadosDoc?.status !== "disponivel";
        });
        if (!temOutroBilheteAtivo) {
          compradoresParaDeletar.push(compradorId);
        }
      }

      const deleteField = admin.firestore.FieldValue.delete();
      for (const { ref } of alvos) {
        transaction.update(ref, {
          status: "disponivel",
          comprador_id: deleteField,
          comprador_nome: deleteField,
          comprador_telefone: deleteField,
          comprador_email: deleteField,
          data_reserva: deleteField,
          data_pagamento: deleteField,
          data_expiracao: deleteField,
          sessao_checkout_id: deleteField,
          comprovante_url: deleteField,
          log_automacao: deleteField,
          motivo_recusa: deleteField,
          correcao_pendente: deleteField,
          pix_order_id: deleteField,
          pix_qr_code_id: deleteField,
          pix_reference_id: deleteField,
          status_pagamento_banco: deleteField,
          status_validacao: deleteField,
          valor_bruto: deleteField,
          valor_pago: 0,
        });
      }

      compradoresParaDeletar.forEach((compradorId) => {
        transaction.delete(db.collection("compradores").doc(compradorId));
      });

      pagamentosSnaps.forEach((pagSnap, index) => {
        if (!pagSnap?.exists) return;
        const orderId = listaPixOrderIds[index];
        const pagRef = pagSnap.ref || db.collection("pagamentos_pix").doc(orderId);

        transaction.update(pagRef, {
          status_pagamento_banco: "CANCELED",
          status_validacao: "negada",
        });
      });
    });
  }
}
