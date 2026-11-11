/**
 * Gera e dispara o download de um arquivo CSV com BOM UTF-8 no navegador,
 * revogando a Object URL logo após o clique para evitar vazamento de memória.
 *
 * @param {string} conteudoCsv - Conteúdo textual em formato CSV (sem BOM).
 * @param {string} nomeArquivo - Nome sugerido para o arquivo baixado (ex: `relatorio.csv`).
 * @sideEffects Cria e remove um elemento `<a>` temporário no DOM e aloca/revoga URL de Blob.
 */
export function baixarCsv(conteudoCsv: string, nomeArquivo: string): void {
  const blob = new Blob(["\uFEFF" + conteudoCsv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

/**
 * Copia um texto para a área de transferência utilizando a Clipboard API com fallback DOM
 * (`document.execCommand("copy")`) para maior compatibilidade em navegadores móveis.
 *
 * @param {string} texto - Conteúdo textual a ser copiado.
 * @returns {boolean} `true` se a cópia foi iniciada com sucesso por um dos mecanismos.
 * @sideEffects Acessa `navigator.clipboard` ou manipula temporariamente a seleção no DOM.
 */
export function copiarTextoParaAreaTransferencia(texto: string): boolean {
  if (!texto) return false;

  let copiouViaClipboardApi = false;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    copiouViaClipboardApi = true;
    navigator.clipboard.writeText(texto).catch(() => {});
  }

  if (typeof document === "undefined") {
    return copiouViaClipboardApi;
  }

  const span = document.createElement("span");
  span.textContent = texto;
  span.style.whiteSpace = "pre";
  span.style.webkitUserSelect = "auto";
  span.style.userSelect = "all";
  span.style.position = "absolute";
  span.style.left = "-9999px";
  document.body.appendChild(span);

  const selection = window.getSelection();
  const range = document.createRange();
  let copiouViaExecCommand = false;

  if (selection) {
    selection.removeAllRanges();
    range.selectNode(span);
    selection.addRange(range);
    try {
      copiouViaExecCommand = document.execCommand("copy");
    } catch {
      copiouViaExecCommand = false;
    } finally {
      selection.removeAllRanges();
    }
  }

  document.body.removeChild(span);
  return copiouViaExecCommand || copiouViaClipboardApi;
}
