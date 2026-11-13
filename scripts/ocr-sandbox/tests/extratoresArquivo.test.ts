// ============================================================================
// ARQUIVO: scripts/ocr-sandbox/tests/extratoresArquivo.test.ts
// ============================================================================

import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { detectarTipoArquivoPorBytes } from "../src/extractors/detectorTipoArquivo.js";
import { extrairTextoOuImagemDePdf } from "../src/extractors/extratorPdfNativo.js";
import { preprocessarImagemParaOcr } from "../src/extractors/preprocessadorImagem.js";
import { analisarComprovanteSandbox } from "../src/pipeline/analisarComprovanteSandbox.js";
import { TesseractWorkerManager } from "../src/extractors/tesseractWorkerManager.js";

/**
 * Gera um PDF mínimo válido (1 página com texto nativo selecionável) em memória
 * para validar a integração real com `pdf-parse` v2 sem depender de arquivos externos.
 */
function criarPdfSinteticoTexto(linhas: string[]): Buffer {
  const comandosTexto = linhas
    .map((linha, idx) => `BT /F1 12 Tf 40 ${740 - idx * 18} Td (${linha}) Tj ET`)
    .join("\n");

  const stream = `${comandosTexto}\n`;
  const objetos = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${Buffer.byteLength(stream, "ascii")} >> stream\n${stream}endstream\nendobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];

  let corpo = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objetos) {
    offsets.push(Buffer.byteLength(corpo, "ascii"));
    corpo += obj;
  }

  const xrefPos = Buffer.byteLength(corpo, "ascii");
  let xref = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objetos.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer << /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(corpo + xref + trailer, "ascii");
}

describe("extratores de arquivo e pré-processamento", () => {
  it("detecta corretamente magic bytes de PDF, PNG, JPEG e WEBP", () => {
    expect(detectarTipoArquivoPorBytes(Buffer.from("%PDF-1.7..."))).toBe("PDF");
    expect(detectarTipoArquivoPorBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe("PNG");
    expect(detectarTipoArquivoPorBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("JPEG");
    expect(
      detectarTipoArquivoPorBytes(Buffer.from("RIFF1234WEBP", "ascii")),
    ).toBe("WEBP");
    expect(detectarTipoArquivoPorBytes(Buffer.from("texto"))).toBe("DESCONHECIDO");
  });

  it("extrai texto nativo de um buffer PDF real via pdf-parse v2", async () => {
    const pdfBuffer = criarPdfSinteticoTexto([
      "NUBANK COMPROVANTE PIX",
      "Valor pago: R$ 30,00",
      "Identificador: RIFA123456ABCD",
      "Recebedor: COMISSAO FORMATURA UNIFEI",
    ]);

    const leitura = await extrairTextoOuImagemDePdf(pdfBuffer);

    expect(leitura.pdfEscaneado).toBe(false);
    expect(leitura.textoNativo).toContain("RIFA123456ABCD");
    expect(leitura.textoNativo).toContain("30,00");
  });

  it("pré-processa e redimensiona imagens pequenas com sharp sem falhas", async () => {
    const pngPequeno = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    })
      .png()
      .toBuffer();

    const processado = await preprocessarImagemParaOcr(pngPequeno, {
      larguraMinimaPx: 1200,
    });
    const meta = await sharp(processado).metadata();

    expect(detectarTipoArquivoPorBytes(processado)).toBe("PNG");
    expect(meta.width).toBe(1200);
    expect(meta.channels).toBe(1);
  });

  it("inverte automaticamente imagens em Dark Mode (luminância média baixa)", async () => {
    const pngEscuro = await sharp({
      create: {
        width: 1000,
        height: 400,
        channels: 4,
        background: { r: 20, g: 20, b: 20, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const processado = await preprocessarImagemParaOcr(pngEscuro);
    const stats = await sharp(processado).stats();

    expect(stats.channels[0].mean).toBeGreaterThan(200);
  });

  it("executa o pipeline completo no PDF nativo correlacionando TxID e valor sem acionar OCR", async () => {
    const pdfBuffer = criarPdfSinteticoTexto([
      "NUBANK COMPROVANTE PIX",
      "13/11/2026 - 09:05:00",
      "Valor pago: R$ 30,00",
      "Identificador: RIFA123456ABCD",
      "ID: E18236120202611130905UNICO000001",
      "Recebedor: COMISSAO FORMATURA UNIFEI",
    ]);

    const workerManager = new TesseractWorkerManager();
    const res = await analisarComprovanteSandbox(
      pdfBuffer,
      { workerManager },
      {
        pagamentoId: "pag_pdf_1",
        txidEsperado: "RIFA123456ABCD",
        valorCentavos: 3000,
        recebedorEsperado: "COMISSAO FORMATURA UNIFEI",
      },
    );
    await workerManager.encerrar();

    expect(res.extracao.modoExtracao).toBe("PDF_NATIVO");
    expect(res.correlacao?.veredicto).toBe("CORRELACAO_FORTE");
    expect(res.correlacao?.score).toBe(100);
  });
});
