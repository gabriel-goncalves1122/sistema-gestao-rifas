
import {
  AderidoMetricaDesempenho,
  DesempenhoDados,
  ReceitaPorDiaDesempenho,
  ResumoGeralDesempenho,
  TransacaoDesempenho,
} from "../types/desempenho";

export const RESUMO_GERAL_DESEMPENHO_VAZIO: ResumoGeralDesempenho = {
  totalArrecadado: 0,
  totalArrecadadoLiquido: 0,
  rifasPagas: 0,
  rifasPagasPix: 0,
  rifasPagasComprovante: 0,
  valorArrecadadoPixBruto: 0,
  valorArrecadadoPixLiquido: 0,
  valorArrecadadoComprovante: 0,
  rifasPendentes: 0,
  rifasPendentesPix: 0,
  rifasPendentesComprovante: 0,
  aderidosAtivos: 0,
};

function statusNormalizado(status?: string) {
  return String(status || "").trim().toLowerCase();
}

/**
 * Agrupa as transações confirmadas por data cronológica, distinguindo arrecadação Pix e Comprovantes.
 *
 * @param {TransacaoDesempenho[]} transacoes - Transações recebidas do histórico.
 * @returns {ReceitaPorDiaDesempenho[]} Série cronológica com splits por canal.
 */
export function montarReceitaPorDia(
  transacoes: TransacaoDesempenho[],
): ReceitaPorDiaDesempenho[] {
  const agrupado = transacoes.reduce<Record<string, ReceitaPorDiaDesempenho>>(
    (acc, transacao) => {
      if (statusNormalizado(transacao.status) !== "pago") return acc;

      const dataBase = transacao.dataPagamento || transacao.dataReserva;
      const dataConvertida = new Date(dataBase);

      if (Number.isNaN(dataConvertida.getTime())) return acc;

      const chave = dataConvertida.toISOString().slice(0, 10);
      const data = dataConvertida.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });

      if (!acc[chave]) {
        acc[chave] = {
          data,
          dataOrdenacao: dataConvertida.getTime(),
          valor: 0,
          valorPix: 0,
          valorComprovante: 0,
        };
      }

      const ehPix = transacao.origem === "PIX";
      if (ehPix) {
        acc[chave].valorPix += transacao.valorTotal;
      } else {
        acc[chave].valorComprovante += transacao.valorTotal;
      }
      acc[chave].valor += transacao.valorTotal;

      return acc;
    },
    {},
  );

  return Object.values(agrupado).sort(
    (a, b) => a.dataOrdenacao - b.dataOrdenacao,
  );
}

/**
 * Consolida as contagens e barras percentuais de status das rifas (Pagas, Pendentes e Recusadas).
 *
 * @param {TransacaoDesempenho[]} transacoes - Transações para cômputo de status.
 * @returns {DesempenhoDados["status"]} Quantidades e barras de status.
 */
export function montarStatus(transacoes: TransacaoDesempenho[]) {
  const pagas = transacoes.filter(
    (transacao) => statusNormalizado(transacao.status) === "pago",
  ).length;
  const pendentes = transacoes.filter(
    (transacao) =>
      statusNormalizado(transacao.status) === "pendente" ||
      statusNormalizado(transacao.status) === "reservado",
  ).length;
  const recusadas = transacoes.filter(
    (transacao) => statusNormalizado(transacao.status) === "recusado",
  ).length;

  const barras: BarraResumoDesempenho[] = [
    { label: "Pagas", valor: pagas, cor: "#0B7A61" },
    { label: "Pendentes", valor: pendentes, cor: "#C48A16" },
  ];

  if (recusadas > 0) {
    barras.push({ label: "Recusadas", valor: recusadas, cor: "#8E1F1F" });
  }

  return {
    pagas,
    pendentes,
    recusadas,
    total: pagas + pendentes + recusadas,
    barras,
  };
}

/**
 * Monta as barras comparativas entre vendas via Pix automatizado e comprovantes manuais.
 *
 * @param {ResumoGeralDesempenho} resumoGeral - Resumo financeiro consolidado.
 * @returns {DesempenhoDados["origem"]} Total e barras de origem.
 */
export function montarOrigem(resumoGeral: ResumoGeralDesempenho) {
  const pix = resumoGeral.rifasPagasPix ?? 0;
  const comprovante = resumoGeral.rifasPagasComprovante ?? 0;
  const total = pix + comprovante;

  return {
    total,
    barras: [
      { label: "Pix Automatizado", valor: pix, cor: "#0B7A61" },
      { label: "Comprovantes Manuais", valor: comprovante, cor: "#526760" },
    ],
  };
}

/**
 * Agrupa e constrói o ranking ordenado de aderidos por volume arrecadado e cumprimento de meta.
 *
 * @param {AderidoMetricaDesempenho[]} aderidos - Lista de aderidos com métricas consolidadas.
 * @returns {AderidoRankingDesempenho[]} Ranking ordenado com posições e percentuais.
 */
export function montarRankingAderidos(
  aderidos: AderidoMetricaDesempenho[],
): AderidoRankingDesempenho[] {
  const ordenados = [...aderidos].sort((a, b) => {
    const valorA = a.arrecadadoLiquido ?? a.arrecadado;
    const valorB = b.arrecadadoLiquido ?? b.arrecadado;
    return valorB - valorA;
  });

  return ordenados.map((aderido, index) => {
    const meta = aderido.meta || 1200;
    const percentualMeta =
      meta > 0 ? Math.round((aderido.arrecadado / meta) * 100) : 0;

    return {
      ...aderido,
      posicao: index + 1,
      percentualMeta,
      bateuMeta: aderido.arrecadado >= meta,
    };
  });
}

function montarMetas(aderidos: AderidoMetricaDesempenho[]) {
  const bateramMeta = aderidos.filter(
    (aderido) => aderido.arrecadado >= aderido.meta,
  ).length;
  const abaixoMeta = Math.max(aderidos.length - bateramMeta, 0);

  return {
    bateramMeta,
    abaixoMeta,
    total: aderidos.length,
    barras: [
      { label: "Na meta", valor: bateramMeta, cor: "#0B7A61" },
      { label: "Abaixo", valor: abaixoMeta, cor: "#526760" },
    ],
  };
}

export function montarDadosDesempenho({
  resumoGeral,
  aderidos,
  historicoTransacoes,
}: {
  resumoGeral: ResumoGeralDesempenho;
  aderidos: AderidoMetricaDesempenho[];
  historicoTransacoes: TransacaoDesempenho[];
}): DesempenhoDados {
  return {
    resumoGeral,
    receitaPorDia: montarReceitaPorDia(historicoTransacoes),
    status: montarStatus(historicoTransacoes),
    metas: montarMetas(aderidos),
    origem: montarOrigem(resumoGeral),
    rankingAderidos: montarRankingAderidos(aderidos),
  };
}
