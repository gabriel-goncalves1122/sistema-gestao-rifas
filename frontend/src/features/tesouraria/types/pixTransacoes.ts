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

export type VeredictoCorrelacaoOcr =
  | "CORRELACAO_FORTE"
  | "CORRELACAO_PARCIAL"
  | "DIVERGENTE"
  | "SUSPEITO"
  | "ILEGIVEL";

export type CodigoAlertaOcr =
  | "AGENDAMENTO_DETECTADO"
  | "STATUS_CANCELADO_OU_RECUSADO"
  | "E2E_DUPLICADO"
  | "VALOR_DIVERGENTE"
  | "VALOR_NAO_ENCONTRADO"
  | "TXID_NAO_ENCONTRADO"
  | "TXID_DE_OUTRO_PEDIDO"
  | "RECEBEDOR_DIVERGENTE"
  | "COMPROVANTE_ANTERIOR_AO_PEDIDO"
  | "TEXTO_INSUFICIENTE";

/**
 * DTO `camelCase` da análise OCR e correlação do comprovante Pix retornado pela API.
 */
export interface AnaliseOcrDTO {
  statusExecucao: "CONCLUIDO" | "ERRO";
  veredicto: VeredictoCorrelacaoOcr | null;
  score: number | null;
  txidBate: boolean | null;
  valorBate: boolean | null;
  recebedorBate: boolean | null;
  e2eUnico: boolean | null;
  bancoDetectado: string | null;
  txidLido: string | null;
  e2eIdDetectado: string | null;
  valorLidoCentavos: number | null;
  dataTransacaoIso: string | null;
  recebedorDetectado: string | null;
  cnpjRecebedorDetectado: string | null;
  alertas: CodigoAlertaOcr[];
  motivos: string[];
  tempoMs: number;
  analisadoEm: string;
  erroMensagem?: string | null;
}

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
  origem?: "PIX" | "COMPROVANTE";
  comprovanteUrl?: string | null;
  chaveAcao?: string;
  analiseOcr?: AnaliseOcrDTO | null;
}

export interface ItemLoteValidacaoTransacao {
  id: string;
  chaveAcao?: string;
}

export interface ResultadoLoteValidacaoTransacoes {
  sucesso: boolean;
  processadas: number;
  ignoradas: number;
  erros: Array<{ id: string; erro: string }>;
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
  origem?: "todas" | "PIX" | "COMPROVANTE";
}
