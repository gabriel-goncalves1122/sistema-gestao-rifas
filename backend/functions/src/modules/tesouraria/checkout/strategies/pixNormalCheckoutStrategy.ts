// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/checkout/strategies/pixNormalCheckoutStrategy.ts
// ============================================================================

import { PagamentoPix } from "../../../types/models";
import { CheckoutPixDadosNormalizados } from "../../helpers/checkoutPixHelper";
import { EmvOfflinePaymentProvider } from "../../../../shared/payments/providers/emvOfflinePaymentProvider";
import {
  EventoStatusPagamento,
  IPaymentProvider,
  ModoProvedorPagamento,
} from "../../../../shared/payments/types/paymentProviderTypes";
import { CheckoutPixRepository } from "../repositories/checkoutPixRepository";
import { BaseCheckoutStrategy } from "./baseCheckoutStrategy";

/**
 * Estratégia OO dedicada ao fluxo de Pix Normal / EMV Offline (`EMV_OFFLINE`).
 * Gera BR Code Copia-e-Cola e QR Code localmente sem exigir CPF/e-mail ou chamadas
 * a gateways externos, habilitando a confirmação manual de envio de comprovante
 * e realizando cancelamentos/expirações 100% locais no Firestore.
 */
export class PixNormalCheckoutStrategy extends BaseCheckoutStrategy {
  readonly tipo: ModoProvedorPagamento = "EMV_OFFLINE";

  constructor(
    repository: CheckoutPixRepository = new CheckoutPixRepository(),
    provider: IPaymentProvider = new EmvOfflinePaymentProvider(),
  ) {
    super(repository, provider);
  }

  /**
   * No Pix Normal / EMV Offline, CPF/CNPJ e e-mail são opcionais.
   *
   * @param {CheckoutPixDadosNormalizados} _dados - Dados normalizados do comprador.
   */
  protected validarDadosEspecificos(_dados: CheckoutPixDadosNormalizados): void {
    // Sem exigências extras além de nome, telefone e números das rifas
  }

  /**
   * O modo Pix Normal / EMV Offline não consulta gateway externo.
   *
   * @param {PagamentoPix} _pagamento - Registro do pagamento local.
   * @returns {Promise<null>} Sempre `null`.
   */
  protected async consultarEventoExterno(
    _pagamento: PagamentoPix,
  ): Promise<EventoStatusPagamento | null> {
    return null;
  }

  /**
   * No modo Pix Normal / EMV Offline não há cobrança externa para invalidar.
   *
   * @param {PagamentoPix} _pagamento - Registro do pagamento cancelado localmente.
   * @returns {Promise<void>}
   */
  protected async cancelarNoProvedorExterno(_pagamento: PagamentoPix): Promise<void> {
    // No-op: cancelamento gerenciado integralmente no Firestore
  }

  /**
   * O modo Pix Normal aceita confirmação manual de pagamento com vínculo de comprovante.
   *
   * @returns {boolean} Sempre `true`.
   */
  protected permiteConfirmacaoManual(): boolean {
    return true;
  }

  protected mensagemExpiracaoAutomatica(): string {
    return "Pagamento offline expirado por inatividade.";
  }

  protected mensagemErroExpiracaoCron(): string {
    return "Expirado automaticamente (CRON Offline).";
  }
}
