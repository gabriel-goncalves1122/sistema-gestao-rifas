// ============================================================================
// ARQUIVO: frontend/src/features/tesouraria/utils/auditoriaComprasFiltrosUtils.ts
// ============================================================================
import { normalizarTexto, somenteNumeros } from "@/shared/utils/formatadores";
import {
  AuditoriaComprasFiltros,
  FiltroOrigemAuditoria,
  StatusAuditoriaCompras,
  TransacaoTesouraria,
} from "../types/auditoriaCompras";

/**
 * Opções de filtro rápido por status na barra de auditoria de compras.
 */
export const STATUS_FILTROS_AUDITORIA_COMPRAS: Array<{
  label: string;
  value: StatusAuditoriaCompras;
}> = [
  { label: "Todas", value: "todas" },
  { label: "Pagas", value: "pago" },
  { label: "Pendentes", value: "pendente" },
  { label: "Recusadas", value: "recusado" },
];

/**
 * Opções de filtro rápido por canal de pagamento na barra de auditoria de compras.
 */
export const ORIGEM_FILTROS_AUDITORIA_COMPRAS: Array<{
  label: string;
  value: FiltroOrigemAuditoria;
}> = [
  { label: "Todas", value: "TODAS" },
  { label: "Pix", value: "PIX" },
  { label: "Comprovante", value: "COMPROVANTE" },
];

/**
 * Estado inicial padrão dos filtros da auditoria de compras.
 */
export const FILTROS_AUDITORIA_COMPRAS_VAZIOS: AuditoriaComprasFiltros = {
  busca: "",
  status: "todas",
  origem: "TODAS",
  somenteCorrecaoPendente: false,
  dataInicio: "",
  dataFim: "",
};

/**
 * Converte uma data em string ISO ou timestamp para o formato aceito por inputs HTML5 (`YYYY-MM-DD`).
 *
 * @param {string | null} [data] - String da data original.
 * @returns {string} String no formato 'YYYY-MM-DD' ou vazio se inválida.
 */
export function dataParaInputAuditoria(data?: string | null): string {
  if (!data || data === "-") return "";

  const dataConvertida = new Date(data);

  if (Number.isNaN(dataConvertida.getTime())) return "";

  return dataConvertida.toISOString().slice(0, 10);
}

/**
 * Retorna o rótulo legível em português correspondente ao status da compra.
 *
 * @param {string} status - Chave do status ('pago', 'pendente', 'recusado', 'disponivel').
 * @returns {string} Rótulo formatado para exibição.
 */
export function statusLabelAuditoria(status: string): string {
  const labels: Record<string, string> = {
    pago: "Pago",
    pendente: "Pendente",
    recusado: "Recusado",
    disponivel: "Disponível",
  };

  return labels[normalizarTexto(status)] || status || "N/A";
}

/**
 * Retorna o rótulo legível para o canal de origem do pagamento.
 *
 * @param {string} [origem] - Chave da origem ('PIX', 'COMPROVANTE').
 * @returns {string} 'Pix' ou 'Comprovante'.
 */
export function origemLabelAuditoria(origem?: string): string {
  const normalizada = String(origem || "").toUpperCase();
  if (normalizada === "PIX") return "Pix";
  return "Comprovante";
}

/**
 * Avalia se a data de reserva de uma compra está dentro do período selecionado (dataInicio e dataFim).
 *
 * @param {TransacaoTesouraria} compra - Transação de compra avaliada.
 * @param {string} dataInicio - Data inicial no formato 'YYYY-MM-DD'.
 * @param {string} dataFim - Data final no formato 'YYYY-MM-DD'.
 * @returns {boolean} `true` se estiver dentro do intervalo.
 */
function compraPassaPeriodo(
  compra: TransacaoTesouraria,
  dataInicio: string,
  dataFim: string,
): boolean {
  const dataCompra = dataParaInputAuditoria(compra.dataReserva);

  if (!dataCompra) return !dataInicio && !dataFim;
  if (dataInicio && dataCompra < dataInicio) return false;
  if (dataFim && dataCompra > dataFim) return false;

  return true;
}

/**
 * Avalia se o canal de origem da compra coincide com o filtro selecionado.
 *
 * @param {TransacaoTesouraria} compra - Transação de compra.
 * @param {FiltroOrigemAuditoria} [origemFiltro] - Filtro de canal ('TODAS', 'PIX', 'COMPROVANTE').
 * @returns {boolean} `true` se atender ao filtro.
 */
function compraPassaOrigem(
  compra: TransacaoTesouraria,
  origemFiltro?: FiltroOrigemAuditoria,
): boolean {
  if (!origemFiltro || origemFiltro === "TODAS") return true;
  const origemCompra = (compra.origem || "COMPROVANTE").toUpperCase();
  return origemCompra === origemFiltro;
}

