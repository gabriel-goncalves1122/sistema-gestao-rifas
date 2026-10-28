// ============================================================================
// ARQUIVO: frontend/src/shared/types/secretaria.ts
// ============================================================================

export type StatusCadastro = "ativo" | "pendente" | "inativo";
export type StatusCadastroSecretaria = StatusCadastro;

export type ModalidadeAdesao = "completo" | "meio";

export type FiltroTipoUsuario = "todos" | "comissao" | "aderidos";

export interface FaixaRifasSecretaria {
  inicio?: string;
  fim?: string;
}

export interface AderidoSecretaria {
  id: string;
  id_aderido?: string;

  nome?: string;
  email: string;
  telefone?: string;
  cpf?: string;
  curso?: string;
  genero?: string;
  data_nascimento?: string;

  cargo?: string | null;
  modalidade_adesao?: ModalidadeAdesao;

  status?: string;
  status_cadastro: StatusCadastro;

  posicao_adesao?: number;
  faixa_rifas?: FaixaRifasSecretaria;

  meta_vendas?: number;
  total_arrecadado?: number;
  rifas_vendidas?: number;

  uid?: string | null;
  criado_em?: string;
  cadastrado_em?: string; // Legado frontend fallback
}

export type GetAderidosResponse = AderidoSecretaria[];

export interface FormNovoAderido {
  email: string;
  nome: string;
  curso: string;
  telefone: string;
  data_nascimento?: string;
  dataNascimento?: string;
  cargo: string;
  modalidade_adesao: ModalidadeAdesao;
}

export interface FormEditarAderido {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  curso: string;
  genero: string;
  data_nascimento?: string;
  dataNascimento?: string;
  cargo: string;
  status_cadastro: StatusCadastro;
}

export type PostAderidoRequest = FormNovoAderido;
export interface PostAderidoResponse {
  idAderido: string;
  modalidade?: ModalidadeAdesao;
  bilhetesGerados: number;
  faixaRifas: FaixaRifasSecretaria;
}

export type PutAderidoRequest = FormEditarAderido;
export interface PutAderidoResponse {
  idAderido: string;
  camposAtualizados: string[];
}
