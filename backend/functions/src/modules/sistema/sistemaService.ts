import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../../shared/config/firebaseAdmin";
import {
  AtualizarManutencaoPayload,
  ManutencaoFirestoreDoc,
  ManutencaoStatusDto,
} from "./sistemaTypes";

export const MENSAGEM_PADRAO_MANUTENCAO =
  "Estamos realizando uma manutenção programada para melhorias no sistema. Voltaremos em breve!";

const DOC_CONFIG_MANUTENCAO = "configuracoes/manutencao";

/**
 * Cache em memória volátil de curta duração para otimizar chamadas repetitivas
 * do middleware de manutenção e reduzir custos de leitura no Firestore.
 */
let statusEmCache: {
  dto: ManutencaoStatusDto;
  expiraEm: number;
} | null = null;

const TTL_CACHE_MS = 5_000; // 5 segundos

/**
 * Mapeia os dados brutos do Firestore em formato snake_case para o DTO camelCase.
 *
 * @param {Partial<ManutencaoFirestoreDoc> | undefined} dados - Dados brutos do documento.
 * @returns {ManutencaoStatusDto} DTO formatado para consumo seguro na borda.
 */
export function mapearParaManutencaoDto(
  dados?: Partial<ManutencaoFirestoreDoc>,
): ManutencaoStatusDto {
  let atualizadoEmIso: string | null = null;

  if (dados?.atualizado_em) {
    if (dados.atualizado_em instanceof Timestamp) {
      atualizadoEmIso = dados.atualizado_em.toDate().toISOString();
    } else if (
      typeof (dados.atualizado_em as unknown as { toDate?: () => Date })
        ?.toDate === "function"
    ) {
      atualizadoEmIso = (
        dados.atualizado_em as unknown as { toDate: () => Date }
      )
        .toDate()
        .toISOString();
    }
  }

  return {
    emManutencao: Boolean(dados?.em_manutencao),
    mensagem: dados?.mensagem?.trim() || MENSAGEM_PADRAO_MANUTENCAO,
    previsaoRetorno: dados?.previsao_retorno?.trim() || null,
    atualizadoEm: atualizadoEmIso,
    atualizadoPor: dados?.atualizado_por || null,
  };
}

/**
 * Invalida explicitamente o cache em memória (usado após mutações ou em testes).
 */
export function invalidarCacheManutencao(): void {
  statusEmCache = null;
}

/**
 * Consulta o status atual do modo de manutenção no Firestore com cache volátil de 5s.
 * Se o documento ainda não existir, retorna um status padrão seguro com `emManutencao: false`.
 *
 * @param {boolean} [ignorarCache=false] - Força a leitura direta do Firestore.
 * @returns {Promise<ManutencaoStatusDto>} DTO do status de manutenção.
 */
export async function obterStatusManutencao(
  ignorarCache = false,
): Promise<ManutencaoStatusDto> {
  const agora = Date.now();

  if (!ignorarCache && statusEmCache && agora < statusEmCache.expiraEm) {
    return statusEmCache.dto;
  }

  const docRef = db.doc(DOC_CONFIG_MANUTENCAO);
  const snap = await docRef.get();

  const dados = snap.exists
    ? (snap.data() as ManutencaoFirestoreDoc)
    : undefined;

  const dto = mapearParaManutencaoDto(dados);

  statusEmCache = {
    dto,
    expiraEm: agora + TTL_CACHE_MS,
  };

  return dto;
}

/**
 * Atualiza atomicamente o status de manutenção do sistema via transação Firestore.
 * Garante concorrência segura (TOCTOU) e atualiza o histórico de auditoria (`atualizado_por`, `atualizado_em`).
 *
 * @param {AtualizarManutencaoPayload} payload - Novos parâmetros do modo de manutenção.
 * @param {string} [adminEmail] - Email do administrador que executou a ação.
 * @returns {Promise<ManutencaoStatusDto>} DTO atualizado do status de manutenção.
 * @transactional Executa leitura e escrita atômica dentro de `db.runTransaction`.
 * @sideEffects Gravação no documento `configuracoes/manutencao` do Firestore.
 */
export async function atualizarStatusManutencao(
  payload: AtualizarManutencaoPayload,
  adminEmail?: string,
): Promise<ManutencaoStatusDto> {
  const docRef = db.doc(DOC_CONFIG_MANUTENCAO);

  const resultadoDto = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(docRef);
    const dadosAtuais = snap.exists
      ? (snap.data() as ManutencaoFirestoreDoc)
      : null;

    const mensagemFinal =
      payload.mensagem !== undefined && payload.mensagem.trim().length > 0
        ? payload.mensagem.trim()
        : dadosAtuais?.mensagem || MENSAGEM_PADRAO_MANUTENCAO;

    const previsaoFinal =
      payload.previsaoRetorno !== undefined
        ? payload.previsaoRetorno && payload.previsaoRetorno.trim().length > 0
          ? payload.previsaoRetorno.trim()
          : null
        : dadosAtuais?.previsao_retorno || null;

    const novosDados: Record<string, unknown> = {
      em_manutencao: payload.emManutencao,
      mensagem: mensagemFinal,
      previsao_retorno: previsaoFinal,
      atualizado_em: FieldValue.serverTimestamp(),
      atualizado_por: adminEmail || dadosAtuais?.atualizado_por || "sistema",
    };

    transaction.set(docRef, novosDados, { merge: true });

    return {
      emManutencao: payload.emManutencao,
      mensagem: mensagemFinal,
      previsaoRetorno: previsaoFinal,
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: adminEmail || dadosAtuais?.atualizado_por || "sistema",
    };
  });

  // Invalida cache imediatamente após confirmação da transação
  invalidarCacheManutencao();

  return resultadoDto;
}
