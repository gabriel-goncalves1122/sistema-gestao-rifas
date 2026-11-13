// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/contracts/ocrContracts.ts
// ============================================================================

/** Tipo de arquivo detectado via inspeção de magic bytes. */
export type TipoArquivoOcr = "PDF" | "PNG" | "JPEG" | "WEBP" | "DESCONHECIDO";

/** Estratégia utilizada para extrair o texto do comprovante. */
export type ModoExtracaoOcr =
  | "PDF_NATIVO"
  | "PDF_ESCANEADO_OCR"
  | "IMAGEM_OCR";

/** Veredicto consultivo da correlação entre o comprovante e o pedido. */
export type VeredictoCorrelacaoOcr =
  | "CORRELACAO_FORTE"
  | "CORRELACAO_PARCIAL"
  | "DIVERGENTE"
  | "SUSPEITO"
  | "ILEGIVEL";

/** Códigos padronizados de alertas gerados pela cadeia de análise e correlação. */
export type CodigoAlertaOcr =
  | "AGENDAMENTO_DETECTADO"
  | "STATUS_CANCELADO_OU_RECUSADO"
  | "E2E_DUPLICADO"
  | "VALOR_DIVERGENTE"
  | "VALOR_NAO_ENCONTRADO"
  | "TXID_NAO_ENCONTRADO"
  | "TXID_DE_OUTRO_PEDIDO"
  | "RECEBEDOR_DIVERGENTE"
  | "COMPROVANTE_ANTERIOR_AO_PEDIDO"
  | "TEXTO_INSUFICIENTE";

/** Resultado bruto retornado por uma `IExtratorDocumentoStrategy`. */
export interface ResultadoExtracaoDocumento {
  tipoArquivo: TipoArquivoOcr;
  modoExtracao: ModoExtracaoOcr;
  textoBruto: string;
  confiancaMediaOcr: number | null;
  pdfEscaneado: boolean;
}

/** Contrato OO das estratégias de extração de texto por tipo de mídia. */
export interface IExtratorDocumentoStrategy {
  /** Identifica se a estratégia suporta o tipo de arquivo detectado. */
  suporta(tipo: TipoArquivoOcr): boolean;
  /** Executa a extração de texto sobre o buffer binário do comprovante. */
  extrairTexto(buffer: Buffer, tipo: TipoArquivoOcr): Promise<ResultadoExtracaoDocumento>;
}

/** Contexto mutável compartilhado entre os elos da Chain of Responsibility. */
export interface ContextoAnaliseComprovante {
  textoBruto: string;
  textoUpper: string;
  bancoDetectado: string;
  txidLido: string | null;
  txidCandidatos: string[];
  e2eId: string | null;
  valorCentavos: number | null;
  valoresCandidatosCentavos: number[];
  dataTransacaoIso: string | null;
  recebedorDetectado: string | null;
  cnpjRecebedorDetectado: string | null;
  alertasTexto: CodigoAlertaOcr[];
}

/** Contrato OO para elos da Chain of Responsibility de extração de campos Pix. */
export interface IAnalisadorComprovanteHandler {
  /** Encadeia o próximo handler na sequência de análise. */
  definirProximo(proximo: IAnalisadorComprovanteHandler): IAnalisadorComprovanteHandler;
  /** Processa o contexto atual e delega ao próximo handler, se houver. */
  executar(contexto: ContextoAnaliseComprovante): void;
}

/** Dados esperados do pedido para correlação direta contra o Firestore. */
export interface PedidoCorrelacaoOcr {
  pagamentoId: string;
  txidEsperado: string;
  valorCentavos: number;
  recebedorEsperado?: string;
  recebedorAliases?: string[];
  cnpjRecebedorEsperado?: string;
  dataCriacaoIso?: string;
  toleranciaCentavos?: number;
}

/** Resultado completo da correlação antes da persistência. */
export interface ResultadoCorrelacaoOcr {
  veredicto: VeredictoCorrelacaoOcr;
  score: number;
  txidBate: boolean;
  valorBate: boolean;
  recebedorBate: boolean | null;
  e2eUnico: boolean;
  alertas: CodigoAlertaOcr[];
  motivos: string[];
}

/** Estrutura `snake_case` persistida no Firestore (`pagamentos_pix` e `bilhetes`). */
export interface AnaliseOcrFirestore {
  status_execucao: "CONCLUIDO" | "ERRO";
  veredicto: VeredictoCorrelacaoOcr | null;
  score: number | null;
  txid_bate: boolean | null;
  valor_bate: boolean | null;
  recebedor_bate: boolean | null;
  e2e_unico: boolean | null;
  banco_detectado: string | null;
  txid_lido: string | null;
  e2e_id_detectado: string | null;
  valor_lido_centavos: number | null;
  data_transacao_iso: string | null;
  recebedor_detectado: string | null;
  cnpj_recebedor_detectado: string | null;
  alertas: CodigoAlertaOcr[];
  motivos: string[];
  hash_comprovante: string | null;
  tempo_ms: number;
  analisado_em: string;
  erro_mensagem?: string | null;
}

