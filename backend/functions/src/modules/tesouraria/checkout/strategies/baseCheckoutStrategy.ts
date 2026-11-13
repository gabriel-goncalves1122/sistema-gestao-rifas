// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/checkout/strategies/baseCheckoutStrategy.ts
// ============================================================================

import { PagamentoPix } from "../../../types/models";
import { CheckoutPixResposta, CriarCheckoutPixPayload } from "../../types/checkoutPixTypes";
import {
  CheckoutPixDadosNormalizados,
  calcularValorPixCentavos,
  calcularValorPixReais,
  dataExpiracaoPix,
  montarIdempotencyKeyPix,
  montarRespostaCheckoutPix,
  normalizarDadosCheckoutPix,
} from "../../helpers/checkoutPixHelper";
import { obterContextoAderidoPorEmail } from "../../../rifas/helpers/usuarioRifasHelper";
import { enviarEmailRecibo } from "../../../rifas/emailService";
import {
  EventoStatusPagamento,
  IPaymentProvider,
  ModoProvedorPagamento,
} from "../../../../shared/payments/types/paymentProviderTypes";
import {
  construirRespostaPagamentoExistente,
  montarPayloadReservaCheckout,
} from "../builders/checkoutEntityBuilder";
import {
  validarAutorizacaoConfirmacaoEnvio,
  verificarAutorizacaoCancelamentoCheckout,
} from "../helpers/checkoutAutorizacaoHelper";
import { CheckoutPixRepository } from "../repositories/checkoutPixRepository";

export interface CancelarCheckoutInput {
  uid: string;
  email: string;
  role: string;
  pagamentoId: string;
  reterReserva?: boolean;
}

export interface ConfirmarEnvioCheckoutInput {
  uid: string;
  emailLogado: string;
  role?: string;
  pagamentoId: string;
  comprovanteUrl: string;
  hashComprovante?: string | null;
}

export interface ConfirmarEnvioCheckoutOutput {
  sucesso: boolean;
  pagamentoId: string;
  rifas: string[];
}

/**
 * Classe base abstrata que define o fluxo canônico (Template Method) para o ciclo de vida
 * de um Checkout Pix, delegando particularidades de cada modalidade (Mercado Pago vs. Pix Normal)
 * às subclasses concretas.
 */
export abstract class BaseCheckoutStrategy {
  abstract readonly tipo: ModoProvedorPagamento;

  constructor(
    protected readonly repository: CheckoutPixRepository,
    protected readonly provider: IPaymentProvider,
  ) {}

  /**
   * Valida regras específicas de entrada exigidas pela modalidade antes de reservar bilhetes.
   *
   * @param {CheckoutPixDadosNormalizados} dados - Dados normalizados do comprador e rifas.
   */
  protected abstract validarDadosEspecificos(dados: CheckoutPixDadosNormalizados): void;

  /**
   * Consulta o estado atualizado da cobrança junto ao provedor externo, quando aplicável.
   *
   * @param {PagamentoPix} pagamento - Registro de pagamento persistido no Firestore.
   * @returns {Promise<EventoStatusPagamento | null>} Evento traduzido ou `null` para fluxos locais.
   */
  protected abstract consultarEventoExterno(
    pagamento: PagamentoPix,
  ): Promise<EventoStatusPagamento | null>;

  /**
   * Solicita o cancelamento da cobrança junto ao gateway externo, quando aplicável.
   *
   * @param {PagamentoPix} pagamento - Registro de pagamento cancelado localmente.
   * @returns {Promise<void>}
   */
  protected abstract cancelarNoProvedorExterno(pagamento: PagamentoPix): Promise<void>;

  /**
   * Indica se a modalidade aceita confirmação manual de envio de comprovante.
   *
   * @returns {boolean} `true` quando suporta fluxo manual/comprovante.
   */
  protected abstract permiteConfirmacaoManual(): boolean;

  /**
   * Mensagem de liberação gravada nos bilhetes quando a cobrança expira automaticamente.
   *
   * @returns {string}
   */
  protected abstract mensagemExpiracaoAutomatica(): string;

