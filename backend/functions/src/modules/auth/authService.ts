// ============================================================================
// ARQUIVO: backend/functions/src/modules/auth/authService.ts
// ============================================================================
import { db, auth } from "../../shared/config/firebaseAdmin";
import { Usuario } from "../types/models"; // <-- IMPORTAÇÃO DA TIPAGEM

/**
 * Dados cadastrais complementares enviados pelo usuário durante a primeira ativação de conta.
 */
export interface DadosRegisto {
  /** Nome completo do formando/aderido. */
  nome?: string;
  /** CPF formatado ou numérico. */
  cpf?: string;
  /** Telefone celular com DDD. */
  telefone?: string;
}

export const authService = {
  /**
   * Verifica se determinado e-mail foi pré-cadastrado no sistema e está apto a criar conta.
   *
   * @param {string} email - Endereço de e-mail institucional ou autorizado a validar.
   * @returns {Promise<boolean>} True se existir documento de usuário correspondente na coleção `usuarios`.
   * @sideEffects Leitura na coleção `usuarios`.
   */
  async verificarElegibilidade(email: string): Promise<boolean> {
    const userDocs = await db
      .collection("usuarios")
      .where("email", "==", email.toLowerCase().trim())
      .limit(1)
      .get();

    return !userDocs.empty;
  },

  /**
   * Vincula o UID do Firebase Auth ao cadastro pré-existente no Firestore, ativando a conta
   * do usuário (`status: "ativo"`) e gravando as custom claims de papel/role.
   *
   * @param {string} email - E-mail do usuário ativando a conta.
   * @param {string} uid - Identificador único de autenticação gerado pelo Firebase Auth.
   * @param {DadosRegisto} dadosFormulario - Dados preenchidos no formulário de primeiro acesso.
   * @returns {Promise<void>}
   * @throws {Error} `USUARIO_NAO_ENCONTRADO` se o e-mail não estiver na lista de usuários pré-cadastrados.
   * @sideEffects Atualização no Firestore (`usuarios/{docId}`) e definição de claims no Firebase Auth Admin SDK.
   */
  async completarRegisto(
    email: string,
    uid: string,
    dadosFormulario: DadosRegisto,
  ): Promise<void> {
    const userDocs = await db
      .collection("usuarios")
      .where("email", "==", email.toLowerCase().trim())
      .limit(1)
      .get();

    if (userDocs.empty) {
      throw new Error("USUARIO_NAO_ENCONTRADO");
    }

    const docSnap = userDocs.docs[0];
    const docId = docSnap.id;
    const dadosAntigos = docSnap.data() as Usuario; // <-- CASTING PARA A INTERFACE

    // Forçamos o Partial para garantir que não enviamos propriedades inválidas
    const updateData: Partial<Usuario> & Record<string, any> = {
      uid: uid,
      cpf: dadosFormulario.cpf || dadosAntigos.cpf || "",
      nome: dadosFormulario.nome
        ? String(dadosFormulario.nome).toUpperCase()
        : dadosAntigos.nome || "",
      telefone: dadosFormulario.telefone
        ? String(dadosFormulario.telefone)
        : dadosAntigos.telefone || "",
      status: "ativo", // <-- CORREÇÃO: minúscula para respeitar a tipagem ("pendente" | "ativo" | "inativo")
    };

    // 'data_ativacao' injetada via Record caso você não a tenha na interface Usuario
    updateData.data_ativacao = new Date().toISOString();

    await db.collection("usuarios").doc(docId).update(updateData);

    // Define custom claims com o cargo do documento para a regra firestore.rules funcionar
    const role = dadosAntigos.role || "aderido";
    try {
      await auth.setCustomUserClaims(uid, { role, roleAtualizado: true });
    } catch (error) {
      console.error("[AuthService] Erro ao definir custom claims:", error);
    }
  },

  /* 👇 DESATIVADO: Usaremos o sendPasswordResetEmail no Frontend
  async gerarLinkRecuperacao(email: string): Promise<string> {
    try {
      const link = await auth.generatePasswordResetLink(email);
      return link;
    } catch (error: any) {
      console.error("Erro ao gerar link no Firebase Admin:", error);
      throw error;
    }
  },
  */
};
