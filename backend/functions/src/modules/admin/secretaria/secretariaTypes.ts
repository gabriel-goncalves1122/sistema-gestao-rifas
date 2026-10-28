// ============================================================================
// ARQUIVO: backend/functions/src/modules/admin/secretaria/secretariaTypes.ts
// ============================================================================
import { CargoComissao } from "../../types/models";

export type ModalidadeAdesao = "completo" | "meio";

export type StatusCadastroSecretaria = "pendente" | "ativo" | "inativo";

export interface DadosNovoAderido {
  email: string;
  nome?: string;
  curso?: string;
  data_nascimento?: string;
  dataNascimento?: string;
  telefone?: string;
  cargo?: CargoComissao;
  modalidade_adesao?: ModalidadeAdesao;
}

export interface DadosAtualizacaoAderido {
  nome?: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  curso?: string;
  genero?: string;
  data_nascimento?: string;
  dataNascimento?: string;
  cargo?: CargoComissao;
  status_cadastro?: StatusCadastroSecretaria;
}

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
  status_cadastro: StatusCadastroSecretaria;

  posicao_adesao?: number;
  faixa_rifas?: FaixaRifasSecretaria;

  meta_vendas?: number;
  total_arrecadado?: number;
  rifas_vendidas?: number;

  uid?: string | null;
  criado_em?: string;
}

export type GetAderidosResponse = AderidoSecretaria[];

export type PostAderidoRequest = DadosNovoAderido;
export interface PostAderidoResponse {
  idAderido: string;
  modalidade?: ModalidadeAdesao;
  bilhetesGerados: number;
  faixaRifas: FaixaRifasSecretaria;
}

export type PutAderidoRequest = DadosAtualizacaoAderido;
export interface PutAderidoResponse {
  idAderido: string;
  camposAtualizados: string[];
}