  /**
   * Texto de auditoria gravado em `erro_criacao` quando a cobrança expira via CRON.
   *
   * @returns {string}
   */
  protected abstract mensagemErroExpiracaoCron(): string;

  /**
   * Inicia um novo checkout Pix com idempotência, reserva atômica no Firestore,
   * geração da cobrança no provedor específico e compensação em caso de falha.
   *
   * @param {string} uid - UID do usuário autenticado.
   * @param {string} emailLogado - E-mail do aderido autenticado.
   * @param {CriarCheckoutPixPayload} payload - Dados do comprador e rifas selecionadas.
   * @returns {Promise<CheckoutPixResposta>} DTO da cobrança criada.
   * @throws {Error} `"UNAUTHORIZED"`, `"INVALID_DATA"`, `"RIFA_NOT_FOUND"`, `"RIFA_INDISPONIVEL"` ou erros do provedor.
   */
  async criarCheckout(
    uid: string,
    emailLogado: string,
    payload: CriarCheckoutPixPayload,
  ): Promise<CheckoutPixResposta> {
    if (!uid || !emailLogado) throw new Error("UNAUTHORIZED");

    const dados = normalizarDadosCheckoutPix(payload);
    this.validarDadosEspecificos(dados);

    const contextoAderido = await obterContextoAderidoPorEmail(emailLogado);
    const idempotencyKey = montarIdempotencyKeyPix({
      vendedorId: contextoAderido.idAderido,
      numerosRifas: dados.numerosRifas,
      documento: dados.documento,
      email: dados.email,
    });

    const pagamentoAtivo = await this.repository.obterPagamentoAtivoPorLock(idempotencyKey);
    if (pagamentoAtivo) {
      return construirRespostaPagamentoExistente(pagamentoAtivo);
    }

    await this.repository.verificarDisponibilidadeRifas(
      dados.numerosRifas,
      dados.sessaoCheckoutId,
      contextoAderido.idAderido,
    );

    const agora = new Date().toISOString();
    const expiraEm = dataExpiracaoPix();
    const valorBruto = calcularValorPixReais(dados.numerosRifas);
    const { comprador, pagamentoBase } = montarPayloadReservaCheckout({
      idempotencyKey,
      contextoAderido,
      dados,
      valorBruto,
      agora,
      expiraEm,
      provedorPagamento: this.tipo,
    });

    const { existente, compradorId, pagamentoId, referenceId } =
      await this.repository.reservarBilhetesAtomicamente({
        idempotencyKey,
        comprador,
        pagamentoBase,
        contextoAderido,
        dados,
        valorBruto,
        agora,
        expiraEm,
      });

    if (existente) {
      return construirRespostaPagamentoExistente(existente);
    }

    let orderId = "";
    let rawProvedor: unknown = null;

    try {
      const cobrancaCriada = await this.provider.criarCobranca({
        referenceId,
        nome: dados.nome,
        telefone: dados.telefone,
        email: dados.email,
        documento: dados.documento,
        numerosRifas: dados.numerosRifas,
        valorCentavos: calcularValorPixCentavos(dados.numerosRifas),
        expirationDate: expiraEm,
      });

      orderId = cobrancaCriada.orderId;
      rawProvedor = cobrancaCriada.rawResponse;

      if (!orderId) throw new Error("PROVEDOR_ORDER_INVALIDO");

      const qrCode = {
        id: orderId,
        copiaECola: cobrancaCriada.copiaECola,
        qrCodeImagemUrl: cobrancaCriada.qrCodeImagemUrl || null,
        qrCodeBase64: cobrancaCriada.qrCodeBase64 || null,
        expiraEm: cobrancaCriada.expiraEm || expiraEm,
      };

      await this.repository.persistirCobrancaGerada({
        pagamentoId,
        orderId,
        qrCode,
        expiraEmFallback: expiraEm,
        numerosRifas: dados.numerosRifas,
        provedorPagamento: this.tipo,
        rawProvedor,
      });

      return montarRespostaCheckoutPix({
        id: pagamentoId,
        status: "WAITING",
        qrCode,
        numerosRifas: dados.numerosRifas,
      });
    } catch (error) {
      if (!orderId) {
        await this.repository.compensarErroCriacao({
          pagamentoId,
          idempotencyKey,
          numerosRifas: dados.numerosRifas,
          referenceId,
          compradorId,
          error,
        });
      } else {
        await this.repository.registrarErroPosCriacao({
          pagamentoId,
          orderId,
          provedorPagamento: this.tipo,
          rawProvedor,
          error,
        });
      }

      throw error;
    }
  }

