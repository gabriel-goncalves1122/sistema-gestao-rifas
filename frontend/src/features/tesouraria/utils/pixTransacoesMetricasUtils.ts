// ============================================================================
// ARQUIVO: frontend/src/features/tesouraria/utils/pixTransacoesMetricasUtils.ts
// ============================================================================
import {
  PixTransacao,
  PixTransacoesResumo,
  PixTransacoesSerieTemporal,
} from "../types/pixTransacoes";

/**
 * Estado inicial zerado para o resumo consolidado de transações Pix e comprovantes da Tesouraria.
 */
export const RESUMO_PIX_TRANSACOES_VAZIO: PixTransacoesResumo = {
  totalRecebido: 0,
  totalPendente: 0,
  totalCancelado: 0,
  totalErros: 0,
  quantidadePagas: 0,
  quantidadeAguardando: 0,
  quantidadeCanceladas: 0,
  quantidadeErros: 0,
  totalTransacoes: 0,
  ticketMedio: 0,

  // 1. Indicadores Pix (Gateway)
  pixRifasPagas: 0,
  pixRecebidoBruto: 0,
  pixRecebidoLiquido: 0,
  pixTransacoesAguardando: 0,
  pixRifasAguardando: 0,
  pixValorAguardandoBruto: 0,
  pixValorAguardandoLiquido: 0,

  // 2. Indicadores Comprovantes Manuais
  comprovantesTransacoesPagas: 0,
  comprovantesRifasPagas: 0,
  comprovantesValorRecebido: 0,
  comprovantesTransacoesPendentes: 0,
  comprovantesRifasPendentes: 0,
  comprovantesValorPendente: 0,

  // 3. Indicadores Total Geral Consolidado
  totalGeralTransacoesPagas: 0,
  totalGeralRifasPagas: 0,
  totalGeralRecebidoBruto: 0,
  totalGeralRecebidoLiquido: 0,
  totalGeralTransacoesPendentes: 0,
  totalGeralRifasPendentes: 0,
  totalGeralValorPendenteBruto: 0,
};

/**
 * Estrutura normalizada de indicadores consolidados por canal (Pix, Comprovantes e Total Geral).
 */
export interface IndicadoresConsolidadosTesouraria {
  pix: {
    rifasPagas: number;
    recebidoBruto: number;
    recebidoLiquido: number;
    transacoesAguardando: number;
    rifasAguardando: number;
    valorAguardandoBruto: number;
    valorAguardandoLiquido: number;
  };
  comprovantes: {
    transacoesPagas: number;
    rifasPagas: number;
    valorRecebido: number;
    transacoesPendentes: number;
    rifasPendentes: number;
    valorPendente: number;
  };
  totalGeral: {
    transacoesPagas: number;
    rifasPagas: number;
    recebidoBruto: number;
    recebidoLiquido: number;
    transacoesPendentes: number;
    rifasPendentes: number;
    valorPendenteBruto: number;
  };
}

/**
 * Extrai e estrutura os indicadores consolidados (Pix, Comprovantes e Total Geral)
 * com fallbacks seguros a zero para consumo pelos componentes de visualização da Tesouraria.
 *
 * @param {PixTransacoesResumo} resumo - Objeto de resumo retornado pela API ou calculado localmente.
 * @returns {IndicadoresConsolidadosTesouraria} Indicadores agrupados por fonte e totalizadores.
 */
