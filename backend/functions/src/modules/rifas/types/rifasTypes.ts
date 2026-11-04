// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/types/rifasTypes.ts
// ============================================================================

export interface DadosVenda {
  nome: string;
  telefone: string;
  email?: string;
  numerosRifas: string[];
  comprovanteUrl: string;
}

export interface DadosCorrecaoRifas {
  nome: string;
  telefone: string;
  email: string;
  comprovanteUrl: string;
}

export interface DadosCorrecaoDadosRifas {
  nome: string;
  telefone: string;
  email?: string;
}

export interface AderidoRifasContexto {
  idAderido: string;
  vendedorNome: string;
  vendedorCpf: string;
}

/**
 * Representa um item individual de bilhete vendido no relatório de vendas do aderido.
 */
export interface ItemVendaRelatorioAderidoDTO {
  numeroRifa: number;
  compradorNome: string;
  compradorTelefone: string;
  compradorEmail: string;
  status: "pago" | "pendente";
  statusFormatado: "Pago" | "Em análise";
  valor: number;
  canal: "pix" | "comprovante" | "outro";
  data: string | null;
  orderId: string | null;
}

/**
 * Resumo estatístico consolidado do lote de rifas e vendas do aderido.
 */
export interface ResumoRelatorioAderidoDTO {
  totalRifasLote: number;
  totalVendidas: number;
  rifasPagas: number;
  valorPagoConfirmado: number;
  rifasEmAnalise: number;
  valorEmAnalise: number;
  rifasDisponiveis: number;
  valorTotalNegociado: number;
}

/**
 * DTO completo retornado pelo backend contendo o relatório de vendas de um aderido.
 */
export interface RelatorioVendasAderidoDTO {
  aderido: {
    nome: string;
    email: string;
  };
  geradoEm: string;
  resumo: ResumoRelatorioAderidoDTO;
  itens: ItemVendaRelatorioAderidoDTO[];
}
