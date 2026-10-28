import { PixTransacao } from "../types/pixTransacoes";
import {
  AderidoMetricaDesempenho,
  AderidoRankingDesempenho,
  TransacaoResumoAderido,
} from "../types/desempenho";
import { META_RIFAS_ADERIDO } from "./constants";
import { somenteNumeros } from "./formatadores";

export const CPF_NAO_INFORMADO = "CPF não informado";
export const ADERIDO_NAO_VINCULADO = "Sem aderido vinculado";

export type PixTransacaoComOrigem = PixTransacao & {
  origem?: "PIX" | "COMPROVANTE";
};

/**
 * Representa o consolidado financeiro, de ranking e de bilhetes de um aderido (vendedor).
 */
export interface PixAderidoResumo extends AderidoRankingDesempenho {
  /** Chave única para controle de agrupamento */
  chave: string;
  /** Nome legível do vendedor */
  nome: string;
  /** CPF numérico sem pontuação */
  cpf?: string;
  /** CPF com máscara para visualização */
  cpfLabel: string;
  /** Total arrecadado somando todos os canais */
  totalArrecadado: number;
  /** Arrecadação por canal Pix */
  valorPix?: number;
  /** Arrecadação líquida por canal Pix */
  valorPixLiquido?: number;
  /** Arrecadação por canal Comprovante manual */
  valorComprovante?: number;
  /** Quantidade de transações confirmadas */
  quantidadeTransacoesPagas: number;
  /** Quantidade de rifas pagas */
  rifasPagas: number;
  /** Rifas que faltam para atingir a meta */
  rifasRestantes: number;
  /** Lista de transações vinculadas a este aderido (Pix e Comprovante) */
  transacoes: PixTransacaoComOrigem[];
}

/**
 * Formata um CPF numérico aplicando máscara padrão brasileira (XXX.XXX.XXX-XX)
 * ou retorna fallback amigável caso não tenha sido preenchido.
 *
 * @param {string | null} [cpf] - CPF com ou sem formatação.
 * @returns {string} CPF formatado ou 'CPF não informado'.
 */
export function formatarCpfTesouraria(cpf?: string | null): string {
  const cpfNumerico = somenteNumeros(cpf).slice(0, 11);

  if (!cpfNumerico) return CPF_NAO_INFORMADO;
  if (cpfNumerico.length <= 3) return cpfNumerico;
  if (cpfNumerico.length <= 6) {
    return `${cpfNumerico.slice(0, 3)}.${cpfNumerico.slice(3)}`;
  }
  if (cpfNumerico.length <= 9) {
    return `${cpfNumerico.slice(0, 3)}.${cpfNumerico.slice(3, 6)}.${cpfNumerico.slice(6)}`;
  }

  return `${cpfNumerico.slice(0, 3)}.${cpfNumerico.slice(
    3,
    6,
  )}.${cpfNumerico.slice(6, 9)}-${cpfNumerico.slice(9)}`;
}

/**
 * Determina uma chave canônica de identificação do aderido com base nos identificadores disponíveis.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {string} Chave identificadora.
 */
function obterChaveAderido(transacao: PixTransacao): string {
  const cpf = somenteNumeros(transacao.aderido?.cpf);

  if (cpf) return `cpf:${cpf}`;
  if (transacao.aderido?.id) return `id:${transacao.aderido.id}`;
  if (transacao.aderido?.nome) return `nome:${transacao.aderido.nome}`;

  return "sem-aderido";
}

/**
 * Conta a quantidade de rifas válidas e pagas associadas a uma transação Pix.
 *
 * @param {PixTransacao} transacao - Transação Pix.
 * @returns {number} Quantidade de bilhetes.
 */
function contarRifasPagasTransacao(transacao: PixTransacao): number {
  if (transacao.statusPagamento !== "PAID") return 0;

  if (transacao.rifas?.length) {
    const rifasPagas = new Set(
      transacao.rifas
        .filter((rifa) => !rifa.status || rifa.status === "pago")
        .map((rifa) => rifa.numero),
    );

    return rifasPagas.size;
  }

  return transacao.quantidadeRifas || 0;
}

/**
 * Converte uma transação resumida vinda do relatório do servidor para o contrato visual `PixTransacaoComOrigem`.
 *
 * @param {TransacaoResumoAderido} t - Transação resumida do relatório.
 * @returns {PixTransacaoComOrigem} Objeto compatível com o drawer de detalhes.
 */