/**
 * Avalia se o filtro de correção cadastral pendente é satisfeito.
 *
 * @param {TransacaoTesouraria} compra - Transação de compra.
 * @param {boolean} [somenteCorrecao] - Flag de filtro ativo.
 * @returns {boolean} `true` se passar pelo filtro.
 */
function compraPassaCorrecaoPendente(
  compra: TransacaoTesouraria,
  somenteCorrecao?: boolean,
): boolean {
  if (!somenteCorrecao) return true;
  return Boolean(compra.correcaoPendente);
}

/**
 * Verifica se a compra possui algum bilhete cujo número coincide exatamente com o termo numérico buscado.
 *
 * @param {TransacaoTesouraria} compra - Transação de compra avaliada.
 * @param {string} termoNumerico - Dígitos extraídos da busca.
 * @returns {boolean} `true` se houver correspondência exata do número da rifa (ex: '42' === '042').
 */
function compraPossuiBilheteExato(
  compra: TransacaoTesouraria,
  termoNumerico: string,
): boolean {
  if (!termoNumerico) return false;
  const numeroBuscado = Number(termoNumerico);

  return compra.bilhetes.some((bilhete) => {
    const digitosBilhete = somenteNumeros(bilhete);
    if (!digitosBilhete) return false;
    return (
      digitosBilhete === termoNumerico ||
      (!Number.isNaN(numeroBuscado) && Number(digitosBilhete) === numeroBuscado)
    );
  });
}

/**
 * Avalia se os dados da compra atendem ao termo de busca restrito exclusivamente
 * ao nome do comprador (`compradorNome`) ou número da rifa (`bilhetes`).
 *
 * @param {TransacaoTesouraria} compra - Transação de compra.
 * @param {string} busca - Termo digitado na caixa de busca.
 * @returns {boolean} `true` se corresponder ao nome do comprador ou a um bilhete da compra.
 */
function compraPassaBusca(compra: TransacaoTesouraria, busca: string): boolean {
  const termo = normalizarTexto(busca);
  const termoNumerico = somenteNumeros(busca);

  if (!termo && !termoNumerico) return true;

  const nomeCompradorNormalizado = normalizarTexto(compra.compradorNome);
  const passaNomeComprador =
    termo.length > 0 && nomeCompradorNormalizado.includes(termo);

  if (passaNomeComprador) return true;

  if (termoNumerico.length > 0) {
    const numeroBuscado = Number(termoNumerico);
    return compra.bilhetes.some((bilhete) => {
      const digitosBilhete = somenteNumeros(bilhete);
      if (!digitosBilhete) return false;
      return (
        digitosBilhete.includes(termoNumerico) ||
        (!Number.isNaN(numeroBuscado) && Number(digitosBilhete) === numeroBuscado)
      );
    });
  }

  return false;
}

/**
 * Aplica simultaneamente os filtros de status, origem, pendência de correção, datas e busca textual.
 * Quando há busca numérica por rifa, prioriza no topo a compra com correspondência exata do bilhete.
 *
 * @param {TransacaoTesouraria[]} compras - Lista de transações da tesouraria.
 * @param {AuditoriaComprasFiltros} filtros - Conjunto de filtros ativos.
 * @returns {TransacaoTesouraria[]} Compras que satisfazem todos os filtros.
 */
export function filtrarComprasAuditaveis(
  compras: TransacaoTesouraria[],
  filtros: AuditoriaComprasFiltros,
): TransacaoTesouraria[] {
  const filtradas = compras.filter((compra) => {
    const statusValido =
      filtros.status === "todas" ||
      normalizarTexto(compra.status) === filtros.status;

    return (
      statusValido &&
      compraPassaPeriodo(compra, filtros.dataInicio, filtros.dataFim) &&
      compraPassaOrigem(compra, filtros.origem) &&
      compraPassaCorrecaoPendente(compra, filtros.somenteCorrecaoPendente) &&
      compraPassaBusca(compra, filtros.busca)
    );
  });

  const termoNumerico = somenteNumeros(filtros.busca);
  if (termoNumerico.length > 0 && filtradas.length > 1) {
    return [...filtradas].sort((a, b) => {
      const aExato = compraPossuiBilheteExato(a, termoNumerico) ? 1 : 0;
      const bExato = compraPossuiBilheteExato(b, termoNumerico) ? 1 : 0;
      return bExato - aExato;
    });
  }

  return filtradas;
}

/**
 * Verifica se algum filtro além do padrão está ativo na tela de auditoria.
 *
 * @param {AuditoriaComprasFiltros} filtros - Filtros atuais da tela.
 * @returns {boolean} `true` se houver busca, data, canal, correção ou status diferente de "todas".
 */
export function filtrosAuditoriaAtivos(filtros: AuditoriaComprasFiltros): boolean {
  return Boolean(
    filtros.busca.trim() ||
      filtros.status !== "todas" ||
      (filtros.origem && filtros.origem !== "TODAS") ||
      Boolean(filtros.somenteCorrecaoPendente) ||
      filtros.dataInicio ||
      filtros.dataFim,
  );
}
