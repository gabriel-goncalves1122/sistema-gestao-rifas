import { LinhaExtratoBancario } from "../utils/extratoBancarioParser";
import { calcularSimilaridadeAderente } from "../utils/stringSimilarityUtils";
import {
  ItemMatchConciliacao,
  ResultadoAnaliseExtratoDTO,
  TipoMatchConciliacao,
} from "../types/conciliacaoExtratoTypes";

/**
 * Representa uma compra ou cobrança pendente no sistema candidata à conciliação bancária.
 */
export interface CandidatoPendencia {
  pagamentoId: string;
  referenceId?: string;
  pixOrderId?: string;
  endToEndId?: string;
  valorEsperado: number;
  compradorNome: string;
  compradorCpf?: string;
  compradorEmail?: string;
  vendedorId?: string;
  vendedorNome?: string;
  numerosRifas: string[];
  dataReserva: string;
  comprovanteUrl?: string | null;
}

const TOLERANCIA_VALOR_REAIS = 0.05;
const SCORE_MINIMO_SIMILARIDADE_DICE = 0.7;

/**
 * Monta o DTO padronizado de match de conciliação entre uma linha do extrato e uma pendência.
 *
 * @param {object} params - Dados do par conciliado e metadados de confiança.
 * @returns {ItemMatchConciliacao} Objeto normalizado em camelCase para revisão na Tesouraria.
 */
function construirItemMatch(params: {
  pendencia: CandidatoPendencia;
  linha: LinhaExtratoBancario;
  tipoMatch: TipoMatchConciliacao;
  alvoMatch: "TXID" | "E2E" | "COMPRADOR" | "ADERIDO";
  confianca: number;
  nomeFallback: string;
}): ItemMatchConciliacao {
  const { pendencia, linha, tipoMatch, alvoMatch, confianca, nomeFallback } = params;

  return {
    pagamentoId: pendencia.pagamentoId,
    tipoMatch,
    alvoMatch,
    confianca,
    compradorNome: pendencia.compradorNome,
    compradorCpf: pendencia.compradorCpf,
    compradorEmail: pendencia.compradorEmail,
    vendedorNome: pendencia.vendedorNome,
    vendedorId: pendencia.vendedorId,
    nomePagadorBanco: linha.nomePagador || nomeFallback,
    documentoPagadorBanco: linha.documentoPagador,
    valorEsperado: pendencia.valorEsperado,
    valorBanco: linha.valor,
    numerosRifas: pendencia.numerosRifas,
    txidEsperado: pendencia.referenceId || pendencia.pixOrderId,
    txidBanco: linha.txid,
    endToEndIdBanco: linha.endToEndId,
    dataBanco: linha.data,
    dataReserva: pendencia.dataReserva,
    comprovanteUrl: pendencia.comprovanteUrl,
  };
}

/**
 * Executa o algoritmo puro de conciliação em 3 passes (TXID exato, EndToEndId exato e
 * similaridade nominal Dice + valor idêntico) sobre as linhas parseadas do extrato bancário
 * e as pendências candidatas do sistema.
 *
 * @param {LinhaExtratoBancario[]} linhasExtrato - Lançamentos bancários extraídos do CSV/OFX.
 * @param {CandidatoPendencia[]} pendencias - Pagamentos e bilhetes pendentes candidatos.
 * @returns {ResultadoAnaliseExtratoDTO} Resumo estatístico, matches encontrados e sobras do extrato.
 */
