import { Bilhete, StatusBilhete } from "../../types/models";

export type StatusPagamentoPix =
  | "WAITING"
  | "PAID"
  | "AUTHORIZED"
  | "IN_ANALYSIS"
  | "DECLINED"
  | "CANCELED"
  | "ERROR";

export type StatusValidacaoPix = "aceita" | "negada";

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
  status?: StatusBilhete | string;
}

export interface BilheteComNumero extends Bilhete {
  numero: string;
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

  statusValidacao?: StatusValidacaoPix;
  observacao?: string;
}

export interface ResumoComprovantesTesouraria {
  comprovantesTransacoesPagas: number;
  comprovantesRifasPagas: number;
  comprovantesValorRecebido: number;
  comprovantesTransacoesPendentes: number;
  comprovantesRifasPendentes: number;
  comprovantesValorPendente: number;
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

export interface ResultadoSincronizacaoPix {
  sucesso: true;
  sincronizado: boolean;
  atualizados?: number;
  mensagem: string;
}

export interface DadosAtualizacaoCompradorCompra {
  nome: string;
  email?: string | null;
  telefone?: string | null;
}

export interface ResultadoReenvioEmailComprovante {
  comprador_id: string;
  email: string;
  rifas: string[];
  status: "aprovado";
}

export type OrigemTransacaoTesouraria = "PIX" | "COMPROVANTE";

export interface TransacaoTesouraria {
  id: string;
  dataReserva: string | null;
  dataPagamento: string | null;
  vendedorId?: string;
  vendedorNome: string;
  vendedorCpf: string;
  compradorId: string | null;
  compradorNome: string;
  compradorEmail: string;
  compradorTelefone: string;
  status: string;
  comprovanteUrl: string | null;
  bilhetes: string[];
  valorTotal: number;
  valorLiquido?: number;
  origem?: OrigemTransacaoTesouraria;
  pixOrderId?: string | null;
  statusPagamentoBanco?: string | null;
  statusValidacao?: string | null;
  correcaoPendente?: boolean;
}

/**
 * Representa uma transação resumida vinculada a um aderido específico no relatório consolidado.
 */
export interface TransacaoResumoAderido {
  id: string;
  compradorNome: string;
  dataPagamento: string | null;
  dataCriacao: string;
  valorBruto: number;
  valorPago: number;
  quantidadeRifas: number;
  rifas: RifaResumoTransacao[];
  origem: OrigemTransacaoTesouraria;
  statusPagamento: StatusPagamentoPix;
}

export interface AderidoRelatorioTesouraria {
  id: string;
  nome: string;
  cpf: string;
  curso?: string;
  modalidadeAdesao?: "completo" | "meio";
  cargo?: string;
  arrecadado: number;
  arrecadadoLiquido?: number;
  valorPix?: number;
  valorPixLiquido?: number;
  valorComprovante?: number;
  comprasCount?: number;
  meta: number;
  rifasVendidas: number;
  rifasVendidasPix?: number;
  rifasVendidasComprovante?: number;
  rifasPendentes?: number;
  transacoes?: TransacaoResumoAderido[];
}

export interface ResumoGeralRelatorioTesouraria {
  totalArrecadado: number;
  totalArrecadadoLiquido?: number;
  rifasPagas: number;
  rifasPagasPix?: number;
  rifasPagasComprovante?: number;
  valorArrecadadoPixBruto?: number;
  valorArrecadadoPixLiquido?: number;
  valorArrecadadoComprovante?: number;
  rifasPendentes?: number;
  rifasPendentesPix?: number;
  rifasPendentesComprovante?: number;
  aderidosAtivos: number;
}

export interface RelatorioTesourariaResponse {
  resumoGeral: ResumoGeralRelatorioTesouraria;
  aderidos: AderidoRelatorioTesouraria[];
}
