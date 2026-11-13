// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/checkout/repositories/checkoutPixRepository.ts
// ============================================================================

import * as admin from "firebase-admin";

import { Comprador, PagamentoPix } from "../../../types/models";
import {
  EventoStatusPagamento,
  ModoProvedorPagamento,
} from "../../../../shared/payments/types/paymentProviderTypes";
import { CheckoutPixDadosNormalizados } from "../../helpers/checkoutPixHelper";
import {
  extrairErroMensagem,
  isPagamentoPixAtivoValido,
  ResultadoAplicacaoEventoPix,
  STATUS_PAGAMENTO_PIX_ATIVO,
} from "./baseFirestoreRepository";
import { CheckoutCancelamentoRepository } from "./checkoutCancelamentoRepository";
import { CheckoutEventoRepository } from "./checkoutEventoRepository";
import { CheckoutManualRepository } from "./checkoutManualRepository";
import { CheckoutReservaRepository } from "./checkoutReservaRepository";

export {
  extrairErroMensagem,
  isPagamentoPixAtivoValido,
  STATUS_PAGAMENTO_PIX_ATIVO,
};
export type { ResultadoAplicacaoEventoPix };

/**
 * Fachada coordenadora para os repositórios transacionais especializados do Checkout Pix,
 * preservando a interface pública para strategies, services, CRONs e suítes de testes.
 */
export class CheckoutPixRepository {
  private readonly reserva: CheckoutReservaRepository;
  private readonly cancelamento: CheckoutCancelamentoRepository;
  private readonly evento: CheckoutEventoRepository;
  private readonly manual: CheckoutManualRepository;

  constructor(dbOverride?: admin.firestore.Firestore) {
    this.reserva = new CheckoutReservaRepository(dbOverride);
    this.cancelamento = new CheckoutCancelamentoRepository(dbOverride, (...args) =>
      CheckoutPixRepository.liberarBilhetesNaTransacao(...args),
    );
    this.evento = new CheckoutEventoRepository(dbOverride);
    this.manual = new CheckoutManualRepository(dbOverride);
  }

  /** @inheritdoc */
  async buscarPagamentoPorId(pagamentoId: string): Promise<PagamentoPix | null> {
    return this.evento.buscarPagamentoPorId(pagamentoId);
  }

  /** @inheritdoc */
  async verificarDisponibilidadeRifas(
    numeros: string[],
    sessaoCheckoutId?: string,
    vendedorIdEsperado?: string,
  ): Promise<void> {
    return this.reserva.verificarDisponibilidadeRifas(
      numeros,
      sessaoCheckoutId,
      vendedorIdEsperado,
    );
  }

  /** @inheritdoc */
  async obterPagamentoAtivoPorLock(idempotencyKey: string): Promise<PagamentoPix | null> {
    return this.reserva.obterPagamentoAtivoPorLock(idempotencyKey);
  }

  /** @inheritdoc */
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
    return this.reserva.reservarBilhetesAtomicamente(params);
  }

  /** @inheritdoc */
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
    return this.reserva.persistirCobrancaGerada(params);
  }

  /** @inheritdoc */
  async registrarErroPosCriacao(params: {
    pagamentoId: string;
    orderId: string;
    provedorPagamento: ModoProvedorPagamento;
    rawProvedor: unknown;
    error: unknown;
  }): Promise<void> {
    return this.reserva.registrarErroPosCriacao(params);
  }

  /** @inheritdoc */
  async compensarErroCriacao(params: {
    pagamentoId: string;
    idempotencyKey: string;
    numerosRifas: string[];
    referenceId: string;
    compradorId: string;
    error: unknown;
  }): Promise<void> {
    return this.reserva.compensarErroCriacao(params);
  }

  /**
   * Delega a liberação transacional de bilhetes para `CheckoutCancelamentoRepository`.
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
    return CheckoutCancelamentoRepository.liberarBilhetesNaTransacao(
      transaction,
      db,
      fieldValueDelete,
      numerosRifas,
      statusBanco,
      motivo,
      reterReserva,
      sessaoCheckoutId,
      referenciaParaValidar,
    );
  }

  /** @inheritdoc */
  async cancelarPagamentoLocal(params: {
    pagamentoId: string;
    motivo: string;
    erroCriacaoTexto: string;
    reterReserva?: boolean;
    ignorarSeStatusInvalido?: boolean;
    autorizar?: (pagamento: PagamentoPix) => void | Promise<void>;
  }): Promise<{ pagamento: PagamentoPix; jaCancelado: boolean; ignorado?: boolean }> {
    return this.cancelamento.cancelarPagamentoLocal(params);
  }

  /** @inheritdoc */
  async aplicarEventoPagamento(
    evento: EventoStatusPagamento,
  ): Promise<ResultadoAplicacaoEventoPix> {
    return this.evento.aplicarEventoPagamento(evento);
  }

  /** @inheritdoc */
  async registrarConfirmacaoEnvio(params: {
    pagamentoId: string;
    comprovanteUrl: string;
    hashComprovante?: string | null;
    autorizar: (pagamento: PagamentoPix) => void | Promise<void>;
  }): Promise<{
    numerosRifas: string[];
    compradorEmail?: string | null;
    compradorNome?: string | null;
  }> {
    return this.manual.registrarConfirmacaoEnvio(params);
  }

  /** @inheritdoc */
  async simularPagamento(pagamentoId: string): Promise<void> {
    return this.manual.simularPagamento(pagamentoId);
  }
}
