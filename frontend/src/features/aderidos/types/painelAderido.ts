// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/types/painelAderido.ts
// ============================================================================
import { NotificacaoRifa } from "@/shared/types/notificacoes";

export type VisaoPainelAderido = "geral" | "recusadas";

export type FiltroRifasAderido =
  | "todas"
  | "disponivel"
  | "reservado"
  | "pendente"
  | "pago"
  | "recusado";

export interface RifaAderido {
  numero: string;
  status: string;
  correcao_pendente?: boolean | null;

  // Dados do vendedor/aderido. Nem sempre vêm da API, por isso são opcionais.
  vendedor_id?: string | null;
  vendedor_nome?: string | null;
  vendedor_email?: string | null;

  comprador_nome?: string;
  comprador_email?: string;
  comprador_telefone?: string;

  data_reserva?: string | null;
  data_pagamento?: string | null;

  comprovante_url?: string | null;
  motivo_recusa?: string | null;
  pix_order_id?: string | null;
  comprador_id?: string | null;
}

export type NotificacaoAderido = NotificacaoRifa;

export interface GrupoRifasRecusadas {
  comprador: string;
  email: string;
  telefone: string;
  data: string | null;
  motivo: string;
  bilhetes: string[];
  apenasCorrecaoCadastro?: boolean;
}

export interface DadosCorrecaoRecusa {
  nome: string;
  email: string;
  telefone: string;
}

/**
 * Item individual de bilhete vendido no relatório de vendas do aderido.
 */
export interface ItemVendaRelatorioAderido {
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
 * Resumo estatístico do lote de rifas e vendas do aderido.
 */
export interface ResumoRelatorioAderido {
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
 * Relatório completo retornado pelo backend com vendas e estatísticas do aderido.
 */
export interface RelatorioVendasAderido {
  aderido: {
    nome: string;
    email: string;
  };
  geradoEm: string;
  resumo: ResumoRelatorioAderido;
  itens: ItemVendaRelatorioAderido[];
}
