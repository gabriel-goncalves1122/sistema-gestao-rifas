// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/checkout/repositories/checkoutCancelamentoRepository.ts
// ============================================================================

import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

import { PagamentoPix } from "../../../types/models";
import { BaseFirestoreRepository } from "./baseFirestoreRepository";

const STATUS_PIX_JA_CANCELADOS = [
  "CANCELADO",
  "cancelled",
  "canceled",
  "rejected",
  "declined",
  "ERRO_CRIACAO",
  "expired",
  "expirado",
];

const STATUS_PIX_CANCELAVEIS = ["WAITING", "CRIANDO", "pending"];

export type LiberarBilhetesNaTransacaoFn = (
  transaction: any,
  db: admin.firestore.Firestore,
  fieldValueDelete: unknown,
  numerosRifas: string[],
  statusBanco: string,
  motivo: string | null,
  reterReserva?: boolean,
  sessaoCheckoutId?: string,
  referenciaParaValidar?: string,
) => Promise<void>;

/**
 * Repositório especializado no cancelamento, expiração e reversão transacional
 * de reservas Pix e seus bilhetes no Firestore.
 */
export class CheckoutCancelamentoRepository extends BaseFirestoreRepository {
  constructor(
    dbOverride?: admin.firestore.Firestore,
    private readonly liberarBilhetesFn: LiberarBilhetesNaTransacaoFn = CheckoutCancelamentoRepository.liberarBilhetesNaTransacao,
  ) {
    super(dbOverride);
  }
  /**
   * Libera ou reverte atômica e transacionalmente bilhetes de rifa reservados no Firestore,
   * respeitando a guarda de posse (`pix_reference_id`) e proteção contra sobrescrita de bilhetes pagos.
   *
   * @param {FirebaseFirestore.Transaction} transaction - Transação Firestore ativa.
   * @param {admin.firestore.Firestore} db - Instância do Firestore.
   * @param {unknown} fieldValueDelete - Sentinela `FieldValue.delete()`.
   * @param {string[]} numerosRifas - Lista de números dos bilhetes afetados.
   * @param {string} statusBanco - Status bancário associado à liberação.
   * @param {string | null} motivo - Motivo do cancelamento/recusa.
   * @param {boolean} [reterReserva=false] - Se `true`, mantém a reserva alterando apenas metadados.
   * @param {string} [sessaoCheckoutId] - ID da sessão de checkout para preservação.
   * @param {string} [referenciaParaValidar] - `pix_reference_id` esperado para guarda de posse.
   * @returns {Promise<void>}
   * @transactional Opera estritamente dentro da transação Firestore fornecida.
   */
  static async liberarBilhetesNaTransacao(
    transaction: any,
    db: admin.firestore.Firestore,
    fieldValueDelete: unknown,
    numerosRifas: string[],
    statusBanco: string,
    motivo: string | null,
    reterReserva = false,
    sessaoCheckoutId?: string,
    referenciaParaValidar?: string,
  ): Promise<void> {
    if (!numerosRifas || numerosRifas.length === 0) return;

    const refs = numerosRifas.map((numero) => db.collection("bilhetes").doc(numero));
    const bilhetesSnaps =
      typeof transaction.getAll === "function"
        ? await transaction.getAll(...refs)
        : await Promise.all(refs.map((ref) => transaction.get(ref)));

    bilhetesSnaps.forEach((snap: any) => {
      if (!snap.exists) return;

      const bilhete = snap.data();

      if (
        referenciaParaValidar &&
        bilhete.pix_reference_id &&
        bilhete.pix_reference_id !== referenciaParaValidar
      ) {
        return;
      }

      if (
        bilhete.status === "pago" &&
        statusBanco !== "approved" &&
        statusBanco !== "authorized" &&
        statusBanco !== "paid"
      ) {
        return;
      }

      const atualizacao: Record<string, unknown> = {
        pix_order_id: fieldValueDelete,
        pix_qr_code_id: fieldValueDelete,
        pix_reference_id: fieldValueDelete,
        valor_pago: 0,
      };

      if (!reterReserva) {
        atualizacao.status = "disponivel";
        atualizacao.comprador_id = fieldValueDelete;
        atualizacao.comprador_nome = fieldValueDelete;
        atualizacao.comprador_email = fieldValueDelete;
        atualizacao.comprador_telefone = fieldValueDelete;
        atualizacao.data_reserva = fieldValueDelete;
        atualizacao.data_expiracao = fieldValueDelete;
        atualizacao.provedor_pagamento = fieldValueDelete;
        atualizacao.status_pagamento_banco = fieldValueDelete;
        atualizacao.status_validacao = fieldValueDelete;
        atualizacao.valor_bruto = fieldValueDelete;
        atualizacao.motivo_recusa = fieldValueDelete;
        atualizacao.sessao_checkout_id = fieldValueDelete;
      } else {
        atualizacao.status_pagamento_banco = statusBanco;
        if (sessaoCheckoutId) {
          atualizacao.sessao_checkout_id = sessaoCheckoutId;
        }
        atualizacao.motivo_recusa = motivo || fieldValueDelete;
      }

      transaction.set(snap.ref, atualizacao, { merge: true });
    });
  }

