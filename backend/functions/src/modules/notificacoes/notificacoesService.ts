import * as admin from "firebase-admin";

/**
 * Serviço responsável pela gestão de notificações aos usuários do sistema,
 * permitindo consulta de avisos e criação acoplada a operações transacionais
 * de outros módulos (tesouraria, rifas).
 */
export class NotificacoesService {
  /**
   * Busca as notificações mais recentes vinculadas ao e-mail do aderido, com tolerância
   * a esquemas legados e fallback para consultas sem índice composto.
   *
   * @param {string} email - Endereço de e-mail do usuário autenticado.
   * @returns {Promise<Array<Record<string, any>>>} Lista de notificações do usuário ordenadas por data decrescente.
   * @sideEffects Leitura das coleções `usuarios` e `notificacoes`.
   */
  static async buscarPorEmailAderido(email: string) {
    const db = admin.firestore();

    // 1. Busca o usuário com segurança
    const userDocs = await db
      .collection("usuarios")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (userDocs.empty) return [];

    const userData = userDocs.docs[0].data();

    // 2. CORREÇÃO: O banco antigo pode não ter 'id_aderido'
    // Se não houver id_aderido, usamos o ID do próprio documento como fallback
    const idBusca = userData.id_aderido || userDocs.docs[0].id;

    if (!idBusca) return [];

    try {
      const snap = await db
        .collection("notificacoes")
        .where("vendedor_id", "==", idBusca)
        .orderBy("data_criacao", "desc")
        .limit(20)
        .get();

      return (
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) || []
      ); // Garante retorno de array mesmo se algo der errado no map
    } catch (error) {
      console.error(
        "Erro ao buscar notificações (Provável falta de índice ou campo):",
        error,
      );
      // Se o orderBy falhar por falta de índice em produção, tentamos sem o orderBy para não crashar a tela
      const snapFallback = await db
        .collection("notificacoes")
        .where("vendedor_id", "==", idBusca)
        .limit(20)
        .get();

      return snapFallback.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
  }

  /**
   * Marca um conjunto de notificações como lidas em lote, garantindo que pertençam ao usuário autenticado.
   * Executa em lotes (chunks) de 30 IDs para respeitar a restrição de operadores `in` do Firestore.
   *
   * @param {string[]} ids - Lista de IDs das notificações a serem atualizadas.
   * @param {string} email - E-mail do usuário autenticado para validação de posse.
   * @sideEffects Atualização atômica em lote (WriteBatch) na coleção `notificacoes`.
   */
  static async marcarComoLidas(ids: string[], email: string) {
    // Se não vier IDs, sai fora para não dar erro de batch vazio
    if (!ids || ids.length === 0) return;

    const db = admin.firestore();

    // 1. Busca o usuário com segurança
    const userDocs = await db
      .collection("usuarios")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (userDocs.empty) return;
    const userData = userDocs.docs[0].data();
    const idBusca = userData.id_aderido || userDocs.docs[0].id;
    if (!idBusca) return;

    // 2. Busca todas as notificações em chunks de 30 para evitar o limite do operador 'in'
    const batch = db.batch();
    const CHUNK_SIZE = 30;
    let hasUpdates = false;

    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      const snap = await db
        .collection("notificacoes")
        .where(admin.firestore.FieldPath.documentId(), "in", chunk)
        .where("vendedor_id", "==", idBusca)
        .get();

      if (!snap.empty) {
        hasUpdates = true;
        snap.docs.forEach((doc) => {
          batch.update(doc.ref, { lida: true });
        });
      }
    }