function converterTransacaoServidor(
  t: TransacaoResumoAderido,
): PixTransacaoComOrigem {
  return {
    id: t.id,
    metodo: "PIX",
    origem: t.origem,
    statusPagamento: t.statusPagamento,
    valorBruto: t.valorBruto,
    valorPago: t.valorPago,
    moeda: "BRL",
    dataCriacao: t.dataCriacao,
    dataPagamento: t.dataPagamento,
    compradorNome: t.compradorNome,
    quantidadeRifas: t.quantidadeRifas,
    rifas: t.rifas,
  };
}

/**
 * Agrupa transações Pix locais por aderido (vendedor) calculando arrecadação, posição de ranking e rifas restantes.
 * Usado como fallback quando o relatório consolidado do servidor não estiver disponível.
 *
 * @param {PixTransacao[]} transacoes - Lista de transações Pix.
 * @returns {PixAderidoResumo[]} Resumo ordenado decrescentemente por arrecadação.
 */
export function agruparPixAderidos(
  transacoes: PixTransacao[],
): PixAderidoResumo[] {
  const grupos = transacoes.reduce<
    Record<
      string,
      {
        id?: string;
        chave: string;
        nome: string;
        cpf?: string;
        cpfLabel: string;
        cargo?: string;
        modalidadeAdesao?: "completo" | "meio";
        totalArrecadado: number;
        quantidadeTransacoesPagas: number;
        rifasNumeradasPagas: Set<string>;
        rifasPagasLegado: number;
        rifasPendentesCount: number;
        transacoes: PixTransacaoComOrigem[];
      }
    >
  >((acc, transacao) => {
    const chave = obterChaveAderido(transacao);
    const nome = transacao.aderido?.nome || ADERIDO_NAO_VINCULADO;
    const cpf = somenteNumeros(transacao.aderido?.cpf);

    if (!acc[chave]) {
      acc[chave] = {
        id: transacao.aderido?.id,
        chave,
        nome,
        cpf: cpf || undefined,
        cpfLabel: formatarCpfTesouraria(cpf),
        cargo: transacao.aderido?.cargo,
        modalidadeAdesao: transacao.aderido?.modalidade_adesao,
        totalArrecadado: 0,
        quantidadeTransacoesPagas: 0,
        rifasNumeradasPagas: new Set(),
        rifasPagasLegado: 0,
        rifasPendentesCount: 0,
        transacoes: [],
      };
    }

    acc[chave].transacoes.push({
      ...transacao,
      origem: "PIX",
    });

    if (transacao.statusPagamento === "PAID") {
      acc[chave].totalArrecadado += transacao.valorPago;
      acc[chave].quantidadeTransacoesPagas += 1;

      if (transacao.rifas?.length) {
        transacao.rifas
          .filter((rifa) => !rifa.status || rifa.status === "pago")
          .forEach((rifa) => acc[chave].rifasNumeradasPagas.add(rifa.numero));
      } else {
        acc[chave].rifasPagasLegado += contarRifasPagasTransacao(transacao);
      }
    } else if (transacao.statusPagamento === "WAITING") {
      acc[chave].rifasPendentesCount +=
        transacao.rifas?.length || transacao.quantidadeRifas || 0;
    }

    return acc;
  }, {});

  const ordenados = Object.values(grupos).sort(
    (a, b) => b.totalArrecadado - a.totalArrecadado,
  );

  return ordenados.map((grupo, index) => {
    const rifasPagas =
      grupo.rifasNumeradasPagas.size + grupo.rifasPagasLegado;
    const meta = grupo.modalidadeAdesao === "meio" ? 600 : 1200;
    const percentualMeta =
      meta > 0 ? Math.round((grupo.totalArrecadado / meta) * 100) : 0;

    return {
      id: grupo.id,
      chave: grupo.chave,
      posicao: index + 1,
      nome: grupo.nome,
      cpf: grupo.cpf,
      cpfLabel: grupo.cpfLabel,
      cargo: grupo.cargo,
      modalidadeAdesao: grupo.modalidadeAdesao,
      arrecadado: grupo.totalArrecadado,
      arrecadadoLiquido: grupo.totalArrecadado,
      totalArrecadado: grupo.totalArrecadado,
      meta,
      percentualMeta,
      bateuMeta: grupo.totalArrecadado >= meta,
      quantidadeTransacoesPagas: grupo.quantidadeTransacoesPagas,
      rifasPagas,
      rifasVendidas: rifasPagas,
      rifasVendidasPix: rifasPagas,
      rifasVendidasComprovante: 0,
      rifasPendentes: grupo.rifasPendentesCount,
      rifasRestantes: Math.max(META_RIFAS_ADERIDO - rifasPagas, 0),
      transacoes: grupo.transacoes,
    };
  });
}