  /**
   * Cancela ou expira atomicamente um pagamento local e libera seus bilhetes no Firestore.
   *
   * @param {Object} params - Parâmetros de cancelamento/expiração.
   * @returns {Promise<{ pagamento: PagamentoPix; jaCancelado: boolean; ignorado?: boolean }>}
   * @transactional Executa leitura de pagamento e bilhetes antes das escritas em `db.runTransaction`.
   * @throws {Error} `"PAGAMENTO_NOT_FOUND"`, `"UNAUTHORIZED"` ou `"STATUS_INVALIDO_CANCELAMENTO"`.
   */
  async cancelarPagamentoLocal(params: {
    pagamentoId: string;
    motivo: string;
    erroCriacaoTexto: string;
    reterReserva?: boolean;
    ignorarSeStatusInvalido?: boolean;
    autorizar?: (pagamento: PagamentoPix) => void | Promise<void>;
  }): Promise<{ pagamento: PagamentoPix; jaCancelado: boolean; ignorado?: boolean }> {
    const db = this.getDb();
    const pagamentoRef = db.collection("pagamentos_pix").doc(params.pagamentoId);
    const reterReserva = Boolean(params.reterReserva);
    let resultado: { pagamento: PagamentoPix; jaCancelado: boolean; ignorado?: boolean } | null =
      null;

    const retornoTransacao = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(pagamentoRef);
      if (!snap.exists) {
        throw new Error("PAGAMENTO_NOT_FOUND");
      }

      const pagamento = snap.data() as PagamentoPix;

      if (params.autorizar) {
        await params.autorizar(pagamento);
      }

      const statusAtual = String(pagamento.status_pagamento_banco);

      if (STATUS_PIX_JA_CANCELADOS.includes(statusAtual)) {
        if (!reterReserva) {
          await this.liberarBilhetesFn(
            transaction,
            db,
            FieldValue.delete(),
            pagamento.numeros_rifas || [],
            "cancelled",
            params.motivo,
            false,
            undefined,
            pagamento.reference_id,
          );
        }

        resultado = { pagamento, jaCancelado: true };
        return resultado;
      }

      if (!STATUS_PIX_CANCELAVEIS.includes(statusAtual)) {
        if (params.ignorarSeStatusInvalido) {
          resultado = { pagamento, jaCancelado: false, ignorado: true };
          return resultado;
        }
        throw new Error("STATUS_INVALIDO_CANCELAMENTO");
      }

      await this.liberarBilhetesFn(
        transaction,
        db,
        FieldValue.delete(),
        pagamento.numeros_rifas || [],
        "cancelled",
        params.motivo,
        reterReserva,
        undefined,
        pagamento.reference_id,
      );

      transaction.update(pagamentoRef, {
        status_pagamento_banco: "cancelled",
        erro_criacao: params.erroCriacaoTexto,
      });

      resultado = { pagamento, jaCancelado: false };
      return resultado;
    });

    return retornoTransacao || resultado!;
  }
}
