import * as admin from "firebase-admin";

import { Bilhete, PagamentoPix } from "../../types/models";
import { CheckoutPixResposta } from "../types/checkoutPixTypes";
import {
  mapearStatusCheckoutPix,
  isRifaDisponivelParaPix,
  LOCK_CRIANDO_TIMEOUT_MS,
} from "./checkoutPixHelper";

export const STATUS_PAGAMENTO_PIX_ATIVO = ["CRIANDO", "WAITING", "IN_ANALYSIS"];

/**
 * Avalia se um documento de pagamento Pix vinculado a um lock de idempotência está ativo e válido.
 * Descarta pagamentos que ficaram presos em status 'CRIANDO' sem `pix_order_id` além do tempo limite
 * (ex: falha ou timeout antes da resposta do gateway), permitindo que o aderido tente novamente.
 *
 * @param {PagamentoPix} pagamento - Documento do pagamento armazenado no Firestore.
 * @param {number} [agoraMs=Date.now()] - Timestamp atual em milissegundos para verificação de expiração do lock.
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

  return true;
}

/**
 * Extrai com segurança a mensagem de texto de um erro desconhecido capturado em bloco catch.
 *
 * @param {unknown} error - Instância de erro ou valor lançado.
 * @returns {string} Mensagem do erro ou "ERRO_DESCONHECIDO".
 */
export function erroMensagem(error: unknown): string {
  return error instanceof Error ? error.message : "ERRO_DESCONHECIDO";
}

/**
 * Verifica previamente no Firestore se todos os bilhetes especificados existem e estão disponíveis para reserva Pix.
 *
 * @param {admin.firestore.Firestore} db - Instância do Firestore.
 * @param {string[]} numeros - Lista de números dos bilhetes a verificar.
 * @param {string} [sessaoCheckoutId] - ID da sessão de checkout atual caso esteja renovando reserva.
 * @param {string} [vendedorIdEsperado] - UID do vendedor aderido esperado.
 * @returns {Promise<void>}
 * @throws {Error} Dispara "RIFA_NOT_FOUND" se algum bilhete não existir, ou "RIFA_INDISPONIVEL" se estiver ocupado por outro comprador.
 */
export async function verificarDisponibilidadeRifasPix(
  db: admin.firestore.Firestore,
  numeros: string[],
  sessaoCheckoutId?: string,
  vendedorIdEsperado?: string
): Promise<void> {
  for (const numero of numeros) {
    const ref = db.collection("bilhetes").doc(numero);
    const snap = await ref.get();

    if (!snap.exists) {
      throw new Error("RIFA_NOT_FOUND");
    }

    const dados = snap.data() as Bilhete;
    const disponivel = isRifaDisponivelParaPix(dados, sessaoCheckoutId, vendedorIdEsperado);

    if (!disponivel) {
      throw new Error("RIFA_INDISPONIVEL");
    }
  }
}

/**
 * Converte um documento de pagamento Pix já existente em DTO de resposta formatado para o frontend.
 *
 * @param {PagamentoPix} pagamento - Documento de pagamento lido do Firestore.
 * @returns {CheckoutPixResposta} DTO estruturado com QR Code e dados da cobrança.
 * @throws {Error} Dispara "PAGAMENTO_EM_CRIACAO" se os dados do QR code ainda não foram sincronizados.
 */
export function montarRespostaPagamentoPix(
  pagamento: PagamentoPix,
): CheckoutPixResposta {
  if (!pagamento.pix_qr_code_id || !pagamento.copia_e_cola) {
    throw new Error("PAGAMENTO_EM_CRIACAO");
  }

  return {
    id: pagamento.id,
    status: mapearStatusCheckoutPix(String(pagamento.status_pagamento_banco)),
    qrCodeImagemUrl: pagamento.qr_code_imagem_url || null,
    qrCodeBase64: pagamento.qr_code_base64 || null,
    copiaECola: pagamento.copia_e_cola,
    expiraEm: pagamento.data_expiracao || null,
    numerosRifas: pagamento.numeros_rifas || [],
  };
}