/**
 * Adapta a lista consolidada de aderidos do relatório do servidor para a interface consumida
 * pela tabela/cards de ranking e pelo drawer da aba Aderidos, unificando transações do servidor (Pix + Comprovantes)
 * e transações Pix locais.
 *
 * @param {AderidoMetricaDesempenho[]} aderidosServidor - Métricas consolidadas pelo backend.
 * @param {PixTransacao[]} transacoes - Transações locais para inspeção complementar no drawer.
 * @returns {PixAderidoResumo[]} Lista ordenada de aderidos com posições, metas e histórico de transações.
 */
export function adaptarAderidosDoRelatorio(
  aderidosServidor: AderidoMetricaDesempenho[],
  transacoes: PixTransacao[],
): PixAderidoResumo[] {
  const ordenados = [...aderidosServidor].sort((a, b) => {
    const valorA = a.arrecadadoLiquido ?? a.valorTotal ?? a.arrecadado ?? 0;
    const valorB = b.arrecadadoLiquido ?? b.valorTotal ?? b.arrecadado ?? 0;
    return valorB - valorA;
  });

  return ordenados.map((item, index) => {
    const nome = item.vendedorNome || item.nome || ADERIDO_NAO_VINCULADO;
    const cpfLimpo = somenteNumeros(item.vendedorCpf || item.cpf);
    const vendedorId = item.vendedorId || item.id;
    const chave = vendedorId
      ? `id:${vendedorId}`
      : cpfLimpo
        ? `cpf:${cpfLimpo}`
        : `nome:${nome}`;

    const transacoesServidorConvertidas: PixTransacaoComOrigem[] = (
      item.transacoes || []
    ).map(converterTransacaoServidor);

    const idsExistentes = new Set(
      transacoesServidorConvertidas.map((t) => t.id),
    );

    const transacoesLocaisExtras: PixTransacaoComOrigem[] = transacoes
      .filter((t) => {
        if (idsExistentes.has(t.id)) return false;
        if (vendedorId && t.aderido?.id === vendedorId) return true;
        if (cpfLimpo && somenteNumeros(t.aderido?.cpf) === cpfLimpo) return true;
        if (
          t.aderido?.nome &&
          t.aderido.nome.toLowerCase() === nome.toLowerCase()
        ) {
          return true;
        }
        return false;
      })
      .map((t) => ({
        ...t,
        origem: "PIX" as const,
      }));

    const transacoesDoVendedor = [
      ...transacoesServidorConvertidas,
      ...transacoesLocaisExtras,
    ];

    const rifasVendidas = item.rifasVendidas ?? 0;
    const arrecadadoBruto = item.valorTotal ?? item.arrecadado ?? 0;
    const arrecadadoLiquido = item.arrecadadoLiquido ?? arrecadadoBruto;
    const meta = item.meta || 1200;
    const percentualMeta =
      meta > 0 ? Math.round((arrecadadoBruto / meta) * 100) : 0;

    return {
      ...item,
      id: vendedorId,
      chave,
      posicao: index + 1,
      nome,
      cpf: cpfLimpo || undefined,
      cpfLabel: formatarCpfTesouraria(cpfLimpo),
      arrecadado: arrecadadoBruto,
      arrecadadoLiquido,
      totalArrecadado: arrecadadoBruto,
      valorPix: item.valorPix,
      valorPixLiquido: item.valorPixLiquido,
      valorComprovante: item.valorComprovante,
      meta,
      percentualMeta,
      bateuMeta: arrecadadoBruto >= meta,
      quantidadeTransacoesPagas:
        item.comprasCount ??
        transacoesDoVendedor.filter((t) => t.statusPagamento === "PAID").length,
      rifasPagas: rifasVendidas,
      rifasVendidas,
      rifasVendidasPix: item.rifasVendidasPix ?? 0,
      rifasVendidasComprovante: item.rifasVendidasComprovante ?? 0,
      rifasPendentes: item.rifasPendentes ?? 0,
      rifasRestantes: Math.max(META_RIFAS_ADERIDO - rifasVendidas, 0),
      transacoes: transacoesDoVendedor,
    };
  });
}