export function executarMatchingExtratoPendencias(
  linhasExtrato: LinhaExtratoBancario[],
  pendencias: CandidatoPendencia[],
): ResultadoAnaliseExtratoDTO {
  const matches: ItemMatchConciliacao[] = [];
  const extratoConsumidoIndices = new Set<number>();
  const pendenciasConsumidasIds = new Set<string>();

  // Pass 1: Match Exato por txid gravado no Pix EMV (100% Confiança)
  linhasExtrato.forEach((linha, index) => {
    if (!linha.txid) return;

    const txidLinha = linha.txid.toUpperCase();
    const pendencia = pendencias.find(
      (p) =>
        !pendenciasConsumidasIds.has(p.pagamentoId) &&
        ((p.referenceId && p.referenceId.toUpperCase() === txidLinha) ||
          (p.pixOrderId && p.pixOrderId.toUpperCase() === txidLinha)) &&
        Math.abs(p.valorEsperado - linha.valor) < TOLERANCIA_VALOR_REAIS,
    );

    if (pendencia) {
      matches.push(
        construirItemMatch({
          pendencia,
          linha,
          tipoMatch: "TXID_EXATO",
          alvoMatch: "TXID",
          confianca: 1.0,
          nomeFallback: "Identificado via txid",
        }),
      );
      extratoConsumidoIndices.add(index);
      pendenciasConsumidasIds.add(pendencia.pagamentoId);
    }
  });

  // Pass 2: Match Exato por EndToEndId (E2E)
  linhasExtrato.forEach((linha, index) => {
    if (extratoConsumidoIndices.has(index) || !linha.endToEndId) return;

    const e2eLinha = linha.endToEndId.toUpperCase();
    const pendencia = pendencias.find(
      (p) =>
        !pendenciasConsumidasIds.has(p.pagamentoId) &&
        p.endToEndId &&
        p.endToEndId.toUpperCase() === e2eLinha &&
        Math.abs(p.valorEsperado - linha.valor) < TOLERANCIA_VALOR_REAIS,
    );

    if (pendencia) {
      matches.push(
        construirItemMatch({
          pendencia,
          linha,
          tipoMatch: "E2E_EXATO",
          alvoMatch: "E2E",
          confianca: 1.0,
          nomeFallback: "Identificado via E2E",
        }),
      );
      extratoConsumidoIndices.add(index);
      pendenciasConsumidasIds.add(pendencia.pagamentoId);
    }
  });

  // Pass 3: Match Sugerido por Nome Similar (Dice) + Valor Idêntico (Comprador ou Aderido)
  linhasExtrato.forEach((linha, index) => {
    if (extratoConsumidoIndices.has(index) || !linha.nomePagador) return;

    const nomeBanco = linha.nomePagador;
    const candidatasValor = pendencias.filter(
      (p) =>
        !pendenciasConsumidasIds.has(p.pagamentoId) &&
        Math.abs(p.valorEsperado - linha.valor) < TOLERANCIA_VALOR_REAIS,
    );

    let melhorPendencia: CandidatoPendencia | null = null;
    let melhorScore = 0;
    let melhorAlvo: "COMPRADOR" | "ADERIDO" = "COMPRADOR";

    for (const pendencia of candidatasValor) {
      const scoreComprador = calcularSimilaridadeAderente(nomeBanco, pendencia.compradorNome);
      const scoreVendedor = pendencia.vendedorNome
        ? calcularSimilaridadeAderente(nomeBanco, pendencia.vendedorNome)
        : 0;

      const maxScore = Math.max(scoreComprador, scoreVendedor);
      if (maxScore > melhorScore && maxScore >= SCORE_MINIMO_SIMILARIDADE_DICE) {
        melhorScore = maxScore;
        melhorPendencia = pendencia;
        melhorAlvo = scoreComprador >= scoreVendedor ? "COMPRADOR" : "ADERIDO";
      }
    }

    if (melhorPendencia) {
      // Se a similaridade for máxima (1.0 ou nomes idênticos normalizados), atribui confiança 1.0 estrita
      const confiancaFinal = melhorScore >= 0.999 ? 1.0 : Number(melhorScore.toFixed(2));

      matches.push(
        construirItemMatch({
          pendencia: melhorPendencia,
          linha,
          tipoMatch: "NOME_VALOR_APROXIMADO",
          alvoMatch: melhorAlvo,
          confianca: confiancaFinal,
          nomeFallback: linha.nomePagador,
        }),
      );
      extratoConsumidoIndices.add(index);
      pendenciasConsumidasIds.add(melhorPendencia.pagamentoId);
    }
  });

  const naoIdentificadosExtrato: LinhaExtratoBancario[] = linhasExtrato.filter(
    (_, index) => !extratoConsumidoIndices.has(index),
  );

  const totalMatchesExatos = matches.filter(
    (m) => m.tipoMatch === "TXID_EXATO" || m.tipoMatch === "E2E_EXATO",
  ).length;
  const totalMatchesAproximados = matches.filter(
    (m) => m.tipoMatch === "NOME_VALOR_APROXIMADO",
  ).length;
  const valorTotalMatches = Number(
    matches.reduce((acc, m) => acc + m.valorBanco, 0).toFixed(2),
  );

  return {
    resumo: {
      totalLinhasExtrato: linhasExtrato.length,
      totalPendenciasSistema: pendencias.length,
      totalMatchesExatos,
      totalMatchesAproximados,
      totalSemMatchExtrato: naoIdentificadosExtrato.length,
      totalSemMatchSistema: pendencias.length - pendenciasConsumidasIds.size,
      valorTotalMatches,
    },
    matches,
    naoIdentificadosExtrato,
  };
}