/** DTO `camelCase` exposto pela API da Tesouraria para consumo futuro do frontend. */
export interface AnaliseOcrDTO {
  statusExecucao: "CONCLUIDO" | "ERRO";
  veredicto: VeredictoCorrelacaoOcr | null;
  score: number | null;
  txidBate: boolean | null;
  valorBate: boolean | null;
  recebedorBate: boolean | null;
  e2eUnico: boolean | null;
  bancoDetectado: string | null;
  txidLido: string | null;
  e2eIdDetectado: string | null;
  valorLidoCentavos: number | null;
  dataTransacaoIso: string | null;
  recebedorDetectado: string | null;
  cnpjRecebedorDetectado: string | null;
  alertas: CodigoAlertaOcr[];
  motivos: string[];
  tempoMs: number;
  analisadoEm: string;
  erroMensagem?: string | null;
}

/** Registro mínimo do pagamento carregado pelo repositório OCR. */
export interface PagamentoParaAnaliseOcr {
  pagamentoId: string;
  referenceId: string;
  pixOrderId: string | null;
  valorBrutoReais: number;
  statusPagamentoBanco: string;
  comprovanteUrl: string | null;
  hashComprovante: string | null;
  dataCriacaoIso: string;
  numerosRifas: string[];
  analiseOcrAtual?: AnaliseOcrFirestore | null;
}

/** Registro mínimo de compra direta por comprovante (sem `pagamentos_pix`). */
export interface CompraDiretaParaAnaliseOcr {
  identificador: string;
  compradorId: string | null;
  comprovanteUrl: string;
  valorTotalReais: number;
  dataCriacaoIso: string;
  numerosRifas: string[];
  analiseOcrAtual?: AnaliseOcrFirestore | null;
}

/** Contrato OO do repositório de persistência e Storage para análise OCR. */
export interface IOcrAnaliseRepository {
  buscarPagamentoPorId(pagamentoId: string): Promise<PagamentoParaAnaliseOcr | null>;
  resolverPagamentoIdPorTransacao(transacaoId: string): Promise<string | null>;
  buscarCompraDiretaPorBilhete?(
    identificador: string,
  ): Promise<CompraDiretaParaAnaliseOcr | null>;
  adquirirLockComprovanteDireto?(chaveLock: string): Promise<boolean>;
  baixarComprovanteStorage(caminhoOuUrl: string): Promise<Buffer>;
  existeOutroPagamentoComE2e(e2eId: string, pagamentoIdAtual: string): Promise<boolean>;
  salvarAnaliseOcr(
    pagamentoId: string,
    analise: AnaliseOcrFirestore,
    comprovanteUrlEsperado: string,
  ): Promise<void>;
  salvarAnaliseOcrCompraDireta?(
    numerosRifas: string[],
    comprovanteUrlEsperado: string,
    analise: AnaliseOcrFirestore,
  ): Promise<void>;
}

/**
 * Converte o subdocumento `snake_case` do Firestore em DTO `camelCase` para a API.
 *
 * @param {AnaliseOcrFirestore | null | undefined} analise - Objeto armazenado no banco.
 * @returns {AnaliseOcrDTO | null} DTO normalizado ou `null` quando inexistente.
 */
export function converterAnaliseOcrParaDto(
  analise?: AnaliseOcrFirestore | null,
): AnaliseOcrDTO | null {
  if (!analise) {
    return null;
  }

  return {
    statusExecucao: analise.status_execucao,
    veredicto: analise.veredicto ?? null,
    score: analise.score ?? null,
    txidBate: analise.txid_bate ?? null,
    valorBate: analise.valor_bate ?? null,
    recebedorBate: analise.recebedor_bate ?? null,
    e2eUnico: analise.e2e_unico ?? null,
    bancoDetectado: analise.banco_detectado ?? null,
    txidLido: analise.txid_lido ?? null,
    e2eIdDetectado: analise.e2e_id_detectado ?? null,
    valorLidoCentavos: analise.valor_lido_centavos ?? null,
    dataTransacaoIso: analise.data_transacao_iso ?? null,
    recebedorDetectado: analise.recebedor_detectado ?? null,
    cnpjRecebedorDetectado: analise.cnpj_recebedor_detectado ?? null,
    alertas: Array.isArray(analise.alertas) ? analise.alertas : [],
    motivos: Array.isArray(analise.motivos) ? analise.motivos : [],
    tempoMs: typeof analise.tempo_ms === "number" ? analise.tempo_ms : 0,
    analisadoEm: analise.analisado_em,
    erroMensagem: analise.erro_mensagem ?? null,
  };
}
