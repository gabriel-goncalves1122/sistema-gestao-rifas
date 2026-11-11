/**
 * Extrai uma mensagem legível a partir de qualquer valor capturado em blocos `catch (erro: unknown)`.
 *
 * @param {unknown} erro - Erro capturado em bloco `try/catch`.
 * @param {string} [fallback="Ocorreu um erro inesperado."] - Mensagem padrão caso nenhuma descrição útil seja encontrada.
 * @returns {string} Mensagem amigável ou técnica segura para exibição/log.
 */
export function extrairMensagemErro(
  erro: unknown,
  fallback = "Ocorreu um erro inesperado.",
): string {
  if (erro instanceof Error && erro.message.trim()) {
    return erro.message;
  }

  if (typeof erro === "string" && erro.trim()) {
    return erro;
  }

  if (erro && typeof erro === "object" && "message" in erro) {
    const msg = (erro as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) {
      return msg;
    }
  }

  return fallback;
}
