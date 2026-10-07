// ============================================================================
// ARQUIVO: backend/functions/src/modules/types/models.ts
// ============================================================================

// ----------------------------------------------------------------------------
// CARGOS E PERFIS DO SISTEMA
// ----------------------------------------------------------------------------

export type CargoComissao =
  | "admin"
  | "presidencia"
  | "rh"
  | "tesouraria"
  | "marketing"
  | "eventos"
  | "secretaria"
  | "diretor_secretaria"
  | "vice_secretaria"
  | "membro_secretaria"
  | "membro"
  | "aderido";

export type StatusCadastro = "ativo" | "pendente" | "inativo";

export type ModalidadeAdesao = "completo" | "meio";

// ----------------------------------------------------------------------------
// USUÁRIO / ADERIDO / MEMBRO DA COMISSÃO
// Coleção: usuarios
// ----------------------------------------------------------------------------

export interface FaixaRifas {
  inicio?: string;
  fim?: string;
}

export interface Usuario {
  // Identificação principal
  id?: string;
  id_aderido?: string;
  uid?: string | null;

  // Dados pessoais
  nome?: string;
  email: string | null;
  telefone?: string;
  cpf?: string;
  curso?: string;
  genero?: string;
  data_nascimento?: string;

  // Permissões e classificação
  role?: CargoComissao | string | null;
  cargo?: CargoComissao | string | null;
  modalidade_adesao?: ModalidadeAdesao;

  // Status operacional
  status?: StatusCadastro | string;

  // Dados comerciais
  posicao_adesao?: number;
  faixa_rifas?: FaixaRifas;
  meta_vendas?: number;
  total_arrecadado?: number;
  rifas_vendidas?: number;

  // Datas
  criado_em?: string;
}

// ----------------------------------------------------------------------------
// COMPRADOR
// Coleção: compradores
// ----------------------------------------------------------------------------

export interface Comprador {
  id: string;
  nome: string;
  email?: string | null;
  telefone: string;
  criado_em: string;
}

// ----------------------------------------------------------------------------
// BILHETE / RIFA
// Coleção: bilhetes
// ----------------------------------------------------------------------------

export type StatusBilhete =
  | "disponivel"
  | "reservado"
  | "pendente"
  | "pago"
  | "recusado";

export type StatusPagamentoBanco =
  | "CRIANDO"
  | "ERRO_CRIACAO"
  | "pending"
  | "approved"
  | "authorized"
  | "in_process"
  | "in_mediation"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back"
  | "WAITING"
  | "PAID"
  | "AUTHORIZED"
  | "IN_ANALYSIS"
  | "DECLINED"
  | "CANCELED"; // Mapped from uppercase legacy states, kept for backward compatibility

export type StatusValidacaoTesouraria = "aceita" | "negada";

export interface Bilhete {
  numero: string;
  status: StatusBilhete;
  correcao_pendente?: boolean | null;

  // Dados do vendedor/aderido
  vendedor_id?: string;
  vendedor_nome?: string;
  vendedor_cpf?: string;
  vendedor_email?: string | null;

  // Dados do comprador
  comprador_id?: string | null;
  comprador_nome?: string;
  comprador_email?: string | null;
  comprador_telefone?: string | null;

  // Datas do fluxo da venda
  data_reserva?: string | null;
  data_pagamento?: string | null;
  data_expiracao?: string | null;
  sessao_checkout_id?: string | null;

  // Comprovante e auditoria
  comprovante_url?: string | null;
  log_automacao?: string | null;
  motivo_recusa?: string | null;

  // Pix dinâmico e validação da tesouraria
  pix_order_id?: string | null;
  pix_qr_code_id?: string | null;
  pix_reference_id?: string | null;
  status_pagamento_banco?: StatusPagamentoBanco | string | null;
  status_validacao?: StatusValidacaoTesouraria | string | null;
  valor_bruto?: number | null;
  valor_pago?: number | null;
  validado_em?: string | null;
  validado_por?: string | null;
}

// ----------------------------------------------------------------------------
// PAGAMENTO PIX
// Coleção: pagamentos_pix
// ----------------------------------------------------------------------------

export interface PagamentoPix {
  id: string;
  reference_id: string;
  comprador_id: string;
  vendedor_id: string;
  vendedor_nome?: string;
  comprador_nome: string;
  comprador_email?: string | null;
  comprador_telefone?: string | null;
  comprador_documento?: string | null;
  numeros_rifas: string[];
  valor_bruto: number;
  valor_pago: number;
  status_pagamento_banco: StatusPagamentoBanco | string;
  status_validacao?: StatusValidacaoTesouraria | string | null;
  pix_order_id?: string | null;
  pix_qr_code_id?: string | null;
  copia_e_cola?: string | null;
  qr_code_imagem_url?: string | null;
  qr_code_base64?: string | null;
  data_criacao: string;
  data_pagamento?: string | null;
  data_expiracao?: string | null;
  validado_em?: string | null;
  validado_por?: string | null;
  motivo_negacao?: string | null;
  raw_mercadopago?: Record<string, unknown> | null;
  idempotency_key?: string | null;
  erro_criacao?: string | null;
}

// ----------------------------------------------------------------------------
// PRÊMIO
// Coleção: premios
// ----------------------------------------------------------------------------

export interface Premio {
  id: string;
  colocacao: number;
  nome: string;
  descricao?: string;
  imagem_url?: string;
  ganhador_numero?: string;
  ganhador_nome?: string;
  ativo: boolean;
}

// ----------------------------------------------------------------------------
// CONFIGURAÇÕES DO SORTEIO
// Coleção: configuracoes/sorteio
// ----------------------------------------------------------------------------

export interface InfoSorteio {
  titulo: string;
  data: string;
  descricao: string;
}

// ----------------------------------------------------------------------------
// NOTIFICAÇÕES
// Coleção: notificacoes
// ----------------------------------------------------------------------------

export interface Notificacao {
  id: string;
  vendedor_id: string;
  titulo: string;
  mensagem: string;
  rifas: string[];
  tipo?: "correcao_dados" | "rifa_liberada" | "informativo";
  lida: boolean;
  data_criacao: string;
}
