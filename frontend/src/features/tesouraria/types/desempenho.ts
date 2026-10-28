import { RifaResumoTransacao, StatusPagamentoPix } from "./pixTransacoes";

export interface ResumoGeralDesempenho {
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

export interface TransacaoResumoAderido {
  id: string;
  compradorNome: string;
  dataPagamento: string | null;
  dataCriacao: string;
  valorBruto: number;
  valorPago: number;
  quantidadeRifas: number;
  rifas: RifaResumoTransacao[];
  origem: "PIX" | "COMPROVANTE";
  statusPagamento: StatusPagamentoPix;
}

export interface AderidoMetricaDesempenho {
  id?: string;
  nome?: string;
  cpf?: string;
  vendedorId?: string;
  vendedorNome?: string;
  vendedorCpf?: string;
  curso?: string;
  modalidadeAdesao?: "completo" | "meio";
  cargo?: string;
  arrecadado: number;
  arrecadadoLiquido?: number;
  valorTotal?: number;
  valorPix?: number;
  valorPixLiquido?: number;
  valorComprovante?: number;
  meta: number;
  rifasVendidas?: number;
  rifasVendidasPix?: number;
  rifasVendidasComprovante?: number;
  rifasPendentes?: number;
  comprasCount?: number;
  ultimaVendaEm?: string | null;
  transacoes?: TransacaoResumoAderido[];
}

export interface TransacaoDesempenho {
  status: string;
  dataReserva: string;
  dataPagamento?: string | null;
  valorTotal: number;
  origem?: "PIX" | "COMPROVANTE";
}

export interface RelatorioTesourariaResponse {
  resumoGeral: ResumoGeralDesempenho;
  aderidos: AderidoMetricaDesempenho[];
}

export type RelatorioDesempenho = RelatorioTesourariaResponse;

export interface ReceitaPorDiaDesempenho {
  data: string;
  dataOrdenacao: number;
  valor: number;
  valorPix: number;
  valorComprovante: number;
}

export interface BarraResumoDesempenho {
  label: string;
  valor: number;
  cor: string;
}

export interface AderidoRankingDesempenho extends AderidoMetricaDesempenho {
  posicao: number;
  percentualMeta: number;
  bateuMeta: boolean;
}

export interface DesempenhoDados {
  resumoGeral: ResumoGeralDesempenho;
  receitaPorDia: ReceitaPorDiaDesempenho[];
  status: {
    pagas: number;
    pendentes: number;
    recusadas: number;
    total: number;
    barras: BarraResumoDesempenho[];
  };
  metas: {
    bateramMeta: number;
    abaixoMeta: number;
    total: number;
    barras: BarraResumoDesempenho[];
  };
  origem: {
    total: number;
    barras: BarraResumoDesempenho[];
  };
  rankingAderidos: AderidoRankingDesempenho[];
}