export function obterIndicadoresConsolidados(
  resumo: PixTransacoesResumo,
): IndicadoresConsolidadosTesouraria {
  const pixRecebidoLiquido = resumo.pixRecebidoLiquido ?? resumo.totalRecebido ?? 0;
  const pixRecebidoBruto = resumo.pixRecebidoBruto ?? pixRecebidoLiquido;
  const pixValorAguardandoBruto =
    resumo.pixValorAguardandoBruto ?? resumo.totalPendente ?? 0;
  const pixValorAguardandoLiquido =
    resumo.pixValorAguardandoLiquido ?? pixValorAguardandoBruto;

  const comprovantesTransacoesPagas = resumo.comprovantesTransacoesPagas ?? 0;
  const comprovantesRifasPagas = resumo.comprovantesRifasPagas ?? 0;
  const comprovantesValorRecebido = resumo.comprovantesValorRecebido ?? 0;
  const comprovantesTransacoesPendentes = resumo.comprovantesTransacoesPendentes ?? 0;
  const comprovantesRifasPendentes = resumo.comprovantesRifasPendentes ?? 0;
  const comprovantesValorPendente = resumo.comprovantesValorPendente ?? 0;

  const totalGeralTransacoesPagas =
    resumo.totalGeralTransacoesPagas ??
    resumo.quantidadePagas + comprovantesTransacoesPagas;
  const totalGeralRifasPagas =
    resumo.totalGeralRifasPagas ??
    (resumo.pixRifasPagas ?? 0) + comprovantesRifasPagas;
  const totalGeralRecebidoBruto =
    resumo.totalGeralRecebidoBruto ??
    pixRecebidoBruto + comprovantesValorRecebido;
  const totalGeralRecebidoLiquido =
    resumo.totalGeralRecebidoLiquido ??
    Number((pixRecebidoLiquido + comprovantesValorRecebido).toFixed(2));
  const totalGeralTransacoesPendentes =
    resumo.totalGeralTransacoesPendentes ??
    resumo.quantidadeAguardando + comprovantesTransacoesPendentes;
  const totalGeralRifasPendentes =
    resumo.totalGeralRifasPendentes ??
    (resumo.pixRifasAguardando ?? 0) + comprovantesRifasPendentes;
  const totalGeralValorPendenteBruto =
    resumo.totalGeralValorPendenteBruto ??
    pixValorAguardandoBruto + comprovantesValorPendente;

  return {
    pix: {
      rifasPagas: resumo.pixRifasPagas ?? 0,
      recebidoBruto: pixRecebidoBruto,
      recebidoLiquido: pixRecebidoLiquido,
      transacoesAguardando:
        resumo.pixTransacoesAguardando ?? resumo.quantidadeAguardando ?? 0,
      rifasAguardando: resumo.pixRifasAguardando ?? 0,
      valorAguardandoBruto: pixValorAguardandoBruto,
      valorAguardandoLiquido: pixValorAguardandoLiquido,
    },
    comprovantes: {
      transacoesPagas: comprovantesTransacoesPagas,
      rifasPagas: comprovantesRifasPagas,
      valorRecebido: comprovantesValorRecebido,
      transacoesPendentes: comprovantesTransacoesPendentes,
      rifasPendentes: comprovantesRifasPendentes,
      valorPendente: comprovantesValorPendente,
    },
    totalGeral: {
      transacoesPagas: totalGeralTransacoesPagas,
      rifasPagas: totalGeralRifasPagas,
      recebidoBruto: totalGeralRecebidoBruto,
      recebidoLiquido: totalGeralRecebidoLiquido,
      transacoesPendentes: totalGeralTransacoesPendentes,
      rifasPendentes: totalGeralRifasPendentes,
      valorPendenteBruto: totalGeralValorPendenteBruto,
    },
  };
}

/**
 * Estima ou lê a quantidade de bilhetes vinculados a uma transação Pix.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {number} Quantidade de bilhetes associada à cobrança.
 */
function contarRifasTransacao(transacao: PixTransacao): number {
  return (
    transacao.quantidadeRifas ||
    transacao.rifas?.length ||
    Math.round((transacao.valorPago || transacao.valorBruto || 0) / 10)
  );
}

/**
 * Calcula o valor líquido de uma transação Pix aplicando taxa de 1% apenas para cobranças
 * históricas do gateway Mercado Pago (`MERCADOPAGO_API`), mantendo Pix Direto (`EMV_OFFLINE`)
 * e Comprovantes em 100% do valor integral.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @param {number} valor - Valor bruto de referência.
 * @returns {number} Valor líquido arredondado em duas casas decimais.
 */
function calcularValorLiquidoTransacao(transacao: PixTransacao, valor: number): number {
  const bruto = Number.isFinite(Number(valor)) ? Number(valor) : 0;

  if (transacao.provedor === "MERCADOPAGO_API") {
    return Math.round(bruto * 0.99 * 100) / 100;
  }

  if (transacao.provedor === "EMV_OFFLINE" || transacao.provedor === "COMPROVANTE_PURO") {
    return Math.round(bruto * 100) / 100;
  }

  const ehLegadoMercadoPago =
    transacao.origem !== "COMPROVANTE" &&
    !transacao.comprovanteUrl &&
    Boolean(transacao.pixOrderId) &&
    !String(transacao.pixOrderId || "").startsWith("RIFA");

  return ehLegadoMercadoPago
    ? Math.round(bruto * 0.99 * 100) / 100
    : Math.round(bruto * 100) / 100;
}

/**
 * Calcula os totais monetários e contagens resumidas para exibição nos cards do dashboard da Tesouraria Pix.
 * Aplica taxa bancária de 1% apenas às cobranças do gateway Mercado Pago,
 * mantendo Pix Direto (InfinitePay / EMV Offline) e Comprovantes com valor integral.
 *
 * @param {PixTransacao[]} transacoes - Lista consolidada de transações.
 * @returns {PixTransacoesResumo} Métricas financeiras e de volume de vendas.
 */
