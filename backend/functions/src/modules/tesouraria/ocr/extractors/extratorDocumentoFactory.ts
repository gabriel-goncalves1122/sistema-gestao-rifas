// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/extractors/extratorDocumentoFactory.ts
// ============================================================================

import {
  IExtratorDocumentoStrategy,
  TipoArquivoOcr,
} from "../contracts/ocrContracts";
import { detectarMagicBytes } from "./detectorMagicBytes";
import { ImagemOcrExtratorStrategy } from "./imagemOcrExtratorStrategy";
import { PdfNativoExtratorStrategy } from "./pdfNativoExtratorStrategy";
import { TesseractWorkerSingleton } from "./tesseractWorkerSingleton";

/**
 * Factory OO responsável por inspecionar o buffer binário do comprovante
 * e instanciar a estratégia de extração (`PDF` ou `Imagem`) apropriada.
 */
export class ExtratorDocumentoFactory {
  /**
   * Seleciona a estratégia de extração compatível com os magic bytes do arquivo.
   *
   * @param {Buffer} buffer - Bytes do comprovante baixado do Storage.
   * @param {TesseractWorkerSingleton} [workerSingleton] - Worker injetável para testes.
   * @returns {{ tipoArquivo: TipoArquivoOcr; strategy: IExtratorDocumentoStrategy }}
   *          Tipo detectado e estratégia pronta para uso.
   * @throws {Error} `"FORMATO_COMPROVANTE_NAO_SUPORTADO"` quando o buffer não é PDF nem imagem válida.
   */
  static criarPorBuffer(
    buffer: Buffer,
    workerSingleton: TesseractWorkerSingleton = TesseractWorkerSingleton.obterInstancia(),
  ): { tipoArquivo: TipoArquivoOcr; strategy: IExtratorDocumentoStrategy } {
    const tipoArquivo = detectarMagicBytes(buffer);
    const estrategias: IExtratorDocumentoStrategy[] = [
      new PdfNativoExtratorStrategy(workerSingleton),
      new ImagemOcrExtratorStrategy(workerSingleton),
    ];

    const strategy = estrategias.find((item) => item.suporta(tipoArquivo));
    if (!strategy) {
      throw new Error("FORMATO_COMPROVANTE_NAO_SUPORTADO");
    }

    return { tipoArquivo, strategy };
  }
}