/**
 * Recupera um pagamento Pix ativo caso exista um lock de concorrência pendente para a mesma chave de idempotência.
 *
 * @param {Object} params - Parâmetros da consulta.
 * @param {admin.firestore.Firestore} params.db - Instância do Firestore.
 * @param {admin.firestore.DocumentReference} params.lockRef - Referência do documento de lock na coleção 'locks_pix'.
 * @returns {Promise<PagamentoPix | null>} Documento do pagamento se ativo e dentro do ciclo de vida; caso contrário, `null`.
 */
export async function obterPagamentoAtivoPorLockPix(params: {
  db: admin.firestore.Firestore;
  lockRef: admin.firestore.DocumentReference;
}): Promise<PagamentoPix | null> {
  const lockSnap = await params.lockRef.get();

  if (!lockSnap.exists) return null;

  const paymentId = String(lockSnap.data()?.payment_id || "");

  if (!paymentId) return null;

  const pagamentoSnap = await params.db
    .collection("pagamentos_pix")
    .doc(paymentId)
    .get();

  if (!pagamentoSnap.exists) return null;

  const pagamento = pagamentoSnap.data() as PagamentoPix;

  return isPagamentoPixAtivoValido(pagamento) ? pagamento : null;
}

/**
 * Executa compensação transacional em caso de falha externa ao criar pedido no provedor Pix.
 * Marca o pagamento com status "ERRO_CRIACAO", remove o lock de idempotência e reverte
 * os bilhetes envolvidos para 'disponivel', garantindo consistência atômica.
 *
 * @param {Object} params - Parâmetros da compensação.
 * @param {admin.firestore.Firestore} params.db - Instância do Firestore.
 * @param {admin.firestore.DocumentReference} params.pagamentoRef - Referência do documento de pagamento.
 * @param {admin.firestore.DocumentReference} params.lockRef - Referência do documento de lock.
 * @param {string[]} params.numerosRifas - Lista de números dos bilhetes afetados.
 * @param {string} params.referenceId - ID de referência da tentativa.
 * @param {string} params.compradorId - ID do comprador.
 * @param {unknown} params.error - Erro original disparado pelo provedor.
 * @returns {Promise<void>}
 * @transactional Executa em transação Firestore com separação estrita de leituras e escritas.
 * @sideEffects Atualiza o pagamento, exclui o lock e restaura os bilhetes no Firestore.
 */
export async function compensarErroCriacaoPix(params: {
  db: admin.firestore.Firestore;
  pagamentoRef: admin.firestore.DocumentReference;
  lockRef: admin.firestore.DocumentReference;
  numerosRifas: string[];
  referenceId: string;
  compradorId: string;
  error: unknown;
}): Promise<void> {
  const agora = new Date().toISOString();

  await params.db.runTransaction(async (transaction) => {
    // 1. TODAS AS LEITURAS PRIMEIRO (Reads)
    const pagamentoSnap = await transaction.get(params.pagamentoRef);
    if (!pagamentoSnap.exists) return;

    const rifasSnaps = [];
    for (const numero of params.numerosRifas) {
      const ref = params.db.collection("bilhetes").doc(numero);
      const snap = await transaction.get(ref);
      rifasSnaps.push({ ref, snap });
    }

    // 2. TODAS AS ESCRITAS DEPOIS (Writes)
    transaction.set(
      params.pagamentoRef,
      {
        status_pagamento_banco: "ERRO_CRIACAO",
        erro_criacao: erroMensagem(params.error),
        atualizado_em: agora,
      },
      { merge: true },
    );
    transaction.delete(params.lockRef);

    for (const { ref, snap } of rifasSnaps) {
      if (!snap.exists) continue;

      const bilhete = snap.data() as Bilhete;
      const pertenceAoPagamento =
        bilhete.pix_reference_id === params.referenceId &&
        bilhete.comprador_id === params.compradorId;

      if (!pertenceAoPagamento) continue;

      transaction.set(
        ref,
        {
          status: "disponivel",
          comprador_id: null,
          comprador_nome: null,
          data_reserva: null,
          data_expiracao: null,
          pix_order_id: null,
          pix_qr_code_id: null,
          pix_reference_id: null,
          status_pagamento_banco: "ERRO_CRIACAO",
          status_validacao: null,
          valor_bruto: null,
          valor_pago: 0,
          sessao_checkout_id: null,
        },
        { merge: true },
      );
    }
  });
}

