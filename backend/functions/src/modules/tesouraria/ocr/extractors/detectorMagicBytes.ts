// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/extractors/detectorMagicBytes.ts
// ============================================================================

import { TipoArquivoOcr } from "../contracts/ocrContracts";

/**
 * Identifica o formato binário real do comprovante pelos seus magic bytes iniciais,
 * evitando depender de extensões de arquivo ou cabeçalhos HTTP.
 *
 * @param {Buffer} buffer - Conteúdo binário do comprovante.
 * @returns {TipoArquivoOcr} Tipo detectado (`PDF`, `PNG`, `JPEG`, `WEBP` ou `DESCONHECIDO`).
 */
export function detectarMagicBytes(buffer: Buffer): TipoArquivoOcr {
  if (!buffer || buffer.length < 4) {
    return "DESCONHECIDO";
  }

  if (buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    return "PDF";
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "PNG";
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "JPEG";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "WEBP";
  }

  return "DESCONHECIDO";
}
