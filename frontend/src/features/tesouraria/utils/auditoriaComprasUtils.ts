import {
  formatarDataCurta as formatarDataAuditoria,
  formatarMoeda as formatarMoedaAuditoria,
  somenteNumeros,
} from "./formatadores";
import {
  TransacaoTesouraria,
  AuditoriaComprasFiltros,
  ResumoAuditoriaCompras,
  StatusAuditoriaCompras,
  FiltroOrigemAuditoria,
} from "../types/auditoriaCompras";
import { colors } from "@/shared/tokens/colors";

export { formatarDataAuditoria, formatarMoedaAuditoria };

export const STATUS_FILTROS_AUDITORIA_COMPRAS: Array<{
  label: string;
  value: StatusAuditoriaCompras;
}> = [
  { label: "Todas", value: "todas" },
  { label: "Pagas", value: "pago" },
  { label: "Pendentes", value: "pendente" },
  { label: "Recusadas", value: "recusado" },
];

export const ORIGEM_FILTROS_AUDITORIA_COMPRAS: Array<{
  label: string;
  value: FiltroOrigemAuditoria;
}> = [
  { label: "Todas", value: "TODAS" },
  { label: "Pix", value: "PIX" },
  { label: "Comprovante", value: "COMPROVANTE" },
];

export const FILTROS_AUDITORIA_COMPRAS_VAZIOS: AuditoriaComprasFiltros = {
  busca: "",
  status: "todas",
  origem: "TODAS",
  somenteCorrecaoPendente: false,
  dataInicio: "",
  dataFim: "",
};

/**
 * Normaliza uma string removendo acentuação gráfica (diacríticos) e convertendo para minúsculas.
 *
 * @param {string | null} [valor] - Texto de entrada.
 * @returns {string} Texto sem acentos e em minúsculas.
 */
