
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

export interface AderidoMetricaDesempenho {
  id?: string;
  nome?: string;
  cpf?: string;
  curso?: string;
  modalidadeAdesao?: "completo" | "meio";
  cargo?: string;
  arrecadado: number;
  arrecadadoLiquido?: number;
  meta: number;
  rifasVendidas?: number;
  rifasVendidasPix?: number;
  rifasVendidasComprovante?: number;
  rifasPendentes?: number;
}

export interface TransacaoDesempenho {
  status: string;
  dataReserva: string;
  dataPagamento?: string | null;
  valorTotal: number;
  origem?: "PIX" | "COMPROVANTE";
}

export interface ReceitaPorDiaDesempenho {
  data: string;
  dataOrdenacao: number;
  valor: number;
}

export interface BarraResumoDesempenho {
  label: string;
  valor: number;
  cor: string;
}

export interface DesempenhoDados {
  resumoGeral: ResumoGeralDesempenho;
  receitaPorDia: ReceitaPorDiaDesempenho[];
  status: {
    pagas: number;
    pendentes: number;
    total: number;
    barras: BarraResumoDesempenho[];
  };
  metas: {
    bateramMeta: number;
    abaixoMeta: number;
    total: number;
    barras: BarraResumoDesempenho[];
  };
}
