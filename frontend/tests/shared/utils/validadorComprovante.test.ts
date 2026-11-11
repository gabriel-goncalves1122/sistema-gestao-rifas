// ============================================================================
// ARQUIVO: frontend/tests/shared/utils/validadorComprovante.test.ts
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  detectarMimePorMagicBytes,
  validarArquivoComprovante,
} from "@/shared/utils/validadorComprovante";

describe("validadorComprovante (Inspeção Binária)", () => {
  it("deve detectar PDF por magic bytes (%PDF)", () => {
    const bytesPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    const mime = detectarMimePorMagicBytes(bytesPdf);
    expect(mime).toBe("application/pdf");
  });

  it("deve detectar PNG por magic bytes", () => {
    const bytesPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const mime = detectarMimePorMagicBytes(bytesPng);
    expect(mime).toBe("image/png");
  });

  it("deve detectar JPEG por magic bytes", () => {
    const bytesJpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const mime = detectarMimePorMagicBytes(bytesJpg);
    expect(mime).toBe("image/jpeg");
  });

  it("deve rejeitar arquivo menor que 100 bytes", async () => {
    const filePequeno = new File([new Uint8Array(20)], "corrompido.jpg", {
      type: "image/jpeg",
    });

    const resultado = await validarArquivoComprovante(filePequeno);
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toContain("inferior a 100 bytes");
  });

  it("deve validar com sucesso um PDF íntegro", async () => {
    const headerPdf = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35, 0x0a, 0x25,
      ...new Array(150).fill(65),
    ]);
    const filePdf = new File([headerPdf], "comprovante.pdf", {
      type: "application/pdf",
    });

    const resultado = await validarArquivoComprovante(filePdf);
    expect(resultado.valido).toBe(true);
    expect(resultado.ehPdf).toBe(true);
    expect(resultado.mimeDetectado).toBe("application/pdf");
    expect(resultado.hashSha256).toBeDefined();
  });
});
