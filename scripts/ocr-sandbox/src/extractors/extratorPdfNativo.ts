// ============================================================================
// ARQUIVO: scripts/ocr-sandbox/src/extractors/extratorPdfNativo.ts
// ============================================================================

import { PDFParse } from "pdf-parse";

const LIMITE_MINIMO_TEXTO_PDF_NATIVO = 40;

/** Resultado da leitura de texto nativo e fallback opcional para PDF escaneado. */
export interface ResultadoLeituraPdf {
  textoNativo: string;
  pdfEscaneado: boolean;
  bufferPaginaEscaneada: Buffer | null;
}

/**
 * Extrai texto de um PDF utilizando a API v2 (`PDFParse`) da biblioteca `pdf-parse`.
 * Caso o documento contenha pouco ou nenhum texto selecionável (PDF escaneado/imagem),
 * renderiza a primeira página em PNG de alta resolução para fallback via OCR.
 *
 * @param {Buffer} bufferPdf - Bytes do arquivo PDF.
 * @returns {Promise<ResultadoLeituraPdf>} Texto extraído ou imagem rasterizada da página 1.
 */
export async function extrairTextoOuImagemDePdf(
  bufferPdf: Buffer,
): Promise<ResultadoLeituraPdf> {
  const parser = new PDFParse({ data: bufferPdf });

  try {
    const resultadoTexto = await parser.getText();
    const textoNativo = (resultadoTexto.text || "").trim();

    if (textoNativo.length >= LIMITE_MINIMO_TEXTO_PDF_NATIVO) {
      return {
        textoNativo,
        pdfEscaneado: false,
        bufferPaginaEscaneada: null,
      };
    }

    const captura = await parser.getScreenshot({ first: 1, scale: 2 });
    const primeiraPagina = captura.pages[0];

    return {
      textoNativo,
      pdfEscaneado: true,
      bufferPaginaEscaneada: primeiraPagina ? Buffer.from(primeiraPagina.data) : null,
    };
  } finally {
    await parser.destroy().catch(() => {});
  }
}
