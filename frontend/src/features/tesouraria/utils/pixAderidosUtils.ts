import { PixTransacao } from "../types/pixTransacoes";
import { AderidoMetricaDesempenho } from "../types/desempenho";
import { META_RIFAS_ADERIDO } from "./constants";
import { somenteNumeros } from "./formatadores";

export const CPF_NAO_INFORMADO = "CPF não informado";
export const ADERIDO_NAO_VINCULADO = "Sem aderido vinculado";

/**
 * Representa o consolidado financeiro e de bilhetes de um aderido (vendedor).
 */
export interface PixAderidoResumo {
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
  /** Arrecadação por canal Comprovante manual */
  valorComprovante?: number;
  /** Quantidade de transações confirmadas */
  quantidadeTransacoesPagas: number;
  /** Quantidade de rifas pagas */
  rifasPagas: number;
  /** Rifas que faltam para atingir a meta */
  rifasRestantes: number;
  /** Lista de transações locais vinculadas a este aderido */
  transacoes: PixTransacao[];
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
 * Agrupa transações Pix locais por aderido (vendedor) calculando arrecadação e rifas restantes.
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
      Omit<PixAderidoResumo, "rifasRestantes"> & {
        rifasNumeradasPagas: Set<string>;
        rifasPagasLegado: number;
      }
    >
  >((acc, transacao) => {
    const chave = obterChaveAderido(transacao);
    const nome = transacao.aderido?.nome || ADERIDO_NAO_VINCULADO;
    const cpf = somenteNumeros(transacao.aderido?.cpf);

    if (!acc[chave]) {
      acc[chave] = {
        chave,
        nome,
        cpf: cpf || undefined,
        cpfLabel: formatarCpfTesouraria(cpf),
        totalArrecadado: 0,
        quantidadeTransacoesPagas: 0,
        rifasPagas: 0,
        rifasNumeradasPagas: new Set(),
        rifasPagasLegado: 0,
        transacoes: [],
      };
    }

    acc[chave].transacoes.push(transacao);

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
    }

    return acc;
  }, {});

  return Object.values(grupos)
    .map(({ rifasNumeradasPagas, rifasPagasLegado, ...grupo }) => {
      const rifasPagas = rifasNumeradasPagas.size + rifasPagasLegado;

      return {
        ...grupo,
        rifasPagas,
        rifasRestantes: Math.max(META_RIFAS_ADERIDO - rifasPagas, 0),
      };
    })
    .sort((a, b) => b.totalArrecadado - a.totalArrecadado);
}

/**
 * Adapta a lista consolidada de aderidos do relatório do servidor para a interface consumida
 * pelos cards e drawers da aba Aderidos, vinculando transações locais existentes.
 *
 * @param {AderidoMetricaDesempenho[]} aderidosServidor - Métricas consolidadas pelo backend.
 * @param {PixTransacao[]} transacoes - Transações locais para inspeção no drawer.
 * @returns {PixAderidoResumo[]} Lista de resumos por aderido com valores consolidados do servidor.
 */
export function adaptarAderidosDoRelatorio(
  aderidosServidor: AderidoMetricaDesempenho[],
  transacoes: PixTransacao[],
): PixAderidoResumo[] {
  return aderidosServidor.map((item) => {
    const nome = item.vendedorNome || item.nome || ADERIDO_NAO_VINCULADO;
    const cpfLimpo = somenteNumeros(item.vendedorCpf || item.cpf);
    const vendedorId = item.vendedorId || item.id;
    const chave = vendedorId
      ? `id:${vendedorId}`
      : cpfLimpo
        ? `cpf:${cpfLimpo}`
        : `nome:${nome}`;

    const transacoesDoVendedor = transacoes.filter((t) => {
      if (vendedorId && t.aderido?.id === vendedorId) return true;
      if (cpfLimpo && somenteNumeros(t.aderido?.cpf) === cpfLimpo) return true;
      if (t.aderido?.nome && t.aderido.nome.toLowerCase() === nome.toLowerCase()) return true;
      return false;
    });

    const rifasVendidas = item.rifasVendidas ?? 0;
    const totalArrecadado = item.valorTotal ?? item.arrecadado ?? 0;

    return {
      chave,
      nome,
      cpf: cpfLimpo || undefined,
      cpfLabel: formatarCpfTesouraria(cpfLimpo),
      totalArrecadado,
      valorPix: item.valorPix,
      valorComprovante: item.valorComprovante,
      quantidadeTransacoesPagas: item.comprasCount ?? 0,
      rifasPagas: rifasVendidas,
      rifasRestantes: Math.max(META_RIFAS_ADERIDO - rifasVendidas, 0),
      transacoes: transacoesDoVendedor,
    };
  });
}
