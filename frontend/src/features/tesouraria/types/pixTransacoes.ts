export type StatusPagamentoPix =
  | "WAITING"
  | "PAID"
  | "AUTHORIZED"
  | "IN_ANALYSIS"
  | "DECLINED"
  | "CANCELED"
  | "ERROR";

export type StatusValidacaoPix = "aceita" | "negada";

export type StatusValidacaoUI =
  | StatusValidacaoPix
  | "sem_confirmacao_bancaria"
  | "pendente_validacao";

export interface AderidoResumoTransacao {
  id?: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  modalidade_adesao?: "completo" | "meio";
  cargo?: string;
}

export interface RifaResumoTransacao {
  numero: string;
  status?: string;
}

export interface PixTransacao {
  id: string;

  pixOrderId?: string;
  codigoAutenticacao?: string;
  nsu?: string;

  metodo: "PIX";
  statusPagamento: StatusPagamentoPix;

  valorBruto: number;
  valorPago: number;
  valorEstornado?: number;
  moeda: "BRL";

  descricao?: string;
  dataCriacao: string;
  dataPagamento?: string | null;
  dataExpiracao?: string | null;

  compradorNome?: string;
  compradorEmail?: string;
  compradorDocumento?: string;
  compradorTelefone?: string;

  aderido?: AderidoResumoTransacao;
  rifas?: RifaResumoTransacao[];
  quantidadeRifas?: number;
  compradorId?: string | null;

  qrCodeTexto?: string;
  qrCodeImagemUrl?: string;

  observacao?: string;
  statusValidacao?: StatusValidacaoPix;
}

export interface PixTransacoesResumo {
  totalRecebido: number;
  totalPendente: number;
  totalCancelado: number;
  totalErros: number;

  quantidadePagas: number;
  quantidadeAguardando: number;
  quantidadeCanceladas: number;
  quantidadeErros: number;
  totalTransacoes: number;

  ticketMedio: number;

  // 1. Indicadores detalhados de Pagamentos via Pix (Gateway)
  pixRifasPagas?: number;
  pixRecebidoBruto?: number;
  pixRecebidoLiquido?: number;
  pixTransacoesAguardando?: number;
  pixRifasAguardando?: number;
  pixValorAguardandoBruto?: number;
  pixValorAguardandoLiquido?: number;

  // 2. Indicadores de Rifas negociadas via Comprovante Manual (Legado)
  comprovantesTransacoesPagas?: number;
  comprovantesRifasPagas?: number;
  comprovantesValorRecebido?: number;
  comprovantesTransacoesPendentes?: number;
  comprovantesRifasPendentes?: number;
  comprovantesValorPendente?: number;

  // 3. Indicadores do Total Geral Consolidado (Pix + Comprovantes)
  totalGeralTransacoesPagas?: number;
  totalGeralRifasPagas?: number;
  totalGeralRecebidoBruto?: number;
  totalGeralRecebidoLiquido?: number;
  totalGeralTransacoesPendentes?: number;
  totalGeralRifasPendentes?: number;
  totalGeralValorPendenteBruto?: number;
}

export interface PixTransacoesResumoUI extends PixTransacoesResumo {
  quantidadeAguardandoValidacao?: number;
  quantidadeAceitas?: number;
  quantidadeNegadas?: number;
  quantidadeSemConfirmacaoBancaria?: number;
  quantidadeComRifas?: number;
  quantidadeSemVinculo?: number;
  totalDivergente?: number;
  quantidadeNaoIdentificadas?: number;
}

export interface PixTransacoesSerieTemporal {
  data: string;
  recebido: number;
  pendente: number;
  quantidadePagas: number;
}

export type FiltroRapidoTransacoesPix =
  | "novas"
  | "aprovadas"
  | "recusadas"
  | "aguardando_pagamento"
  | "todas";

export interface PixTransacoesFiltros {
  status: FiltroRapidoTransacoesPix;
  busca: string;
}
