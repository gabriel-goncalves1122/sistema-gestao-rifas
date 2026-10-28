// ============================================================================
// TRATAMENTO DE ERROS DO PIX
//
// Funcoes para normalizar mensagens de erro do fluxo de checkout Pix
// antes de exibir ao usuario.
// ============================================================================

/**
 * Converte erros brutos ou códigos de erro do backend de Checkout Pix em mensagens
 * claras e acionáveis para o usuário final.
 *
 * @param {unknown} error - Instância de erro capturada na chamada de API.
 * @returns {string} Mensagem amigável para exibição no alerta do modal.
 */
export function obterMensagemErroPix(error: unknown): string {
  const mensagem = error instanceof Error ? error.message : "";

  if (/404|not found|não encontrado|nao encontrado/i.test(mensagem)) {
    return "Pagamento via Pix indisponivel no momento. O backend ainda nao respondeu a este contrato.";
  }

  if (/MERCADOPAGO_DOCUMENTO_INVALIDO|cpf ou cnpj informado/i.test(mensagem)) {
    return "O CPF ou CNPJ informado é inválido. Verifique os números digitados.";
  }

  if (/MERCADOPAGO_EMAIL_INVALIDO|e-mail do comprador foi recusado/i.test(mensagem)) {
    return "O e-mail do comprador foi recusado pelo banco. Verifique se foi digitado corretamente.";
  }

  if (/MERCADOPAGO_DADOS_PAGADOR_INVALIDOS|dados do comprador foram recusados/i.test(mensagem)) {
    return "Os dados do comprador foram recusados pelo banco (verifique CPF, e-mail e nome).";
  }

  return mensagem || "Nao foi possivel gerar o pagamento via Pix agora.";
}
