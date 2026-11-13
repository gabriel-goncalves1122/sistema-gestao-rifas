// ============================================================================
// ARQUIVO: scripts/ocr-sandbox/src/extractors/detectorTipoArquivo.ts
// ============================================================================

import { TipoArquivoDetectado } from "../types/ocrSandboxTypes.js";

/**
 * Identifica o tipo real de um buffer pelos seus magic bytes iniciais,
 * evitando confiar apenas na extensão do nome do arquivo.
 *
 * @param {Buffer} buffer - Conteúdo binário do comprovante.
 * @returns {TipoArquivoDetectado} Formato identificado (`PDF`, `PNG`, `JPEG`, `WEBP` ou `DESCONHECIDO`).
 */
export function detectarTipoArquivoPorBytes(buffer: Buffer): TipoArquivoDetectado {
  if (!buffer || buffer.length < 4) {
    return "DESCONHECIDO";
  }

  // %PDF
  if (buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    return "PDF";
  }

  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "PNG";
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "JPEG";
  }

  // WEBP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "WEBP";
  }

  return "DESCONHECIDO";
}
