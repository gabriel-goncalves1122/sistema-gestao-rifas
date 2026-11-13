// ============================================================================
// ARQUIVO: scripts/ocr-sandbox/src/extractors/preprocessadorImagem.ts
// ============================================================================

import sharp from "sharp";

/** Opções para o pipeline de normalização visual antes do Tesseract. */
export interface OpcoesPreprocessamentoImagem {
  larguraMinimaPx?: number;
  larguraMaximaPx?: number;
}

const LARGURA_MINIMA_PADRAO = 900;
const LARGURA_MAXIMA_PADRAO = 1800;
const LIMIAR_DARK_MODE_MEAN = 115;

/**
 * Prepara capturas de tela e fotos para leitura por OCR:
 * remove canal alpha sobre fundo branco, aplica rotação EXIF automática,
 * detecta e inverte automaticamente prints em Dark Mode (fundo escuro),
 * e redimensiona apenas prints muito estreitos (< 900px) ou gigantes (> 1800px)
 * sem aplicar nitidez excessiva que possa duplicar bordas de caracteres.
 *
 * @param {Buffer} bufferImagem - Bytes originais da imagem (PNG/JPEG/WebP/JFIF).
 * @param {OpcoesPreprocessamentoImagem} opcoes - Limites opcionais de largura.
 * @returns {Promise<Buffer>} Buffer PNG em escala de cinza pronto para o Tesseract.
 */
export async function preprocessarImagemParaOcr(
  bufferImagem: Buffer,
  opcoes: OpcoesPreprocessamentoImagem = {},
): Promise<Buffer> {
  const larguraMin = opcoes.larguraMinimaPx ?? LARGURA_MINIMA_PADRAO;
  const larguraMax = opcoes.larguraMaximaPx ?? LARGURA_MAXIMA_PADRAO;

  const base = sharp(bufferImagem, { failOn: "none" })
    .rotate()
    .flatten({ background: "#ffffff" })
    .toColourspace("b-w");

  const bufferCinza = await base.png().toBuffer();
  const imgCinza = sharp(bufferCinza);
  const [metadata, stats] = await Promise.all([imgCinza.metadata(), imgCinza.stats()]);

  const mediaLuminancia = stats.channels[0]?.mean ?? 255;
  let pipeline = sharp(bufferCinza);

  if (mediaLuminancia < LIMIAR_DARK_MODE_MEAN) {
    pipeline = pipeline.negate({ alpha: false });
  }

  const larguraAtual = metadata.width ?? 0;
  if (larguraAtual > 0 && larguraAtual < larguraMin) {
    pipeline = pipeline.resize({ width: larguraMin, kernel: sharp.kernel.lanczos3 });
  } else if (larguraAtual > larguraMax) {
    pipeline = pipeline.resize({ width: larguraMax, kernel: sharp.kernel.lanczos3 });
  }

  return pipeline.toColourspace("b-w").png({ compressionLevel: 6 }).toBuffer();
}
