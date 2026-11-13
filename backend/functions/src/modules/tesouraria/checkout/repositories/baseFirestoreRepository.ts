// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/checkout/repositories/baseFirestoreRepository.ts
// ============================================================================

import * as admin from "firebase-admin";

import { PagamentoPix } from "../../../types/models";
import { LOCK_CRIANDO_TIMEOUT_MS } from "../../helpers/checkoutPixHelper";

export const STATUS_PAGAMENTO_PIX_ATIVO = ["CRIANDO", "WAITING", "IN_ANALYSIS"];

export interface ResultadoAplicacaoEventoPix {
  sucesso: boolean;
  idempotente: boolean;
  status: string;
  mensagem?: string;
}

/**
 * Avalia se um documento de pagamento Pix vinculado a um lock de idempotência está ativo e válido.
 *
 * @param {PagamentoPix} pagamento - Documento do pagamento armazenado no Firestore.
 * @param {number} [agoraMs=Date.now()] - Timestamp atual em milissegundos.
 * @returns {boolean} `true` se o pagamento estiver ativo e não for um registro órfão travado.
 */
export function isPagamentoPixAtivoValido(
  pagamento: PagamentoPix,
  agoraMs = Date.now(),
): boolean {
  const status = String(pagamento.status_pagamento_banco || "");
  if (!STATUS_PAGAMENTO_PIX_ATIVO.includes(status)) {
    return false;
  }

  if (status === "CRIANDO" && !pagamento.pix_order_id && pagamento.data_criacao) {
    const criadoEmMs = new Date(pagamento.data_criacao).getTime();
    if (Number.isFinite(criadoEmMs) && agoraMs - criadoEmMs > LOCK_CRIANDO_TIMEOUT_MS) {
      return false;
    }
  }

  if (status !== "IN_ANALYSIS" && pagamento.data_expiracao) {
    const expiraMs = new Date(pagamento.data_expiracao).getTime();
    if (Number.isFinite(expiraMs) && agoraMs > expiraMs) {
      return false;
    }
  }

  return true;
}

/**
 * Extrai com segurança a mensagem de texto de um erro desconhecido.
 *
 * @param {unknown} error - Instância de erro ou valor lançado.
 * @returns {string} Mensagem do erro ou `"ERRO_DESCONHECIDO"`.
 */
export function extrairErroMensagem(error: unknown): string {
  return error instanceof Error ? error.message : "ERRO_DESCONHECIDO";
}

/**
 * Classe base para repositórios Firestore do módulo de Checkout Pix,
 * centralizando a obtenção da instância do banco (suportando injeção em testes).
 */
export abstract class BaseFirestoreRepository {
  constructor(protected readonly dbOverride?: admin.firestore.Firestore) {}

  /**
   * Obtém a instância ativa do Firestore (injetada ou padrão do Admin SDK).
   *
   * @returns {admin.firestore.Firestore} Instância do Firestore.
   */
  protected getDb(): admin.firestore.Firestore {
    return this.dbOverride || admin.firestore();
  }
}
