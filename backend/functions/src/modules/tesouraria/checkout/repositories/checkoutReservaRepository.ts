// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/checkout/repositories/checkoutReservaRepository.ts
// ============================================================================

import { FieldValue } from "firebase-admin/firestore";

import { Bilhete, Comprador, PagamentoPix, ProvedorPagamento } from "../../../types/models";
import { ModoProvedorPagamento } from "../../../../shared/payments/types/paymentProviderTypes";
import { construirGatewayMetaEnxuto } from "../../helpers/origemPagamentoHelper";
import {
  CheckoutPixDadosNormalizados,
  isRifaDisponivelParaPix,
  montarReferenceIdPix,
} from "../../helpers/checkoutPixHelper";
import { montarBilheteReservadoPix } from "../builders/checkoutEntityBuilder";
import {
  BaseFirestoreRepository,
  extrairErroMensagem,
  isPagamentoPixAtivoValido,
} from "./baseFirestoreRepository";

/**
 * Repositório responsável pelas etapas de pré-validação, lock de idempotência,
 * reserva atômica de bilhetes, persistência da cobrança gerada e compensação em falhas.
 */
export class CheckoutReservaRepository extends BaseFirestoreRepository {
  /**
   * Verifica previamente no Firestore se todos os bilhetes especificados existem e estão disponíveis.
   *
   * @param {string[]} numeros - Lista de números dos bilhetes.
   * @param {string} [sessaoCheckoutId] - ID da sessão de checkout para renovação de reserva.
   * @param {string} [vendedorIdEsperado] - UID do vendedor aderido esperado.
   * @returns {Promise<void>}
   * @throws {Error} `"RIFA_NOT_FOUND"` ou `"RIFA_INDISPONIVEL"`.
   */
  async verificarDisponibilidadeRifas(
    numeros: string[],
    sessaoCheckoutId?: string,
    vendedorIdEsperado?: string,
  ): Promise<void> {
    const db = this.getDb();

    for (const numero of numeros) {
      const snap = await db.collection("bilhetes").doc(numero).get();
      if (!snap.exists) {
        throw new Error("RIFA_NOT_FOUND");
      }

      const dados = snap.data() as Bilhete;
      if (!isRifaDisponivelParaPix(dados, sessaoCheckoutId, vendedorIdEsperado)) {
        throw new Error("RIFA_INDISPONIVEL");
      }
    }
  }

  /**
   * Recupera um pagamento Pix ativo caso exista um lock de idempotência válido.
   *
   * @param {string} idempotencyKey - Chave de idempotência calculada para a compra.
   * @returns {Promise<PagamentoPix | null>} Pagamento ativo ou `null`.
   */
  async obterPagamentoAtivoPorLock(idempotencyKey: string): Promise<PagamentoPix | null> {
    const db = this.getDb();
    const lockSnap = await db.collection("pagamentos_pix_idempotencia").doc(idempotencyKey).get();

    if (!lockSnap.exists) return null;

    const paymentId = String(lockSnap.data()?.payment_id || "");
    if (!paymentId) return null;

    const pagamentoSnap = await db.collection("pagamentos_pix").doc(paymentId).get();
    if (!pagamentoSnap.exists) return null;

    const pagamento = pagamentoSnap.data() as PagamentoPix;
    return isPagamentoPixAtivoValido(pagamento) ? pagamento : null;
  }