    if (hasUpdates) {
      await batch.commit();
    }
  }

  /**
   * Agenda a gravação de uma notificação de recusa de comprovante dentro de um WriteBatch ou Transaction.
   *
   * @param {admin.firestore.WriteBatch | admin.firestore.Transaction} batchOrTransaction - Instância de lote ou transação ativa.
   * @param {string} vendedorId - Identificador do vendedor/aderido destinatário.
   * @param {string} motivo - Mensagem descritiva da razão da recusa.
   * @param {string[]} numerosRifas - Lista de números das rifas afetadas pela recusa.
   * @sideEffects Agenda a criação de documento na coleção `notificacoes`.
   */
  static criarNotificacaoRecusa(
    batchOrTransaction: admin.firestore.WriteBatch | admin.firestore.Transaction,
    vendedorId: string,
    motivo: string,
    numerosRifas: string[],
  ) {
    const db = admin.firestore();
    const notificacaoRef = db.collection("notificacoes").doc();

    // Proteção: Garante que vendedorId existe para não criar lixo no banco
    if (!vendedorId) return;

    (batchOrTransaction as admin.firestore.WriteBatch).set(notificacaoRef, {
      vendedor_id: vendedorId,
      titulo: "Comprovante Recusado ⚠️",
      mensagem:
        motivo || "O comprovante enviado não foi aceito pela tesouraria.",
      rifas: numerosRifas || [], // Fallback para array vazio
      lida: false,
      data_criacao: new Date().toISOString(),
    });
  }

  /**
   * Agenda a gravação de uma notificação solicitando correção de dados do comprador dentro de um lote ou transação.
   *
   * @param {admin.firestore.WriteBatch | admin.firestore.Transaction} batchOrTransaction - Instância de lote ou transação ativa.
   * @param {string} vendedorId - Identificador do vendedor/aderido.
   * @param {string} motivo - Instruções de correção enviadas pela tesouraria.
   * @param {string[]} numerosRifas - Lista de números de rifa associados.
   * @sideEffects Agenda a criação de documento na coleção `notificacoes`.
   */
  static criarNotificacaoCorrecaoDados(
    batchOrTransaction: admin.firestore.WriteBatch | admin.firestore.Transaction,
    vendedorId: string,
    motivo: string,
    numerosRifas: string[],
  ) {
    const db = admin.firestore();
    const notificacaoRef = db.collection("notificacoes").doc();

    if (!vendedorId) return;

    (batchOrTransaction as admin.firestore.WriteBatch).set(notificacaoRef, {
      vendedor_id: vendedorId,
      tipo: "correcao_dados",
      titulo: "Venda recusada",
      mensagem: motivo || "Revise os dados do comprador e envie novamente.",
      rifas: numerosRifas || [],
      lida: false,
      data_criacao: new Date().toISOString(),
    });
  }

  /**
   * Agenda a gravação de uma notificação avisando que rifas não pagas foram liberadas e voltaram ao estoque.
   *
   * @param {admin.firestore.WriteBatch | admin.firestore.Transaction} batchOrTransaction - Instância de lote ou transação ativa.
   * @param {string} vendedorId - Identificador do vendedor/aderido.
   * @param {string} motivo - Motivo do cancelamento (ex: expiração de timeout Pix).
   * @param {string[]} numerosRifas - Lista dos números de bilhetes liberados.
   * @sideEffects Agenda a criação de documento na coleção `notificacoes`.
   */
  static criarNotificacaoRifaLiberada(
    batchOrTransaction: admin.firestore.WriteBatch | admin.firestore.Transaction,
    vendedorId: string,
    motivo: string,
    numerosRifas: string[],
  ) {
    const db = admin.firestore();
    const notificacaoRef = db.collection("notificacoes").doc();

    if (!vendedorId) return;

    (batchOrTransaction as admin.firestore.WriteBatch).set(notificacaoRef, {
      vendedor_id: vendedorId,
      tipo: "rifa_liberada",
      titulo: "Rifas disponíveis novamente",
      mensagem:
        motivo || "O pagamento não foi confirmado pelo banco e as rifas voltaram para venda.",
      rifas: numerosRifas || [],
      lida: false,
      data_criacao: new Date().toISOString(),
    });
  }
}
