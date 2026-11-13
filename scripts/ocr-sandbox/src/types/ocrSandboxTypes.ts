// ============================================================================
// ARQUIVO: scripts/ocr-sandbox/src/types/ocrSandboxTypes.ts
// ============================================================================

/** Tipo de arquivo detectado via magic bytes do buffer. */
export type TipoArquivoDetectado = "PDF" | "PNG" | "JPEG" | "WEBP" | "DESCONHECIDO";

/** Estratégia utilizada para obter o texto do documento. */
export type ModoExtracaoTexto =
  | "PDF_NATIVO"
  | "PDF_ESCANEADO_OCR"
  | "IMAGEM_OCR_BRUTO"
  | "IMAGEM_OCR_SHARP";

/** Veredicto determinístico da correlação entre o comprovante e o pedido no banco. */
export type VeredictoCorrelacao =
  | "CORRELACAO_FORTE"
  | "CORRELACAO_PARCIAL"
  | "DIVERGENTE"
  | "SUSPEITO"
  | "ILEGIVEL";

/** Alertas de risco ou divergência identificados na análise do texto ou correlação. */
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

/** Resultado bruto da etapa de extração de texto (PDF ou OCR). */
export interface ResultadoExtracaoTexto {
  tipoArquivo: TipoArquivoDetectado;
  modoExtracao: ModoExtracaoTexto;
  textoBruto: string;
  confiancaMediaOcr: number | null;
  tempoMs: number;
  memoriaDeltaMb: number;
  pdfEscaneado: boolean;
}

/** Dados estruturados extraídos de forma pura a partir do texto do comprovante. */
export interface DadosExtraidosComprovante {
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

/** Dados do pedido esperado (espelho do registro `pagamentos_pix` para teste isolado). */
export interface PedidoEsperadoCorrelacao {
  pagamentoId: string;
  txidEsperado: string;
  referenceId?: string;
  valorCentavos: number;
  recebedorEsperado?: string;
  recebedorAliases?: string[];
  cnpjRecebedorEsperado?: string;
  chavePixEsperada?: string;
  dataCriacaoIso?: string;
  e2eIdsJaUtilizados?: string[];
  toleranciaCentavos?: number;
}

/** Saída estruturada final da correlação, pronta para exibição na Tesouraria. */
export interface ResultadoCorrelacaoOcr {
  veredicto: VeredictoCorrelacao;
  score: number;
  txidBate: boolean;
  valorBate: boolean;
  recebedorBate: boolean | null;
  e2eUnico: boolean;
  alertas: CodigoAlertaOcr[];
  motivos: string[];
  extraido: DadosExtraidosComprovante;
}

/** Caso completo carregado da pasta local `amostras/` (`<nome>.caso.json`). */
export interface CasoTesteAmostra {
  descricao?: string;
  pedido: PedidoEsperadoCorrelacao;
  veredictoEsperado?: VeredictoCorrelacao;
}
