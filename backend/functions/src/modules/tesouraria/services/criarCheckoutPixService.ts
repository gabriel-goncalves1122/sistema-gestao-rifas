import * as admin from "firebase-admin";

import { Bilhete, PagamentoPix } from "../../types/models";
import {
  calcularValorPixCentavos,
  calcularValorPixReais,
  dataExpiracaoPix,
  montarCompradorPix,
  montarIdempotencyKeyPix,
  montarPagamentoPix,
  montarReferenceIdPix,
  montarRespostaCheckoutPix,
  normalizarDadosCheckoutPix,
  normalizarQrCodeMercadoPago,
  isRifaDisponivelParaPix,
  montarBilheteReservadoPix,
} from "../helpers/checkoutPixHelper";
import {
  compensarErroCriacaoPix,
  montarRespostaPagamentoPix,
  obterPagamentoAtivoPorLockPix,
  STATUS_PAGAMENTO_PIX_ATIVO,
  verificarDisponibilidadeRifasPix,
  erroMensagem,
  persistirPedidoMercadoPagoNoFirestore,
} from "../helpers/checkoutPixFirestoreHelper";
import { CheckoutPixResposta, CriarCheckoutPixPayload } from "../types/checkoutPixTypes";
import { obterContextoAderidoPorEmail } from "../../rifas/helpers/usuarioRifasHelper";
import { MercadoPagoPixClient } from "../../../shared/services/mercadoPagoPixClient";

export class CriarCheckoutPixService {
  static async executar(
    uid: string,
    emailLogado: string,
    payload: CriarCheckoutPixPayload,
  ): Promise<CheckoutPixResposta> {
    if (!uid || !emailLogado) throw new Error("UNAUTHORIZED");

    const db = admin.firestore();
    const dados = normalizarDadosCheckoutPix(payload);
    const contextoAderido = await obterContextoAderidoPorEmail(emailLogado);
    const compradorRef = db.collection("compradores").doc();
    const pagamentoRef = db.collection("pagamentos_pix").doc();
    const referenceId = montarReferenceIdPix(compradorRef.id);
    const idempotencyKey = montarIdempotencyKeyPix({
      vendedorId: contextoAderido.idAderido,
      numerosRifas: dados.numerosRifas,
    });
    const lockRef = db.collection("pagamentos_pix_idempotencia").doc(idempotencyKey);
    const expiraEm = dataExpiracaoPix();

    const pagamentoAtivo = await obterPagamentoAtivoPorLockPix({ db, lockRef });
    if (pagamentoAtivo) return montarRespostaPagamentoPix(pagamentoAtivo);

    // Pre-check rápido fora da transação
    await verificarDisponibilidadeRifasPix(db, dados.numerosRifas, payload.sessaoCheckoutId, contextoAderido.idAderido);

    const agora = new Date().toISOString();
    const valorBruto = calcularValorPixReais(dados.numerosRifas);
    const comprador = montarCompradorPix(compradorRef.id, dados, agora);
    const pagamento = montarPagamentoPix({
      pagamentoId: pagamentoRef.id,
      compradorId: compradorRef.id,
      referenceId,
      idempotencyKey,
      contextoAderido,
      dados,
      valorBruto,
      agora,
      expiraEm,
    });

    const existente = await db.runTransaction(async (transaction) => {
      const lockSnap = await transaction.get(lockRef);

      if (lockSnap.exists) {
        const paymentId = String(lockSnap.data()?.payment_id || "");
        if (paymentId) {
          const existenteRef = db.collection("pagamentos_pix").doc(paymentId);
          const existenteSnap = await transaction.get(existenteRef);
          if (existenteSnap.exists) {
            const pagamentoExistente = existenteSnap.data() as PagamentoPix;
            if (STATUS_PAGAMENTO_PIX_ATIVO.includes(String(pagamentoExistente.status_pagamento_banco))) {
              return pagamentoExistente;
            }
          }
        }
      }

      const rifasRefs = dados.numerosRifas.map((numero) => ({
        numero,
        ref: db.collection("bilhetes").doc(numero),
      }));

      for (const { ref } of rifasRefs) {
        const snap = await transaction.get(ref);
        if (!snap.exists) throw new Error("RIFA_NOT_FOUND");
        const data = snap.data() as Bilhete;
        const disponivel = isRifaDisponivelParaPix(data, payload.sessaoCheckoutId, contextoAderido.idAderido);

        if (!disponivel) throw new Error("RIFA_INDISPONIVEL");
      }

      transaction.set(compradorRef, comprador);
      transaction.set(pagamentoRef, pagamento);
      transaction.set(lockRef, {
        payment_id: pagamentoRef.id,
        vendedor_id: contextoAderido.idAderido,
        numeros_rifas: [...dados.numerosRifas].sort(),
        criado_em: agora,
      });

      const valorRifa = valorBruto / dados.numerosRifas.length;
      rifasRefs.forEach(({ numero, ref }) => {
        const bilhete = montarBilheteReservadoPix({
          numero,
          compradorId: compradorRef.id,
          referenceId,
          contextoAderido,
          dados,
          valorRifa,
          agora,
          expiraEm,
        });
        transaction.set(ref, bilhete, { merge: true });
      });

      return null;
    });

    if (existente) return montarRespostaPagamentoPix(existente);

    let respostaMercadoPago: any;
    let orderId = "";

    try {
      respostaMercadoPago = await MercadoPagoPixClient.criarPedidoPix({
        referenceId,
        nome: dados.nome,
        telefone: dados.telefone,
        email: dados.email,
        documento: dados.documento,
        numerosRifas: dados.numerosRifas,
        valorCentavos: calcularValorPixCentavos(dados.numerosRifas),
        expirationDate: expiraEm,
      });
      const qrCode = normalizarQrCodeMercadoPago(respostaMercadoPago);
      orderId = String(respostaMercadoPago?.id || "").trim();

      if (!orderId) throw new Error("MERCADOPAGO_ORDER_INVALIDO");

      await persistirPedidoMercadoPagoNoFirestore({
        db,
        pagamentoRef,
        orderId,
        qrCode,
        expiraEmFallback: expiraEm,
        numerosRifas: dados.numerosRifas,
        respostaMercadoPago,
      });

      return montarRespostaCheckoutPix({
        id: pagamentoRef.id,
        status: "WAITING",
        qrCode,
        numerosRifas: dados.numerosRifas,
      });
    } catch (error) {
      if (!orderId) {
        await compensarErroCriacaoPix({
          db,
          pagamentoRef,
          lockRef,
          numerosRifas: dados.numerosRifas,
          referenceId,
          compradorId: compradorRef.id,
          error,
        });
      } else {
        await db.runTransaction(async (transaction) => {
          transaction.set(
            pagamentoRef,
            {
              pix_order_id: orderId,
              status_pagamento_banco: "WAITING",
              raw_mercadopago: respostaMercadoPago || null,
              erro_criacao: erroMensagem(error),
            },
            { merge: true },
          );
        });
      }

      throw error;
    }
  }
}
