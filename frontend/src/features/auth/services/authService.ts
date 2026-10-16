// ============================================================================
// ARQUIVO: frontend/src/features/auth/services/authService.ts
// ============================================================================
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "@/shared/config/firebase";
import { fetchAPI } from "@/shared/services/api";

/**
 * Serviço de autenticação frontend que encapsula chamadas ao Firebase Auth SDK Web
 * e sincroniza chamadas com a API REST de verificação de elegibilidade e ativação.
 */
export const authService = {
  /**
   * Autentica um usuário existente com e-mail e senha utilizando o Firebase Auth.
   *
   * @param {string} email - Endereço de e-mail do formando.
   * @param {string} senha - Senha cadastrada.
   * @returns {Promise<import("firebase/auth").User>} Usuário autenticado do Firebase.
   * @sideEffects Autenticação de sessão via Firebase Auth.
   */
  async login(email: string, senha: string) {
    const credencial = await signInWithEmailAndPassword(auth, email, senha);
    return credencial.user;
  },

  /**
   * Encerra a sessão ativa do usuário no Firebase Auth.
   *
   * @returns {Promise<void>}
   * @sideEffects Logout e descarte dos tokens locais da sessão.
   */
  async logout() {
    await signOut(auth);
  },

  /**
   * Dispara o envio nativo do e-mail de recuperação de senha pelo Firebase Auth.
   *
   * @param {string} email - E-mail do usuário solicitante.
   * @returns {Promise<void>}
   * @sideEffects Envio de e-mail de reset pelo provedor do Firebase Auth.
   */
  async enviarRecuperacaoSenha(email: string) {
    await sendPasswordResetEmail(auth, email);
  },

  /**
   * Fluxo composto de cadastro: valida elegibilidade no backend, cria a conta no Firebase Auth
   * e conclui a ativação chamando `/auth/completar-registo`.
   *
   * @param {string} nome - Nome completo do formando.
   * @param {string} email - E-mail institucional verificado.
   * @param {string} senha - Senha escolhida.
   * @param {string} cpf - CPF do aderido.
   * @returns {Promise<import("firebase/auth").User>} Objeto do usuário criado no Firebase Auth.
   * @throws {Error} Se o e-mail não for elegível ou se a criação falhar.
   * @sideEffects Criação de conta no Firebase Auth e mutação de ativação no backend via API REST.
   */
  async registrarUsuario(
    nome: string,
    email: string,
    senha: string,
    cpf: string,
  ) {
    // Confirma no backend se o e-mail pertence à base oficial da comissão.
    await fetchAPI("/auth/elegibilidade", "POST", { email }, false);

    const credencial = await createUserWithEmailAndPassword(auth, email, senha);

    // Completa o cadastro do usuário autenticado no banco.
    await fetchAPI("/auth/completar-registo", "POST", { nome, cpf }, true);

    return credencial.user;
  },
};