  /**
   * Cancela um checkout Pix pendente verificando autorização, eventual liquidação
   * externa prévia e liberando bilhetes no Firestore antes de invalidar no provedor.
   *
   * @param {CancelarCheckoutInput} params - Dados de autenticação e identificador do pagamento.
   * @param {PagamentoPix} [pagamentoPreCarregado] - Documento já carregado pelo orquestrador.
   * @returns {Promise<void>}
   * @throws {Error} `"UNAUTHORIZED"`, `"PAGAMENTO_NOT_FOUND"`, `"PAGAMENTO_JA_APROVADO"` ou `"STATUS_INVALIDO_CANCELAMENTO"`.
   */
  async cancelarCheckout(
    params: CancelarCheckoutInput,
    pagamentoPreCarregado?: PagamentoPix,
  ): Promise<void> {
    const { uid, email, role, pagamentoId, reterReserva = false } = params;

    if (!uid || !pagamentoId) {
      throw new Error("UNAUTHORIZED");
    }

    const pagamentoPreCheck =
      pagamentoPreCarregado ?? (await this.repository.buscarPagamentoPorId(pagamentoId));
    if (!pagamentoPreCheck) {
      throw new Error("PAGAMENTO_NOT_FOUND");
    }

    if (
      pagamentoPreCheck.pix_order_id &&
      ["WAITING", "pending", "CRIANDO"].includes(String(pagamentoPreCheck.status_pagamento_banco))
    ) {
      try {
        const eventoExterno = await this.consultarEventoExterno(pagamentoPreCheck);
        if (eventoExterno?.statusCanonico === "pago") {
          await this.repository.aplicarEventoPagamento(eventoExterno);
          throw new Error("PAGAMENTO_JA_APROVADO");
        }
      } catch (err: any) {
        if (err?.message === "PAGAMENTO_JA_APROVADO") throw err;
        console.warn(
          `[CancelarCheckout] Falha ao pre-checar provedor. Prosseguindo com cancelamento local. Erro: ${err?.message}`,
        );
      }
    }

    const resultado = await this.repository.cancelarPagamentoLocal({
      pagamentoId,
      motivo: "Cancelado pelo usuário.",
      erroCriacaoTexto: "Cancelado pelo usuário.",
      reterReserva,
      autorizar: async (pagamento) => {
        const autorizado = await verificarAutorizacaoCancelamentoCheckout({
          uid,
          email,
          role,
          pagamento,
        });
        if (!autorizado) {
          throw new Error("UNAUTHORIZED");
        }
      },
    });

    if (!resultado.jaCancelado && resultado.pagamento.pix_order_id) {
      try {
        await this.cancelarNoProvedorExterno(resultado.pagamento);
      } catch (error) {
        console.warn(
          `[CancelarCheckout] Erro ao cancelar no provedor (Order ${resultado.pagamento.pix_order_id}):`,
          error,
        );
      }
    }
  }

