/**
 * Filtro de igualdade retornado pelo parser de chaves de compras manuais da Tesouraria.
 */
export interface FiltroQueryManual {
  campo: string;
  valor: string;
}

/**
 * Identifica se uma chave de transação pertence ao fluxo manual/legado
 * (`comprovante-`, `comprador-`, `pixref-` ou `manual|`).
 *
 * @param {string} chave - Chave de agrupamento recebida pela API.
 * @returns {boolean} `true` quando deve ser tratada como compra manual.
 */
export function ehChaveManual(chave: string): boolean {
  return (
    chave.startsWith("comprovante-") ||
    chave.startsWith("comprador-") ||
    chave.startsWith("pixref-") ||
    chave.startsWith("manual|")
  );
}

/**
 * Converte uma chave de agrupamento de compra manual em filtros equivalentes do Firestore.
 *
 * @param {string} chave - Chave manual prefixada (`comprovante-`, `comprador-`, `pixref-` ou `manual|`).
 * @returns {FiltroQueryManual[]} Lista de cláusulas `where(campo, "==", valor)`.
 * @throws {Error} `"CANNOT_PARSE_MANUAL_KEY"` ou `"CHAVE_INVALIDA"`.
 */
export function resolverFiltrosChaveManual(chave: string): FiltroQueryManual[] {
  if (chave.startsWith("comprovante-")) {
    return [{ campo: "comprovante_url", valor: chave.replace("comprovante-", "") }];
  }

  if (chave.startsWith("comprador-")) {
    return [{ campo: "comprador_id", valor: chave.replace("comprador-", "") }];
  }

  if (chave.startsWith("pixref-")) {
    return [{ campo: "pix_reference_id", valor: chave.replace("pixref-", "") }];
  }

  if (chave.startsWith("manual|")) {
    const partes = chave.split("|");
    if (partes.length !== 4) {
      throw new Error("CANNOT_PARSE_MANUAL_KEY");
    }

    const filtros: FiltroQueryManual[] = [];
    if (partes[1] !== "sem-comprador") {
      filtros.push({ campo: "comprador_nome", valor: partes[1] });
    }
    if (partes[2] !== "sem-data") {
      filtros.push({ campo: "data_reserva", valor: partes[2] });
    }
    filtros.push({ campo: "status", valor: partes[3] });
    return filtros;
  }

  throw new Error("CHAVE_INVALIDA");
}

/**
 * Avalia se um documento de bilhete pertence legitimamente à ordem de pagamento Pix em validação.
 * Ignora bilhetes já devolvidos para `"disponivel"` e aceita correspondência legada por `pix_order_id`
 * quando `pix_reference_id` não estiver preenchido no bilhete.
 *
 * @param {any} bilhete - Dados do bilhete lido do Firestore.
 * @param {any} pagamento - Dados do documento pai em `pagamentos_pix`.
 * @param {string} pixOrderId - Identificador do pedido Pix em validação.
 * @returns {boolean} `true` se o bilhete pertence ao pagamento.
 */
export function bilhetePertenceAoPagamento(
  bilhete: any,
  pagamento: any,
  pixOrderId: string,
): boolean {
  if (!bilhete || bilhete.status === "disponivel") {
    return false;
  }

  if (bilhete.pix_order_id) {
    return bilhete.pix_order_id === pixOrderId;
  }

  if (pagamento.reference_id && bilhete.pix_reference_id) {
    return bilhete.pix_reference_id === pagamento.reference_id;
  }

  return true;
}

/**
 * Monta o payload padronizado de atualização de um bilhete aprovado pela Tesouraria.
 *
 * @param {object} params - Dados da aprovação e metadados do bilhete.
 * @returns {Record<string, unknown>} Objeto pronto para `transaction.set(..., { merge: true })`.
 */
export function montarPayloadBilheteAprovado(params: {
  valorBruto?: number | null;
  dataPagamento?: string | null;
  validadoEm: string;
  validadoPor: string;
}): Record<string, unknown> {
  return {
    status: "pago",
    status_validacao: "aceita",
    status_pagamento_banco: "PAID",
    valor_pago: Number(params.valorBruto || 10),
    validado_em: params.validadoEm,
    validado_por: params.validadoPor,
    motivo_recusa: null,
    data_pagamento: params.dataPagamento || params.validadoEm,
  };
}

/**
 * Monta o payload padronizado de atualização de um bilhete recusado pela Tesouraria.
 *
 * @param {object} params - Motivo da recusa e auditoria da validação.
 * @returns {Record<string, unknown>} Objeto pronto para `transaction.set(..., { merge: true })`.
 */
export function montarPayloadBilheteRecusado(params: {
  motivo: string;
  validadoEm: string;
  validadoPor: string;
  atualizarStatusBanco?: boolean;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    status: "recusado",
    status_validacao: "negada",
    motivo_recusa: params.motivo,
    validado_em: params.validadoEm,
    validado_por: params.validadoPor,
  };

  if (params.atualizarStatusBanco !== false) {
    payload.status_pagamento_banco = "DECLINED";
  }

  return payload;
}

/**
 * Monta o documento de notificação de correção de dados para o aderido após recusa na Tesouraria.
 *
 * @param {object} params - Identificação do vendedor, rifas afetadas e motivo.
 * @returns {Record<string, unknown>} Documento pronto para gravação na coleção `notificacoes`.
 */
export function montarNotificacaoCorrecaoDados(params: {
  vendedorId: string;
  titulo: string;
  mensagem: string;
  rifas: string[];
  dataCriacao: string;
}): Record<string, unknown> {
  return {
    vendedor_id: params.vendedorId,
    tipo: "correcao_dados",
    titulo: params.titulo,
    mensagem: params.mensagem,
    rifas: params.rifas,
    lida: false,
    data_criacao: params.dataCriacao,
  };
}
