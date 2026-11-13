// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/ocr/extratorDocumentoFactory.spec.ts
// ============================================================================

import { ExtratorDocumentoFactory } from "../../../src/modules/tesouraria/ocr/extractors/extratorDocumentoFactory";
import { PdfNativoExtratorStrategy } from "../../../src/modules/tesouraria/ocr/extractors/pdfNativoExtratorStrategy";
import { ImagemOcrExtratorStrategy } from "../../../src/modules/tesouraria/ocr/extractors/imagemOcrExtratorStrategy";
import { TesseractWorkerSingleton } from "../../../src/modules/tesouraria/ocr/extractors/tesseractWorkerSingleton";

describe("ExtratorDocumentoFactory", () => {
  const mockWorker = {} as TesseractWorkerSingleton;

  it("deve selecionar PdfNativoExtratorStrategy para buffer com assinatura %PDF-", () => {
    const pdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj", "ascii");
    const { tipoArquivo, strategy } = ExtratorDocumentoFactory.criarPorBuffer(
      pdfBuffer,
      mockWorker,
    );

    expect(tipoArquivo).toBe("PDF");
    expect(strategy).toBeInstanceOf(PdfNativoExtratorStrategy);
  });

  it("deve selecionar ImagemOcrExtratorStrategy para buffer PNG válido", () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const { tipoArquivo, strategy } = ExtratorDocumentoFactory.criarPorBuffer(
      pngBuffer,
      mockWorker,
    );

    expect(tipoArquivo).toBe("PNG");
    expect(strategy).toBeInstanceOf(ImagemOcrExtratorStrategy);
  });

  it("deve selecionar ImagemOcrExtratorStrategy para buffer JPEG válido", () => {
    const jpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const { tipoArquivo, strategy } = ExtratorDocumentoFactory.criarPorBuffer(
      jpgBuffer,
      mockWorker,
    );

    expect(tipoArquivo).toBe("JPEG");
    expect(strategy).toBeInstanceOf(ImagemOcrExtratorStrategy);
  });

  it("deve selecionar ImagemOcrExtratorStrategy para buffer WEBP válido", () => {
    const webpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x24, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    const { tipoArquivo, strategy } = ExtratorDocumentoFactory.criarPorBuffer(
      webpBuffer,
      mockWorker,
    );

    expect(tipoArquivo).toBe("WEBP");
    expect(strategy).toBeInstanceOf(ImagemOcrExtratorStrategy);
  });

  it("deve lançar FORMATO_COMPROVANTE_NAO_SUPORTADO para buffer desconhecido", () => {
    const desconhecido = Buffer.from("texto-qualquer-sem-magic-bytes", "utf8");

    expect(() =>
      ExtratorDocumentoFactory.criarPorBuffer(desconhecido, mockWorker),
    ).toThrow("FORMATO_COMPROVANTE_NAO_SUPORTADO");
  });
});
