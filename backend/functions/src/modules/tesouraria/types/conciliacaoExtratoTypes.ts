/**
 * Tipos e DTOs para o motor de conciliação automática por extrato bancário.
 *
 * @module conciliacaoExtratoTypes
 */
import { LinhaExtratoBancario } from "../utils/extratoBancarioParser";

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

export interface ResumoConciliacaoDTO {
  totalLinhasExtrato: number;
  totalPendenciasSistema: number;
  totalMatchesExatos: number;
  totalMatchesAproximados: number;
  totalSemMatchExtrato: number;
  totalSemMatchSistema: number;
  valorTotalMatches: number;
}

export interface ResultadoAnaliseExtratoDTO {
  resumo: ResumoConciliacaoDTO;
  matches: ItemMatchConciliacao[];
  naoIdentificadosExtrato: LinhaExtratoBancario[];
}

export interface ItemAprovacaoLoteInput {
  pagamentoId: string;
  tipoMatch: TipoMatchConciliacao;
  alvoMatch: AlvoMatchConciliacao;
  txidBanco?: string;
  endToEndIdBanco?: string;
  nomePagadorBanco?: string;
  valorBanco: number;
  dataBanco?: string;
}

export interface RequisicaoAprovarLoteConciliacaoInput {
  itens: ItemAprovacaoLoteInput[];
}

export interface ResultadoAprovacaoLoteDTO {
  sucesso: boolean;
  aprovadosCount: number;
  totalRifasAprovadas: number;
  valorTotalAprovado: number;
  falhasCount: number;
  mensagem: string;
}
