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

export const FILTROS_AUDITORIA_COMPRAS_VAZIOS: AuditoriaComprasFiltros = {
  busca: "",
  status: "todas",
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
 * Aplica simultaneamente os filtros de status, intervalo de datas e busca textual sobre a listagem de compras auditáveis.
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
      compraPassaBusca(compra, filtros.busca)
    );
  });
}

/**
 * Computa as contagens e valores totais consolidados para os cards de resumo da auditoria.
 *
 * @param {TransacaoTesouraria[]} compras - Lista de compras auditadas.
 * @returns {ResumoAuditoriaCompras} Quantitativos e valor total em reais.
 */
export function calcularResumoAuditoria(
  compras: TransacaoTesouraria[],
): ResumoAuditoriaCompras {
  const totalRifas = compras.reduce(
    (acc, compra) => acc + compra.bilhetes.length,
    0,
  );
  const valorTotal = compras.reduce(
    (acc, compra) => acc + compra.valorTotal,
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

  return {
    totalCompras: compras.length,
    totalRifas,
    valorTotal,
    pagas,
    pendentes,
    recusadas,
  };
}

/**
 * Verifica se algum filtro além do padrão está ativo na tela de auditoria.
 *
 * @param {AuditoriaComprasFiltros} filtros - Filtros atuais da tela.
 * @returns {boolean} `true` se houver busca, data ou status diferente de "todas".
 */
export function filtrosAuditoriaAtivos(filtros: AuditoriaComprasFiltros): boolean {
  return Boolean(
    filtros.busca.trim() ||
      filtros.status !== "todas" ||
      filtros.dataInicio ||
      filtros.dataFim,
  );
}

/**
 * Converte a lista de transações de compras em formato CSV compatível com Excel brasileiro (delimitador ponto-e-vírgula).
 *
 * @param {TransacaoTesouraria[]} compras - Lista de compras a exportar.
 * @returns {string} Conteúdo em string CSV pronto para download.
 */
export function criarCsvAuditoriaCompras(compras: TransacaoTesouraria[]): string {
  const headers = [
    "Data Reserva",
    "Data Pagamento",
    "Status",
    "Rifas",
    "Qtd",
    "Valor Total (R$)",
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
    statusLabelAuditoria(compra.status),
    `"${compra.bilhetes.join(", ")}"`,
    compra.bilhetes.length,
    compra.valorTotal,
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
