import { FieldValue, Timestamp } from "firebase-admin/firestore";

/**
 * Representação interna persistida no documento `configuracoes/manutencao` no Firestore.
 */
export interface ManutencaoFirestoreDoc {
  em_manutencao: boolean;
  mensagem: string;
  previsao_retorno?: string | null;
  atualizado_em?: Timestamp | FieldValue;
  atualizado_por?: string | null;
}

/**
 * DTO público retornado pelas APIs em formato camelCase.
 */
export interface ManutencaoStatusDto {
  emManutencao: boolean;
  mensagem: string;
  previsaoRetorno: string | null;
  atualizadoEm: string | null;
  atualizadoPor: string | null;
}

/**
 * Payload esperado na rota administrativa PUT /admin/manutencao.
 */
export interface AtualizarManutencaoPayload {
  emManutencao: boolean;
  mensagem?: string;
  previsaoRetorno?: string | null;
}