  /**
   * Reserva atomicamente os bilhetes e grava comprador, pagamento e lock de idempotência.
   * Caso já exista um pagamento ativo concorrente para o mesmo lock, retorna-o sem duplicar reserva.
   *
   * @param {Object} params - Parâmetros de criação da reserva.
   * @returns {Promise<{ existente: PagamentoPix | null; compradorId: string; pagamentoId: string; referenceId: string }>}
   * @transactional Executa leituras prévias de lock e bilhetes antes de gravar no Firestore.
   */
  async reservarBilhetesAtomicamente(params: {
    idempotencyKey: string;
    comprador: Omit<Comprador, "id">;
    pagamentoBase: Omit<PagamentoPix, "id" | "comprador_id" | "reference_id">;
    contextoAderido: any;
    dados: CheckoutPixDadosNormalizados;
    valorBruto: number;
    agora: string;
    expiraEm: string;
  }): Promise<{
    existente: PagamentoPix | null;
    compradorId: string;
    pagamentoId: string;
    referenceId: string;
  }> {
    const db = this.getDb();
    const compradorRef = db.collection("compradores").doc();
    const pagamentoRef = db.collection("pagamentos_pix").doc();
    const lockRef = db.collection("pagamentos_pix_idempotencia").doc(params.idempotencyKey);
    const referenceId = montarReferenceIdPix(compradorRef.id);

    const comprador: Comprador = { ...params.comprador, id: compradorRef.id };
    const pagamento: PagamentoPix = {
      ...params.pagamentoBase,
      id: pagamentoRef.id,
      comprador_id: compradorRef.id,
      reference_id: referenceId,
    };

    const existente = await db.runTransaction(async (transaction) => {
      const lockSnap = await transaction.get(lockRef);

      if (lockSnap.exists) {
        const paymentId = String(lockSnap.data()?.payment_id || "");
        if (paymentId) {
          const existenteSnap = await transaction.get(
            db.collection("pagamentos_pix").doc(paymentId),
          );
          if (existenteSnap.exists) {
            const pagamentoExistente = existenteSnap.data() as PagamentoPix;
            if (isPagamentoPixAtivoValido(pagamentoExistente)) {
              return pagamentoExistente;
            }
          }
        }
      }

      const rifasRefs = params.dados.numerosRifas.map((numero) => ({
        numero,
        ref: db.collection("bilhetes").doc(numero),
      }));

      for (const { ref } of rifasRefs) {
        const snap = await transaction.get(ref);
        if (!snap.exists) throw new Error("RIFA_NOT_FOUND");

        const disponivel = isRifaDisponivelParaPix(
          snap.data() as Bilhete,
          params.dados.sessaoCheckoutId,
          params.contextoAderido.idAderido,
        );
        if (!disponivel) throw new Error("RIFA_INDISPONIVEL");
      }

      transaction.set(compradorRef, comprador);
      transaction.set(pagamentoRef, pagamento);
      transaction.set(lockRef, {
        payment_id: pagamentoRef.id,
        vendedor_id: params.contextoAderido.idAderido,
        numeros_rifas: [...params.dados.numerosRifas].sort(),
        criado_em: params.agora,
      });

      const valorRifa = params.valorBruto / params.dados.numerosRifas.length;
      rifasRefs.forEach(({ numero, ref }) => {
        const bilhete = montarBilheteReservadoPix({
          numero,
          compradorId: compradorRef.id,
          referenceId: pagamento.reference_id,
          contextoAderido: params.contextoAderido,
          dados: params.dados,
          valorRifa,
          agora: params.agora,
          expiraEm: params.expiraEm,
          provedorPagamento: (pagamento.provedor_pagamento as ModoProvedorPagamento) || undefined,
        });
        transaction.set(ref, bilhete, { merge: true });
      });

      return null;
    });

    return {
      existente,
      compradorId: compradorRef.id,
      pagamentoId: pagamentoRef.id,
      referenceId,
    };
  }

  /**
   * Persiste transacionalmente os dados da cobrança gerada pelo provedor de pagamentos
   * no documento de `pagamentos_pix` e nos respectivos `bilhetes`.
   *
   * @param {Object} params - Dados gerados pelo provedor e lista de rifas vinculadas.
   * @returns {Promise<void>}
   * @transactional Executa dentro de `db.runTransaction`.
   */
  async persistirCobrancaGerada(params: {
    pagamentoId: string;
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
    provedorPagamento: ModoProvedorPagamento;
    rawProvedor: unknown;
  }): Promise<void> {
    const db = this.getDb();
    const pagamentoRef = db.collection("pagamentos_pix").doc(params.pagamentoId);

    await db.runTransaction(async (transaction) => {
      const pagamentoSnap = await transaction.get(pagamentoRef);
      if (!pagamentoSnap.exists) throw new Error("PAGAMENTO_NOT_FOUND");

      const expiraEm = params.qrCode.expiraEm || params.expiraEmFallback;
      const pagamento = pagamentoSnap.data() as PagamentoPix;
      const isJaResolvido =
        pagamento.status_pagamento_banco !== "CRIANDO" &&
        pagamento.status_pagamento_banco !== "WAITING";
      const statusBancoParaSalvar = isJaResolvido ? pagamento.status_pagamento_banco : "WAITING";

      const gatewayMeta = construirGatewayMetaEnxuto(
        params.rawProvedor,
        params.provedorPagamento as ProvedorPagamento,
      );

      transaction.set(
        pagamentoRef,
        {
          pix_order_id: params.orderId,
          pix_qr_code_id: params.qrCode.id,
          copia_e_cola: params.qrCode.copiaECola,
          ...(params.qrCode.qrCodeImagemUrl
            ? { qr_code_imagem_url: params.qrCode.qrCodeImagemUrl }
            : {}),
          data_expiracao: expiraEm,
          status_pagamento_banco: statusBancoParaSalvar,
          provedor_pagamento: params.provedorPagamento,
          ...(gatewayMeta ? { gateway_meta: gatewayMeta } : {}),
        },
        { merge: true },
      );

      params.numerosRifas.forEach((numero) => {
        const dadosBilhete = isJaResolvido
          ? {
              provedor_pagamento: params.provedorPagamento,
              pix_order_id: params.orderId,
              pix_qr_code_id: params.qrCode.id,
            }
          : {
              provedor_pagamento: params.provedorPagamento,
              pix_order_id: params.orderId,
              pix_qr_code_id: params.qrCode.id,
              data_expiracao: expiraEm,
              status_pagamento_banco: "WAITING",
            };

        transaction.set(db.collection("bilhetes").doc(numero), dadosBilhete, { merge: true });
      });
    });
  }