export function normalizarTexto(valor?: string | null): string {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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
 * Retorna o objeto de estilo MUI `sx` (cores de texto, fundo e borda) correspondente ao status da compra.
 *
 * @param {string} status - Status da compra.
 * @returns {Object} Objeto de estilização compatível com a prop `sx` do MUI.
 */
export function statusSxAuditoria(status: string) {
  const statusNormalizado = normalizarTexto(status);

  if (statusNormalizado === "pago") {
    return {
      color: colors.branco,
      bgcolor: colors.verdeEscuro,
      border: `1px solid ${colors.verdeEscuro}`,
    };
  }

  if (statusNormalizado === "pendente") {
    return {
      color: colors.amareloEscuro,
      bgcolor: colors.amareloClaro,
      border: "1px solid rgba(107, 78, 0, 0.25)",
    };
  }

  if (statusNormalizado === "recusado") {
    return {
      color: colors.vermelho,
      bgcolor: colors.vermelhoClaro,
      border: "1px solid rgba(122, 31, 31, 0.22)",
    };
  }

  return {
    color: colors.cinzaTexto,
    bgcolor: colors.fundoSuave,
    border: "1px solid rgba(2, 27, 22, 0.10)",
  };
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
 * Retorna os estilos visuais MUI `sx` para identificação rápida do canal de pagamento.
 *
 * @param {string} [origem] - Canal da transação ('PIX' ou 'COMPROVANTE').
 * @returns {Object} Configuração sx com cores e bordas temáticas.
 */
export function origemSxAuditoria(origem?: string) {
  const normalizada = String(origem || "").toUpperCase();
  if (normalizada === "PIX") {
    return {
      bgcolor: "rgba(10, 110, 89, 0.12)",
      color: colors.verdeEscuro,
      border: "1px solid rgba(10, 110, 89, 0.28)",
      fontWeight: 800,
    };
  }
  return {
    bgcolor: "rgba(107, 78, 0, 0.10)",
    color: colors.amareloEscuro,
    border: "1px solid rgba(107, 78, 0, 0.22)",
    fontWeight: 800,
  };
}

/**
 * Retorna os estilos MUI `sx` para a tag de alerta quando houver correção cadastral pendente.
 *
 * @returns {Object} Objeto sx com paleta de aviso âmbar.
 */
export function correcaoPendenteSxAuditoria() {
  return {
    bgcolor: "rgba(194, 65, 12, 0.12)",
    color: "#C2410C",
    border: "1px solid rgba(194, 65, 12, 0.3)",
    fontWeight: 850,
  };
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
 * Avalia se os dados da compra atendem ao termo de busca textual nos campos cadastrais e bilhetes.
 *
 * @param {TransacaoTesouraria} compra - Transação de compra.
 * @param {string} busca - Termo digitado na caixa de busca.
 * @returns {boolean} `true` se corresponder a algum campo.
 */
function compraPassaBusca(compra: TransacaoTesouraria, busca: string): boolean {
  const termo = normalizarTexto(busca);
  const termoNumerico = somenteNumeros(busca);

  if (!termo && !termoNumerico) return true;

  const campos = [
    compra.compradorNome,
    compra.compradorEmail,
    compra.compradorTelefone,
    compra.compradorId || "",
    compra.vendedorNome,
    compra.vendedorCpf,
    compra.vendedorId || "",
    compra.status,
    compra.pixOrderId || "",
    formatarDataAuditoria(compra.dataReserva),
    compra.bilhetes.join(" "),
  ];

  return campos.some((campo) => {
    const texto = normalizarTexto(campo);
    const numerico = somenteNumeros(campo);

    return (
      texto.includes(termo) ||
      (termoNumerico.length > 0 && numerico.includes(termoNumerico))
    );
  });
}

/**
 * Aplica simultaneamente os filtros de status, origem, pendência de correção, datas e busca textual.
 *
 * @param {TransacaoTesouraria[]} compras - Lista de transações da tesouraria.
 * @param {AuditoriaComprasFiltros} filtros - Conjunto de filtros ativos.
 * @returns {TransacaoTesouraria[]} Compras que satisfazem todos os filtros.
 */
export function filtrarComprasAuditaveis(
  compras: TransacaoTesouraria[],
  filtros: AuditoriaComprasFiltros,
): TransacaoTesouraria[] {
  return compras.filter((compra) => {
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
}

/**
 * Computa as contagens e valores consolidados (brutos e líquidos) para os cards de resumo da auditoria.
 *
 * @param {TransacaoTesouraria[]} compras - Lista de compras auditadas.
 * @returns {ResumoAuditoriaCompras} Quantitativos e totais financeiros.
 */
export function calcularResumoAuditoria(
  compras: TransacaoTesouraria[],
): ResumoAuditoriaCompras {
  const totalRifas = compras.reduce(
    (acc, compra) => acc + compra.bilhetes.length,
    0,
  );
  const valorTotal = compras.reduce(
    (acc, compra) => acc + (compra.valorTotal || 0),
    0,
  );
  const valorLiquido = compras.reduce(
    (acc, compra) => acc + (compra.valorLiquido ?? compra.valorTotal ?? 0),
    0,
  );
  const pagas = compras.filter(
    (compra) => normalizarTexto(compra.status) === "pago",
  ).length;
  const pendentes = compras.filter(
    (compra) => normalizarTexto(compra.status) === "pendente",
  ).length;
  const recusadas = compras.filter(
    (compra) => normalizarTexto(compra.status) === "recusado",
  ).length;

  const comprasPix = compras.filter(
    (compra) => (compra.origem || "").toUpperCase() === "PIX",
  ).length;
  const comprasComprovante = compras.length - comprasPix;

  return {
    totalCompras: compras.length,
    totalRifas,
    valorTotal,
    valorLiquido,
    comprasPix,
    comprasComprovante,
    pagas,
    pendentes,
    recusadas,
  };
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

/**
 * Converte a lista de transações de compras em formato CSV compatível com Excel (delimitador ponto-e-vírgula).
 * Inclui canal de origem, valores bruto e líquido, status bancário e pendência de correção.
 *
 * @param {TransacaoTesouraria[]} compras - Lista de compras a exportar.
 * @returns {string} Conteúdo em string CSV pronto para download.
 */
export function criarCsvAuditoriaCompras(compras: TransacaoTesouraria[]): string {
  const headers = [
    "Data Reserva",
    "Data Pagamento",
    "Origem",
    "Status",
    "Rifas",
    "Qtd",
    "Valor Bruto (R$)",
    "Valor Líquido (R$)",
    "Status Banco",
    "Correção Pendente",
    "Vendedor",
    "CPF Vendedor",
    "Comprador",
    "Email Comprador",
    "Telefone Comprador",
    "Comprovante",
  ];
  const linhas = compras.map((compra) => [
    formatarDataAuditoria(compra.dataReserva),
    formatarDataAuditoria(compra.dataPagamento),
    origemLabelAuditoria(compra.origem),
    statusLabelAuditoria(compra.status),
    `"${compra.bilhetes.join(", ")}"`,
    compra.bilhetes.length,
    compra.valorTotal,
    compra.valorLiquido ?? compra.valorTotal,
    compra.statusPagamentoBanco || "-",
    compra.correcaoPendente ? "Sim" : "Não",
    `"${compra.vendedorNome}"`,
    `"${compra.vendedorCpf}"`,
    `"${compra.compradorNome}"`,
    `"${compra.compradorEmail}"`,
    `"${compra.compradorTelefone}"`,
    compra.comprovanteUrl ? "Sim" : "Não",
  ]);

  return [headers.join(";"), ...linhas.map((linha) => linha.join(";"))].join(
    "\n",
  );
}