/**
 * Persiste transacionalmente os identificadores do Mercado Pago (orderId, QR Code, payload copia-e-cola)
 * no documento de pagamento e atualiza os bilhetes correspondentes no Firestore.
 *
 * @param {Object} params - Dados da persistência.
 * @param {admin.firestore.Firestore} params.db - Instância do Firestore.
 * @param {admin.firestore.DocumentReference} params.pagamentoRef - Referência do documento de pagamento.
 * @param {string} params.orderId - Identificador do pedido retornado pelo gateway.
 * @param {Object} params.qrCode - Estrutura normalizada do QR Code Pix.
 * @param {string} params.expiraEmFallback - Data limite de expiração caso não retornada pelo gateway.
 * @param {string[]} params.numerosRifas - Lista de números de rifa vinculados.
 * @param {any} params.respostaMercadoPago - Payload bruto do gateway para fins de log e auditoria.
 * @returns {Promise<void>}
 * @transactional Executa em transação Firestore com consistência imediata entre pagamento e bilhetes.
 * @sideEffects Atualiza 'pagamentos_pix' e 'bilhetes'.
 */
export async function persistirPedidoMercadoPagoNoFirestore(params: {
  db: admin.firestore.Firestore;
  pagamentoRef: admin.firestore.DocumentReference;
  orderId: string;
  qrCode: {
    id: string;
    copiaECola: string;
    qrCodeImagemUrl?: string | null;
    qrCodeBase64?: string | null;
    expiraEm?: string | null;
  };
  expiraEmFallback: string;
  numerosRifas: string[];
  respostaMercadoPago: any;
}): Promise<void> {
  await params.db.runTransaction(async (transaction) => {
    const pagamentoSnap = await transaction.get(params.pagamentoRef);
    if (!pagamentoSnap.exists) throw new Error("PAGAMENTO_NOT_FOUND");

    const expiraEm = params.qrCode.expiraEm || params.expiraEmFallback;

    const pagamento = pagamentoSnap.data() as PagamentoPix;
    const isJaResolvido = pagamento.status_pagamento_banco !== "CRIANDO" && pagamento.status_pagamento_banco !== "WAITING";
    const statusBancoParaSalvar = isJaResolvido ? pagamento.status_pagamento_banco : "WAITING";

    transaction.set(
      params.pagamentoRef,
      {
        pix_order_id: params.orderId,
        pix_qr_code_id: params.qrCode.id,
        copia_e_cola: params.qrCode.copiaECola,
        qr_code_imagem_url: params.qrCode.qrCodeImagemUrl || null,
        qr_code_base64: params.qrCode.qrCodeBase64 || null,
        data_expiracao: expiraEm,
        status_pagamento_banco: statusBancoParaSalvar,
        raw_mercadopago: params.respostaMercadoPago,
      },
      { merge: true },
    );

    params.numerosRifas.forEach((numero) => {
      // Se o status já foi resolvido, o webhook já deve ter alterado o bilhete de acordo (pra pendente ou disponível).
      // Apenas gravamos a orderId e o qrCode. Se não foi resolvido, garantimos o WAITING no bilhete.
      if (!isJaResolvido) {
        transaction.set(
          params.db.collection("bilhetes").doc(numero),
          {
            pix_order_id: params.orderId,
            pix_qr_code_id: params.qrCode.id,
            data_expiracao: expiraEm,
            status_pagamento_banco: "WAITING",
          },
          { merge: true },
        );
      } else {
        transaction.set(
          params.db.collection("bilhetes").doc(numero),
          {
            pix_order_id: params.orderId,
            pix_qr_code_id: params.qrCode.id,
          },
          { merge: true },
        );
      }
    });
  });
}
