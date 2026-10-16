/**
 * Representa o estado sincronizado dos contadores globais de adesão de aderidos
 * e bilhetes de rifas distribuídos.
 */
export interface EstadoContadorAderidos {
  /** Última posição sequencial de adesão atribuída a um aderido. */
  ultimaPosicao: number;
  /** Maior número de bilhete de rifa já alocado sequencialmente. */
  ultimoBilhete: number;
}

/**
 * Interface mínima estrutural para documentos do Firestore no formato legado.
 */
interface DocumentoLegado {
  id?: string;
  data?: () => unknown;
}

const ESTADO_CONTADOR_VAZIO: EstadoContadorAderidos = {
  ultimaPosicao: 0,
  ultimoBilhete: 0,
};

/**
 * Extrai com segurança o dicionário de dados de um snapshot de documento legado do Firestore.
 *
 * @param {DocumentoLegado} doc - Objeto ou snapshot de documento contendo o método data().
 * @returns {Record<string, unknown>} Dicionário com os campos do documento ou objeto vazio.
 */
function lerDados(doc: DocumentoLegado): Record<string, unknown> {
  const dados = doc.data?.();
  return dados && typeof dados === "object" ? (dados as Record<string, unknown>) : {};
}

/**
 * Converte e sanitiza com segurança qualquer valor para um número inteiro positivo (> 0).
 *
 * @param {unknown} valor - Valor numérico, string ou indefinido a ser parseado.
 * @returns {number} Inteiro estritamente positivo ou 0 caso inválido/menor ou igual a zero.
 */
function numeroInteiroPositivo(valor: unknown): number {
  const numero =
    typeof valor === "number"
      ? valor
      : typeof valor === "string"
        ? Number.parseInt(valor.replace(/\D/g, ""), 10)
        : Number.NaN;

  return Number.isFinite(numero) && numero > 0 ? Math.floor(numero) : 0;
}

/**
 * Extrai o índice numérico sequencial da posição a partir do ID padrão de documento aderido (`ADERIDO_{posicao}`).
 *
 * @param {string} [id] - Identificador único do documento (ex: "ADERIDO_42").
 * @returns {number} Número da posição de adesão ou 0 se o formato não casar.
 */
function extrairPosicaoPorId(id?: string): number {
  const match = id?.match(/^ADERIDO_(\d+)$/i);
  return match ? numeroInteiroPositivo(match[1]) : 0;
}

/**
 * Extrai o número final da faixa de rifas reservadas para o aderido a partir dos dados do documento.
 *
 * @param {Record<string, unknown>} dados - Payload de dados do usuário/aderido no Firestore.
 * @returns {number} Limite superior numérico da faixa de bilhetes alocada ou 0.
 */
function extrairFimFaixaRifas(dados: Record<string, unknown>): number {
  const faixa = dados.faixa_rifas;

  if (!faixa || typeof faixa !== "object") {
    return 0;
  }

  return numeroInteiroPositivo((faixa as Record<string, unknown>).fim);
}

/**
 * Reconstrói o estado dos contadores globais inspecionando os documentos legados de usuários e bilhetes.
 * Útil para fallbacks e recuperação de consistência quando o documento de contadores não existe.
 *
 * @param {DocumentoLegado[]} usuarioDocs - Coleção de documentos de usuários/aderidos do Firestore.
 * @param {DocumentoLegado[]} bilheteDocs - Coleção de documentos da coleção de bilhetes.
 * @returns {EstadoContadorAderidos} Maior posição e maior bilhete encontrados no histórico.
 */
export function reconstruirEstadoContadorAderidosLegado(
  usuarioDocs: DocumentoLegado[],
  bilheteDocs: DocumentoLegado[],
): EstadoContadorAderidos {
  const ultimaPosicao = usuarioDocs.reduce((maior, doc) => {
    const dados = lerDados(doc);
    return Math.max(
      maior,
      numeroInteiroPositivo(dados.posicao_adesao),
      extrairPosicaoPorId(doc.id),
    );
  }, ESTADO_CONTADOR_VAZIO.ultimaPosicao);

  const maiorBilheteEmUsuarios = usuarioDocs.reduce((maior, doc) => {
    return Math.max(maior, extrairFimFaixaRifas(lerDados(doc)));
  }, ESTADO_CONTADOR_VAZIO.ultimoBilhete);

  const maiorBilheteEmBilhetes = bilheteDocs.reduce((maior, doc) => {
    const dados = lerDados(doc);
    return Math.max(
      maior,
      numeroInteiroPositivo(doc.id),
      numeroInteiroPositivo(dados.numero),
    );
  }, ESTADO_CONTADOR_VAZIO.ultimoBilhete);

  return {
    ultimaPosicao,
    ultimoBilhete: Math.max(maiorBilheteEmUsuarios, maiorBilheteEmBilhetes),
  };
}

/**
 * Normaliza os valores brutos do documento de contadores do Firestore para o tipo de domínio `EstadoContadorAderidos`.
 *
 * @param {Record<string, unknown> | undefined} dados - Dados brutos do documento `configuracoes/contadores_aderidos`.
 * @param {EstadoContadorAderidos} [fallback=ESTADO_CONTADOR_VAZIO] - Valores padrão caso os campos estejam ausentes.
 * @returns {EstadoContadorAderidos} Objeto com última posição e último bilhete válidos.
 */
export function normalizarEstadoContadorAderidos(
  dados: Record<string, unknown> | undefined,
  fallback: EstadoContadorAderidos = ESTADO_CONTADOR_VAZIO,
): EstadoContadorAderidos {
  return {
    ultimaPosicao:
      numeroInteiroPositivo(dados?.ultima_posicao) || fallback.ultimaPosicao,
    ultimoBilhete:
      numeroInteiroPositivo(dados?.ultimo_bilhete) || fallback.ultimoBilhete,
  };
}