  /**
   * Registra erro parcial quando o pedido externo já possui `orderId`,
   * preservando rastreabilidade sem liberar as rifas indevidamente.
   *
   * @param {Object} params - Dados do erro pós-criação.
   * @returns {Promise<void>}
   * @transactional Executa em `db.runTransaction`.
   */
  async registrarErroPosCriacao(params: {
    pagamentoId: string;
    orderId: string;
    provedorPagamento: ModoProvedorPagamento;
    rawProvedor: unknown;
    error: unknown;
  }): Promise<void> {
    const db = this.getDb();
    const pagamentoRef = db.collection("pagamentos_pix").doc(params.pagamentoId);

    const gatewayMeta = construirGatewayMetaEnxuto(
      params.rawProvedor,
      params.provedorPagamento as ProvedorPagamento,
    );

    await db.runTransaction(async (transaction) => {
      transaction.set(
        pagamentoRef,
        {
          pix_order_id: params.orderId,
          status_pagamento_banco: "WAITING",
          provedor_pagamento: params.provedorPagamento,
          ...(gatewayMeta ? { gateway_meta: gatewayMeta } : {}),
          erro_criacao: extrairErroMensagem(params.error),
        },
        { merge: true },
      );
    });
  }

  /**
   * Executa compensação transacional quando o provedor falha antes de retornar `orderId`.
   * Marca o pagamento como `ERRO_CRIACAO`, exclui o lock e libera os bilhetes pertencentes à tentativa.
   *
   * @param {Object} params - Parâmetros de compensação.
   * @returns {Promise<void>}
   * @transactional Executa leituras antes das escritas dentro de `db.runTransaction`.
   */
  async compensarErroCriacao(params: {
    pagamentoId: string;
    idempotencyKey: string;
    numerosRifas: string[];
    referenceId: string;
    compradorId: string;
    error: unknown;
  }): Promise<void> {
    const db = this.getDb();
    const pagamentoRef = db.collection("pagamentos_pix").doc(params.pagamentoId);
    const lockRef = db.collection("pagamentos_pix_idempotencia").doc(params.idempotencyKey);
    const agora = new Date().toISOString();

    await db.runTransaction(async (transaction) => {
      const pagamentoSnap = await transaction.get(pagamentoRef);
      if (!pagamentoSnap.exists) return;

      const rifasSnaps = [];
      for (const numero of params.numerosRifas) {
        const ref = db.collection("bilhetes").doc(numero);
        const snap = await transaction.get(ref);
        rifasSnaps.push({ ref, snap });
      }

      transaction.set(
        pagamentoRef,
        {
          status_pagamento_banco: "ERRO_CRIACAO",
          erro_criacao: extrairErroMensagem(params.error),
          atualizado_em: agora,
        },
        { merge: true },
      );
      transaction.delete(lockRef);

      const deleteSentinel = FieldValue.delete();
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
            comprador_id: deleteSentinel,
            comprador_nome: deleteSentinel,
            data_reserva: deleteSentinel,
            data_expiracao: deleteSentinel,
            pix_order_id: deleteSentinel,
            pix_qr_code_id: deleteSentinel,
            pix_reference_id: deleteSentinel,
            provedor_pagamento: deleteSentinel,
            status_pagamento_banco: deleteSentinel,
            status_validacao: deleteSentinel,
            valor_bruto: deleteSentinel,
            valor_pago: 0,
            sessao_checkout_id: deleteSentinel,
          },
          { merge: true },
        );
      }
    });
  }
}
