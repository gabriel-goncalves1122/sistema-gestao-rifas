/**
 * Contratos de tipos para a conciliação automática por extrato bancário no frontend.
 *
 * @module conciliacaoExtratoTypes
 */

export type TipoMatchConciliacao =
  | "TXID_EXATO"
  | "E2E_EXATO"
  | "NOME_VALOR_APROXIMADO";

export type AlvoMatchConciliacao = "TXID" | "E2E" | "COMPRADOR" | "ADERIDO";

export interface ItemMatchConciliacao {
  pagamentoId: string;
  tipoMatch: TipoMatchConciliacao;
  alvoMatch: AlvoMatchConciliacao;
  confianca: number; // 1.0 para exato, 0.70-0.99 para aproximado
  compradorNome: string;
  compradorCpf?: string;
  compradorEmail?: string;
  vendedorNome?: string;
  vendedorId?: string;
  nomePagadorBanco: string;
  documentoPagadorBanco?: string;
  valorEsperado: number;
  valorBanco: number;
  numerosRifas: string[];
  txidEsperado?: string;
  txidBanco?: string;
  endToEndIdBanco?: string;
  dataBanco: string;
  dataReserva: string;
  comprovanteUrl?: string | null;
}

export interface LinhaExtratoNaoIdentificada {
  data: string;
  valor: number;
  txid?: string;
  endToEndId?: string;
  nomePagador?: string;
  documentoPagador?: string;
  descricao?: string;
  linhaOriginal: number;
}

export interface ResumoConciliacao {
  totalLinhasExtrato: number;
  totalPendenciasSistema: number;
  totalMatchesExatos: number;
  totalMatchesAproximados: number;
  totalSemMatchExtrato: number;
  totalSemMatchSistema: number;
  valorTotalMatches: number;
}

export interface ResultadoAnaliseExtrato {
  resumo: ResumoConciliacao;
  matches: ItemMatchConciliacao[];
  naoIdentificadosExtrato: LinhaExtratoNaoIdentificada[];
}

export interface ItemAprovacaoLotePayload {
  pagamentoId: string;
  tipoMatch: TipoMatchConciliacao;
  alvoMatch: AlvoMatchConciliacao;
  txidBanco?: string;
  endToEndIdBanco?: string;
  nomePagadorBanco?: string;
  valorBanco: number;
  dataBanco?: string;
}

export interface ResultadoAprovacaoLote {
  sucesso: boolean;
  aprovadosCount: number;
  totalRifasAprovadas: number;
  valorTotalAprovado: number;
  falhasCount: number;
  mensagem: string;
}