  /**
   * Processa a expiração automática (CRON) de um pagamento Pix vencido.
   * Sincroniza se já foi pago no provedor; caso contrário, libera os bilhetes e invalida no provedor.
   *
   * @param {string} pagamentoId - Identificador do pagamento em `pagamentos_pix`.
   * @param {PagamentoPix} pagamento - Dados atuais do documento.
   * @returns {Promise<void>}
   */
  async expirarCheckout(pagamentoId: string, pagamento: PagamentoPix): Promise<void> {
    if (pagamento.pix_order_id) {
      try {
        const eventoExterno = await this.consultarEventoExterno(pagamento);
        if (eventoExterno?.statusCanonico === "pago") {
          await this.repository.aplicarEventoPagamento(eventoExterno);
          return;
        }
      } catch (err: any) {
        console.warn(
          `[CRON] Falha ao consultar provedor para orderId ${pagamento.pix_order_id}: ${err?.message}. Prosseguindo com expiração.`,
        );
      }
    }

    const resultado = await this.repository.cancelarPagamentoLocal({
      pagamentoId,
      motivo: this.mensagemExpiracaoAutomatica(),
      erroCriacaoTexto: this.mensagemErroExpiracaoCron(),
      reterReserva: false,
      ignorarSeStatusInvalido: true,
    });

    if (!resultado.jaCancelado && !resultado.ignorado && pagamento.pix_order_id) {
      try {
        await this.cancelarNoProvedorExterno(pagamento);
      } catch (err: any) {
        console.warn(
          `[CRON] Falha ao cancelar Pedido Pix no provedor (orderId: ${pagamento.pix_order_id}). Erro:`,
          err?.message,
        );
      }
    }
  }

  /**
   * Sincroniza manualmente o estado de uma cobrança aberta com o provedor externo, se suportado.
   *
   * @param {PagamentoPix} pagamento - Registro do pagamento em aberto.
   * @returns {Promise<boolean>} `true` se houve sincronização aplicada; `false` se não aplicável ou sem resposta.
   */
  async sincronizarCheckout(pagamento: PagamentoPix): Promise<boolean> {
    const evento = await this.consultarEventoExterno(pagamento);
    if (!evento) {
      return false;
    }

    await this.repository.aplicarEventoPagamento(evento);
    return true;
  }

  /**
   * Confirma o envio manual de comprovante para cobranças que operam em modo Pix Normal/Offline.
   *
   * @param {ConfirmarEnvioCheckoutInput} params - Dados do solicitante, pagamento e comprovante.
   * @returns {Promise<ConfirmarEnvioCheckoutOutput>} Confirmação com lista de rifas atualizadas.
   * @throws {Error} `"UNAUTHORIZED"`, `"CONFIRMACAO_MANUAL_NAO_SUPORTADA"`, `"PAGAMENTO_NOT_FOUND"` ou `"TRANSACAO_JA_FINALIZADA"`.
   */
  async confirmarEnvioComprovante(
    params: ConfirmarEnvioCheckoutInput,
  ): Promise<ConfirmarEnvioCheckoutOutput> {
    const { uid, emailLogado, role, pagamentoId, comprovanteUrl, hashComprovante } = params;

    if (!uid || !emailLogado || !pagamentoId) {
      throw new Error("UNAUTHORIZED");
    }

    if (!this.permiteConfirmacaoManual()) {
      throw new Error("CONFIRMACAO_MANUAL_NAO_SUPORTADA");
    }

    if (!comprovanteUrl || !comprovanteUrl.trim()) {
      throw new Error("COMPROVANTE_OBRIGATORIO");
    }

    const contextoAderido = await obterContextoAderidoPorEmail(emailLogado);

    const resultado = await this.repository.registrarConfirmacaoEnvio({
      pagamentoId,
      comprovanteUrl,
      hashComprovante,
      autorizar: (pagamento) =>
        validarAutorizacaoConfirmacaoEnvio(pagamento, contextoAderido.idAderido, role),
    });

    if (resultado.compradorEmail) {
      try {
        await enviarEmailRecibo(
          resultado.compradorEmail,
          resultado.compradorNome || "Comprador",
          resultado.numerosRifas,
          "pendente",
        );
      } catch (erro) {
        console.warn("[ConfirmarEnvio] Falha ao disparar e-mail de recebimento:", erro);
      }
    }

    return {
      sucesso: true,
      pagamentoId,
      rifas: resultado.numerosRifas,
    };
  }
}