export function calcularResumoPixTransacoes(
  transacoes: PixTransacao[],
): PixTransacoesResumo {
  let quantidadePagas = 0;
  let quantidadeAguardando = 0;
  let quantidadeCanceladas = 0;
  let quantidadeErros = 0;

  let pixRecebidoBruto = 0;
  let totalRecebido = 0;
  let totalPendente = 0;
  let pixValorAguardandoLiquido = 0;
  let totalCancelado = 0;
  let totalErros = 0;

  let pixRifasPagas = 0;
  let pixRifasAguardando = 0;

  for (let i = 0; i < transacoes.length; i++) {
    const t = transacoes[i];
    const status = t.statusPagamento;
    const rifasCount = contarRifasTransacao(t);
    const valorBruto = t.valorBruto || 0;
    const valorBasePago = t.valorPago || valorBruto;

    if (status === "PAID" || status === "AUTHORIZED") {
      quantidadePagas += 1;
      pixRecebidoBruto += valorBasePago;
      totalRecebido += calcularValorLiquidoTransacao(t, valorBasePago);
      pixRifasPagas += rifasCount;
    } else if (status === "WAITING" || status === "IN_ANALYSIS") {
      quantidadeAguardando += 1;
      totalPendente += valorBruto;
      pixValorAguardandoLiquido += calcularValorLiquidoTransacao(t, valorBruto);
      pixRifasAguardando += rifasCount;
    } else if (status === "CANCELED" || status === "DECLINED") {
      quantidadeCanceladas += 1;
      totalCancelado += valorBruto;
    } else if (status === "ERROR") {
      quantidadeErros += 1;
      totalErros += valorBruto;
    }
  }

  totalRecebido = Number(totalRecebido.toFixed(2));
  pixValorAguardandoLiquido = Number(pixValorAguardandoLiquido.toFixed(2));

  return {
    ...RESUMO_PIX_TRANSACOES_VAZIO,
    totalRecebido,
    totalPendente,
    totalCancelado,
    totalErros,
    quantidadePagas,
    quantidadeAguardando,
    quantidadeCanceladas,
    quantidadeErros,
    totalTransacoes: transacoes.length,
    ticketMedio:
      quantidadePagas > 0
        ? Number((totalRecebido / quantidadePagas).toFixed(2))
        : 0,

    // Indicadores Pix
    pixRifasPagas,
    pixRecebidoBruto,
    pixRecebidoLiquido: totalRecebido,
    pixTransacoesAguardando: quantidadeAguardando,
    pixRifasAguardando,
    pixValorAguardandoBruto: totalPendente,
    pixValorAguardandoLiquido,

    // Total Geral (no fallback local são equivalentes ao Pix isolado)
    totalGeralTransacoesPagas: quantidadePagas,
    totalGeralRifasPagas: pixRifasPagas,
    totalGeralRecebidoBruto: pixRecebidoBruto,
    totalGeralRecebidoLiquido: totalRecebido,
    totalGeralTransacoesPendentes: quantidadeAguardando,
    totalGeralRifasPendentes: pixRifasAguardando,
    totalGeralValorPendenteBruto: totalPendente,
  };
}

/**
 * Agrupa transações por data (dia/mês) para montagem do gráfico de série temporal de arrecadação Pix.
 *
 * @param {PixTransacao[]} transacoes - Lista de transações avaliadas.
 * @returns {PixTransacoesSerieTemporal[]} Série de dados cronológica para gráficos do Recharts.
 */
export function montarPixTransacoesSerieTemporal(
  transacoes: PixTransacao[],
): PixTransacoesSerieTemporal[] {
  const agrupado = transacoes.reduce<Record<string, PixTransacoesSerieTemporal>>(
    (acc, transacao) => {
      const dataBase = transacao.dataPagamento || transacao.dataCriacao;

      const data = new Date(dataBase).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });

      if (!acc[data]) {
        acc[data] = {
          data,
          recebido: 0,
          pendente: 0,
          quantidadePagas: 0,
        };
      }

      if (transacao.statusPagamento === "PAID") {
        acc[data].recebido += transacao.valorPago;
        acc[data].quantidadePagas += 1;
      }

      if (transacao.statusPagamento === "WAITING") {
        acc[data].pendente += transacao.valorBruto;
      }

      return acc;
    },
    {},
  );

  return Object.values(agrupado);
}
