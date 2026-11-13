// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/extractors/imagemOcrExtratorStrategy.ts
// ============================================================================

import {
  IExtratorDocumentoStrategy,
  ResultadoExtracaoDocumento,
  TipoArquivoOcr,
} from "../contracts/ocrContracts";
import { TesseractWorkerSingleton } from "./tesseractWorkerSingleton";

const TIPOS_IMAGEM = new Set<TipoArquivoOcr>(["PNG", "JPEG", "WEBP"]);

/**
 * Estratégia OO dedicada a comprovantes em imagem (`PNG`, `JPEG`/`JFIF`, `WEBP`).
 * Executa reconhecimento diretamente no buffer original via `TesseractWorkerSingleton`,
 * evitando dependências nativas de manipulação de imagem no deploy das Functions.
 */
export class ImagemOcrExtratorStrategy implements IExtratorDocumentoStrategy {
  constructor(
    private readonly workerSingleton: TesseractWorkerSingleton = TesseractWorkerSingleton.obterInstancia(),
  ) {}

  /**
   * Indica se a estratégia atende formatos de imagem suportados.
   *
   * @param {TipoArquivoOcr} tipo - Tipo detectado pelos magic bytes.
   * @returns {boolean} `true` para `PNG`, `JPEG` ou `WEBP`.
   */
  suporta(tipo: TipoArquivoOcr): boolean {
    return TIPOS_IMAGEM.has(tipo);
  }

  /**
   * Executa OCR em português sobre o buffer da imagem.
   *
   * @param {Buffer} buffer - Conteúdo binário da imagem.
   * @param {TipoArquivoOcr} tipo - Tipo detectado.
   * @returns {Promise<ResultadoExtracaoDocumento>} Texto reconhecido e confiança média.
   */
  async extrairTexto(
    buffer: Buffer,
    tipo: TipoArquivoOcr,
  ): Promise<ResultadoExtracaoDocumento> {
    const resultadoOcr = await this.workerSingleton.reconhecer(buffer);

    return {
      tipoArquivo: tipo,
      modoExtracao: "IMAGEM_OCR",
      textoBruto: resultadoOcr.texto,
      confiancaMediaOcr: Number(resultadoOcr.confiancaMedia.toFixed(1)),
      pdfEscaneado: false,
    };
  }
}
