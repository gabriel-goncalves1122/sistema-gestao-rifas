// ============================================================================
// ARQUIVO: scripts/ocr-sandbox/src/pipeline/analisarComprovanteSandbox.ts
// ============================================================================

import { correlacionarComprovante } from "../correlation/correlacionadorComprovante.js";
import { detectarTipoArquivoPorBytes } from "../extractors/detectorTipoArquivo.js";
import { extrairTextoOuImagemDePdf } from "../extractors/extratorPdfNativo.js";
import { preprocessarImagemParaOcr } from "../extractors/preprocessadorImagem.js";
import { TesseractWorkerManager } from "../extractors/tesseractWorkerManager.js";
import { extrairCamposPix } from "../parsers/extratorCamposPix.js";
import {
  DadosExtraidosComprovante,
  ModoExtracaoTexto,
  PedidoEsperadoCorrelacao,
  ResultadoCorrelacaoOcr,
  ResultadoExtracaoTexto,
} from "../types/ocrSandboxTypes.js";

/** Opções de execução do pipeline no sandbox isolado. */
export interface OpcoesPipelineSandbox {
  usarPreprocessamentoSharp?: boolean;
  workerManager: TesseractWorkerManager;
}

/** Resultado completo contendo extração, campos extraídos e correlação opcional. */
export interface ResultadoAnaliseSandbox {
  extracao: ResultadoExtracaoTexto;
  extraido: DadosExtraidosComprovante;
  correlacao: ResultadoCorrelacaoOcr | null;
}

function calcularRssMb(): number {
  return process.memoryUsage().rss / (1024 * 1024);
}

/**
 * Executa apenas a extração de texto (PDF nativo ou OCR de imagem/PDF escaneado)
 * registrando tempo decorrido e variação aproximada de memória RSS.
 *
 * @param {Buffer} buffer - Conteúdo binário do comprovante.
 * @param {OpcoesPipelineSandbox} opcoes - Configurações do motor OCR e worker.
 * @returns {Promise<ResultadoExtracaoTexto>} Texto extraído e métricas técnicas.
 */
export async function extrairTextoComprovanteSandbox(
  buffer: Buffer,
  opcoes: OpcoesPipelineSandbox,
): Promise<ResultadoExtracaoTexto> {
  const inicioMs = performance.now();
  const rssAntesMb = calcularRssMb();
  const tipoArquivo = detectarTipoArquivoPorBytes(buffer);
  const usarSharp = opcoes.usarPreprocessamentoSharp ?? true;

  if (tipoArquivo === "DESCONHECIDO") {
    return {
      tipoArquivo,
      modoExtracao: "IMAGEM_OCR_BRUTO",
      textoBruto: "",
      confiancaMediaOcr: null,
      tempoMs: Math.round(performance.now() - inicioMs),
      memoriaDeltaMb: Number((calcularRssMb() - rssAntesMb).toFixed(2)),
      pdfEscaneado: false,
    };
  }

  let bufferParaOcr: Buffer | null = null;
  let pdfEscaneado = false;
  let modoExtracao: ModoExtracaoTexto = usarSharp
    ? "IMAGEM_OCR_SHARP"
    : "IMAGEM_OCR_BRUTO";

  if (tipoArquivo === "PDF") {
    const leituraPdf = await extrairTextoOuImagemDePdf(buffer);
    if (!leituraPdf.pdfEscaneado) {
      return {
        tipoArquivo,
        modoExtracao: "PDF_NATIVO",
        textoBruto: leituraPdf.textoNativo,
        confiancaMediaOcr: null,
        tempoMs: Math.round(performance.now() - inicioMs),
        memoriaDeltaMb: Number((calcularRssMb() - rssAntesMb).toFixed(2)),
        pdfEscaneado: false,
      };
    }

    pdfEscaneado = true;
    modoExtracao = "PDF_ESCANEADO_OCR";
    bufferParaOcr = leituraPdf.bufferPaginaEscaneada;
  } else {
    bufferParaOcr = buffer;
  }

  if (!bufferParaOcr) {
    return {
      tipoArquivo,
      modoExtracao,
      textoBruto: "",
      confiancaMediaOcr: 0,
      tempoMs: Math.round(performance.now() - inicioMs),
      memoriaDeltaMb: Number((calcularRssMb() - rssAntesMb).toFixed(2)),
      pdfEscaneado,
    };
  }

  const bufferProcessado = usarSharp
    ? await preprocessarImagemParaOcr(bufferParaOcr)
    : bufferParaOcr;

  const resultadoOcr = await opcoes.workerManager.reconhecer(bufferProcessado);

  return {
    tipoArquivo,
    modoExtracao,
    textoBruto: resultadoOcr.texto,
    confiancaMediaOcr: Number(resultadoOcr.confiancaMedia.toFixed(1)),
    tempoMs: Math.round(performance.now() - inicioMs),
    memoriaDeltaMb: Number((calcularRssMb() - rssAntesMb).toFixed(2)),
    pdfEscaneado,
  };
}

/**
 * Orquestra o fluxo completo do sandbox: extração de texto, parse puro de campos Pix
 * e correlação direta opcional contra um pedido esperado.
 *
 * @param {Buffer} buffer - Conteúdo binário do comprovante.
 * @param {OpcoesPipelineSandbox} opcoes - Worker compartilhado e modo de pré-processamento.
 * @param {PedidoEsperadoCorrelacao} pedido - Dados opcionais do pedido para calcular veredicto.
 * @returns {Promise<ResultadoAnaliseSandbox>} Extração + correlação estruturada.
 */
export async function analisarComprovanteSandbox(
  buffer: Buffer,
  opcoes: OpcoesPipelineSandbox,
  pedido?: PedidoEsperadoCorrelacao,
): Promise<ResultadoAnaliseSandbox> {
  const extracao = await extrairTextoComprovanteSandbox(buffer, opcoes);
  const extraido = extrairCamposPix(extracao.textoBruto);

  const correlacao = pedido ? correlacionarComprovante(extraido, pedido) : null;

  return {
    extracao,
    extraido,
    correlacao,
  };
}
