// ============================================================================
// ARQUIVO: frontend/src/shared/utils/validadorComprovante.ts
// ============================================================================

/**
 * Assinaturas binárias (Magic Bytes) dos formatos suportados.
 */
const MAGIC_BYTES = {
  PDF: [0x25, 0x50, 0x44, 0x46], // %PDF
  PNG: [0x89, 0x50, 0x4e, 0x47], // .PNG
  JPEG: [0xff, 0xd8, 0xff], // JPEG
};

const LIMITE_MAXIMO_BYTES = 10 * 1024 * 1024; // 10 MB
const LIMITE_MINIMO_BYTES = 100; // 100 bytes

/**
 * Resultado da validação e inspeção binária do arquivo de comprovante.
 */
export interface ResultadoValidacaoArquivo {
  valido: boolean;
  erro?: string;
  mimeDetectado?: string;
  hashSha256?: string;
  ehPdf?: boolean;
}

/**
 * Inspeciona os primeiros bytes do arquivo para determinar com precisão o tipo real,
 * contornando browsers ou aplicativos móveis (como WhatsApp) que omitem ou falsificam o MIME type.
 *
 * @param {Uint8Array} bytes - Primeiros bytes do arquivo.
 * @returns {string | null} MIME type canônico ou null se não reconhecido.
 */
export function detectarMimePorMagicBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;

  // Verifica PDF (%PDF)
  if (
    bytes[0] === MAGIC_BYTES.PDF[0] &&
    bytes[1] === MAGIC_BYTES.PDF[1] &&
    bytes[2] === MAGIC_BYTES.PDF[2] &&
    bytes[3] === MAGIC_BYTES.PDF[3]
  ) {
    return "application/pdf";
  }

  // Verifica PNG
  if (
    bytes[0] === MAGIC_BYTES.PNG[0] &&
    bytes[1] === MAGIC_BYTES.PNG[1] &&
    bytes[2] === MAGIC_BYTES.PNG[2] &&
    bytes[3] === MAGIC_BYTES.PNG[3]
  ) {
    return "image/png";
  }

  // Verifica JPEG
  if (
    bytes[0] === MAGIC_BYTES.JPEG[0] &&
    bytes[1] === MAGIC_BYTES.JPEG[1] &&
    bytes[2] === MAGIC_BYTES.JPEG[2]
  ) {
    return "image/jpeg";
  }

  // Verifica WEBP (RIFF .... WEBP)
  if (bytes.length >= 12) {
    const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (riff === "RIFF" && webp === "WEBP") {
      return "image/webp";
    }
  }

  // Verifica HEIC / HEIF (ftypheic, ftypmif1, etc.)
  if (bytes.length >= 12) {
    const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (ftyp === "ftyp") {
      return "image/heic";
    }
  }

  return null;
}

/**
 * Calcula o hash criptográfico SHA-256 do arquivo no navegador via Web Crypto API.
 * Usado para auditoria anti-duplicidade e garantia de integridade de upload.
 *
 * @param {ArrayBuffer} buffer - Buffer de bytes do arquivo.
 * @returns {Promise<string>} Hash hexadecimal em caixa baixa.
 */
export async function calcularSha256Buffer(buffer: ArrayBuffer): Promise<string> {
  if (!window.crypto?.subtle) {
    // Fallback simples se crypto.subtle não estiver disponível em ambiente sem HTTPS
    return "";
  }

  const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Valida a integridade, tamanho e assinatura binária de um arquivo de comprovante.
 * Suporta nativamente: PDF, PNG, JPEG, WEBP e HEIC.
 *
 * @param {File} arquivo - Objeto File selecionado pelo usuário.
 * @returns {Promise<ResultadoValidacaoArquivo>} Resultado com status e hash calculado.
 */
export async function validarArquivoComprovante(
  arquivo: File,
): Promise<ResultadoValidacaoArquivo> {
  if (!arquivo) {
    return { valido: false, erro: "Nenhum arquivo selecionado." };
  }

  if (arquivo.size < LIMITE_MINIMO_BYTES) {
    return {
      valido: false,
      erro: "O arquivo selecionado está vazio ou corrompido (tamanho inferior a 100 bytes).",
    };
  }

  if (arquivo.size > LIMITE_MAXIMO_BYTES) {
    return {
      valido: false,
      erro: "O arquivo excede o limite máximo permitido de 10 MB.",
    };
  }

  try {
    const sliceHeader = await arquivo.slice(0, 16).arrayBuffer();
    const bytesHeader = new Uint8Array(sliceHeader);
    const mimeDetectado = detectarMimePorMagicBytes(bytesHeader);

    // Se os magic bytes não baterem com formato aceito
    if (!mimeDetectado) {
      // Tolera se a extensão informada for aceita, mas avisa sobre formato desconhecido
      const nomeLower = arquivo.name.toLowerCase();
      const extensaoAceita =
        nomeLower.endsWith(".pdf") ||
        nomeLower.endsWith(".png") ||
        nomeLower.endsWith(".jpg") ||
        nomeLower.endsWith(".jpeg") ||
        nomeLower.endsWith(".webp") ||
        nomeLower.endsWith(".heic");

      if (!extensaoAceita) {
        return {
          valido: false,
          erro: "Formato de arquivo não suportado. Por favor, envie um comprovante em PDF ou Imagem (PNG, JPG, JPEG, WEBP).",
        };
      }
    }

    // Lê o arquivo inteiro para calcular o hash SHA-256
    const bufferInteiro = await arquivo.arrayBuffer();
    const hashSha256 = await calcularSha256Buffer(bufferInteiro);
    const ehPdf = mimeDetectado === "application/pdf" || arquivo.name.toLowerCase().endsWith(".pdf");

    return {
      valido: true,
      mimeDetectado: mimeDetectado || arquivo.type || "application/octet-stream",
      hashSha256,
      ehPdf,
    };
  } catch (error) {
    return {
      valido: false,
      erro: "Falha ao ler o arquivo no dispositivo. Tente selecionar novamente.",
    };
  }
}
