// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/extractors/pdfNativoExtratorStrategy.ts
// ============================================================================

import { PDFParse } from "pdf-parse";

import {
  IExtratorDocumentoStrategy,
  ResultadoExtracaoDocumento,
  TipoArquivoOcr,
} from "../contracts/ocrContracts";
import { TesseractWorkerSingleton } from "./tesseractWorkerSingleton";

const LIMITE_MINIMO_TEXTO_NATIVO = 40;

/**
 * Estratégia OO dedicada a arquivos PDF:
 * prioriza extração de texto nativo (`PDFParse.getText`) em ~15ms e realiza
 * fallback automático para OCR da primeira página (`getScreenshot`) quando o PDF
 * for escaneado ou composto apenas por imagem.
 */
export class PdfNativoExtratorStrategy implements IExtratorDocumentoStrategy {
  constructor(
    private readonly workerSingleton: TesseractWorkerSingleton = TesseractWorkerSingleton.obterInstancia(),
  ) {}

  /**
   * Indica se a estratégia atende buffers do tipo `PDF`.
   *
   * @param {TipoArquivoOcr} tipo - Tipo detectado pelos magic bytes.
   * @returns {boolean} `true` para `PDF`.
   */
  suporta(tipo: TipoArquivoOcr): boolean {
    return tipo === "PDF";
  }

  /**
   * Extrai o texto nativo do PDF ou renderiza a página 1 para OCR se necessário.
   *
   * @param {Buffer} buffer - Conteúdo binário do PDF.
   * @param {TipoArquivoOcr} tipo - Tipo detectado.
   * @returns {Promise<ResultadoExtracaoDocumento>} Texto bruto e metadados de extração.
   */
  async extrairTexto(
    buffer: Buffer,
    tipo: TipoArquivoOcr,
  ): Promise<ResultadoExtracaoDocumento> {
    const parser = new PDFParse({ data: buffer });

    try {
      const resultadoTexto = await parser.getText();
      const textoNativo = (resultadoTexto.text || "").trim();

      if (textoNativo.length >= LIMITE_MINIMO_TEXTO_NATIVO) {
        return {
          tipoArquivo: tipo,
          modoExtracao: "PDF_NATIVO",
          textoBruto: textoNativo,
          confiancaMediaOcr: null,
          pdfEscaneado: false,
        };
      }

      const captura = await parser.getScreenshot({ first: 1, scale: 2 });
      const pagina = captura.pages[0];

      if (!pagina) {
        return {
          tipoArquivo: tipo,
          modoExtracao: "PDF_ESCANEADO_OCR",
          textoBruto: textoNativo,
          confiancaMediaOcr: 0,
          pdfEscaneado: true,
        };
      }

      const resultadoOcr = await this.workerSingleton.reconhecer(Buffer.from(pagina.data));
      return {
        tipoArquivo: tipo,
        modoExtracao: "PDF_ESCANEADO_OCR",
        textoBruto: resultadoOcr.texto,
        confiancaMediaOcr: Number(resultadoOcr.confiancaMedia.toFixed(1)),
        pdfEscaneado: true,
      };
    } finally {
      await parser.destroy().catch(() => {});
    }
  }
}
