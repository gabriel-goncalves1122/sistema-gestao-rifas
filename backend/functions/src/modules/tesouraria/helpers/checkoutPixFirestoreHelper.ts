import * as admin from "firebase-admin";

import { Bilhete, PagamentoPix } from "../../types/models";
import { CheckoutPixResposta } from "../types/checkoutPixTypes";
import { mapearStatusCheckoutPix, isRifaDisponivelParaPix } from "./checkoutPixHelper";

export const STATUS_PAGAMENTO_PIX_ATIVO = ["CRIANDO", "WAITING", "IN_ANALYSIS"];

export function erroMensagem(error: unknown) {
  return error instanceof Error ? error.message : "ERRO_DESCONHECIDO";
}

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

export async function obterPagamentoAtivoPorLockPix(params: {
  db: admin.firestore.Firestore;
  lockRef: admin.firestore.DocumentReference;
}) {
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

  return STATUS_PAGAMENTO_PIX_ATIVO.includes(
    String(pagamento.status_pagamento_banco),
  )
    ? pagamento
    : null;
}

export async function compensarErroCriacaoPix(params: {
  db: admin.firestore.Firestore;
  pagamentoRef: admin.firestore.DocumentReference;
  lockRef: admin.firestore.DocumentReference;
  numerosRifas: string[];
  referenceId: string;
  compradorId: string;
  error: unknown;
}) {
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
}) {
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
