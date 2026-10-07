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
}

export interface DadosCorrecaoRecusa {
  nome: string;
  email: string;
  telefone: string;
}
