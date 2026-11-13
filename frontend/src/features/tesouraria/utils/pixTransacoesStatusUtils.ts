// ============================================================================
// ARQUIVO: frontend/src/features/tesouraria/utils/pixTransacoesStatusUtils.ts
// ============================================================================
import {
  PixTransacao,
  StatusPagamentoPix,
  StatusValidacaoUI,
} from "../types/pixTransacoes";

/**
 * Rótulos legíveis em português para cada status bancário retornado pelo gateway Pix.
 */
const LABELS_STATUS_PAGAMENTO_PIX: Record<StatusPagamentoPix, string> = {
  WAITING: "Aguardando",
  PAID: "Pago",
  AUTHORIZED: "Autorizado",
  IN_ANALYSIS: "Em análise",
  DECLINED: "Negado",
  CANCELED: "Cancelado",
  ERROR: "Erro",
};

/**
 * Verifica se a transação Pix possui ao menos um bilhete de rifa associado.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {boolean} `true` se contiver bilhetes vinculados.
 */
export function pixTransacaoTemRifas(transacao: PixTransacao): boolean {
  return Boolean(transacao.rifas && transacao.rifas.length > 0);
}

/**
 * Avalia se o pagamento da transação foi confirmado/liquidado pelo banco ou gateway ('PAID' ou 'AUTHORIZED').
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {boolean} `true` se liquidado pelo gateway bancário.
 */
export function pixPagamentoConfirmadoBanco(transacao: PixTransacao): boolean {
  return ["PAID", "AUTHORIZED"].includes(transacao.statusPagamento);
}

/**
 * Determina o status visual de validação da transação para exibição de Badges/Pills na interface da Tesouraria.
 * - 'sem_confirmacao_bancaria': banco ainda não liquidou e não há comprovante para análise;
 * - 'aceita' / 'negada': decisão final já proferida pela tesouraria ou bilhetes liquidados;
 * - 'pendente_validacao': liquidado no banco, em análise ou comprovante aguardando conferência da tesouraria.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {StatusValidacaoUI} Estado visual para a interface.
 */
export function obterStatusValidacaoPix(transacao: PixTransacao): StatusValidacaoUI {
  if (transacao.statusValidacao) {
    return transacao.statusValidacao;
  }

  if (transacao.rifas && transacao.rifas.length > 0) {
    if (transacao.rifas.every((r) => r.status === "pago")) {
      return "aceita";
    }
    if (transacao.rifas.every((r) => r.status === "recusado")) {
      return "negada";
    }
  }

  if (
    transacao.origem === "COMPROVANTE" ||
    Boolean(transacao.comprovanteUrl) ||
    transacao.statusPagamento === "IN_ANALYSIS" ||
    pixPagamentoConfirmadoBanco(transacao)
  ) {
    return "pendente_validacao";
  }

  return "sem_confirmacao_bancaria";
}

/**
 * Determina se a tesouraria pode realizar ações de aprovação ou recusa manual sobre a transação.
 * Válido para qualquer transação pendente de validação (Pix confirmados/em análise ou Comprovantes).
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {boolean} `true` se os botões de ação devem ser habilitados.
 */
export function podeValidarPixTransacao(transacao: PixTransacao): boolean {
  return obterStatusValidacaoPix(transacao) === "pendente_validacao";
}

/**
 * Converte a chave enum do status bancário em rótulo em português para renderização na UI.
 *
 * @param {StatusPagamentoPix} status - Status bruto da transação.
 * @returns {string} Rótulo amigável (ex: 'Aguardando', 'Pago', 'Em análise').
 */
export function obterLabelStatusPagamento(status: StatusPagamentoPix): string {
  return LABELS_STATUS_PAGAMENTO_PIX[status] || status;
}
