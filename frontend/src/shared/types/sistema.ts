/**
 * DTO que reflete o estado do modo de manutenção retornado pelo backend.
 */
export interface ManutencaoStatusDto {
  emManutencao: boolean;
  mensagem: string;
  previsaoRetorno: string | null;
  atualizadoEm: string | null;
  atualizadoPor: string | null;
}

/**
 * Payload para alteração do modo de manutenção via endpoint administrativo.
 */
export interface AtualizarManutencaoPayload {
  emManutencao: boolean;
  mensagem?: string;
  previsaoRetorno?: string | null;
}
