import * as admin from "firebase-admin";

/**
 * Serviço responsável pela gestão de vitrine e premiações do sorteio de formatura,
 * gerenciando tanto as informações globais do evento quanto os itens de premiação.
 */
export class PremiosService {
  /**
   * Recupera as informações gerais do sorteio configurado e a listagem de prêmios cadastrados
   * ordenada pela colocação (ex: 1º lugar, 2º lugar).
   *
   * @returns {Promise<{ infoSorteio: Record<string, any>; premios: Array<Record<string, any>> }>}
   *          Dados do sorteio e lista de prêmios com IDs atribuídos.
   * @sideEffects Leitura do documento `configuracoes/sorteio` e da coleção `premios`.
   */
  static async listarTodos() {
    const db = admin.firestore();

    const infoSorteioSnap = await db
      .collection("configuracoes")
      .doc("sorteio")
      .get();
    const infoSorteio = infoSorteioSnap.exists
      ? infoSorteioSnap.data()
      : { titulo: "Sorteio", data: "A definir", descricao: "Participe!" };

    const premiosSnap = await db
      .collection("premios")
      .orderBy("colocacao")
      .get();
    const premios = premiosSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { infoSorteio, premios };
  }

  /**
   * Grava ou atualiza as configurações gerais do cabeçalho do sorteio (título, data, descrição).
   *
   * @param {Record<string, any>} dados - Objeto contendo os dados do cabeçalho do sorteio.
   * @sideEffects Substituição do documento `configuracoes/sorteio` no Firestore.
   */
  static async salvarInfoSorteio(dados: any) {
    await admin
      .firestore()
      .collection("configuracoes")
      .doc("sorteio")
      .set(dados);
  }

  /**
   * Cria um novo prêmio ou atualiza um prêmio existente na coleção `premios`.
   * Se o payload contiver a propriedade `id`, executa update no documento existente; caso contrário, cria um novo.
   *
   * @param {Record<string, any>} dados - Objeto com os campos do prêmio (colocação, título, descrição, imagem_url, etc.).
   * @sideEffects Criação ou atualização de documento na coleção `premios`.
   */
  static async salvarPremio(dados: any) {
    const db = admin.firestore();
    const { id, ...dadosPremio } = dados;
    if (id) {
      await db.collection("premios").doc(id).update(dadosPremio);
    } else {
      await db.collection("premios").add(dadosPremio);
    }
  }

  /**
   * Remove permanentemente um prêmio cadastrado pelo seu ID.
   *
   * @param {string} id - Identificador único do prêmio no Firestore.
   * @sideEffects Exclusão de documento na coleção `premios`.
   */
  static async excluirPremio(id: string) {
    await admin.firestore().collection("premios").doc(id).delete();
  }
}
