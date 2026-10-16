import { randomUUID } from "crypto";

import { AppError } from "../../../../shared/classes/AppError";
import type {
  AreaDocumentoSecretaria,
  ArquivoDocumentoSecretaria,
  TipoDocumentoSecretaria,
} from "./documentosSecretariaTypes";

export const LIMITE_DOCUMENTO_SECRETARIA_BYTES = 25 * 1024 * 1024;

const MIMES_PLANILHA = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MIMES_IMAGEM = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Verifica se os primeiros bytes de um Buffer coincidem exatamente com uma assinatura mágica esperada.
 *
 * @param {Buffer} buffer - Conteúdo binário do arquivo em memória.
 * @param {number[]} assinatura - Sequência ordenada de bytes hexadecimais a verificar.
 * @returns {boolean} True se todos os bytes coincidirem na ordem.
 */
function iniciaCom(buffer: Buffer, assinatura: number[]): boolean {
  return assinatura.every((byte, indice) => buffer[indice] === byte);
}

/**
 * Valida a integridade do arquivo inspecionando os "magic bytes" (assinatura binária) contra o MIME type alegado.
 * Previne ataques de spoofing onde arquivos executáveis ou maliciosos são renomeados com extensões permitidas.
 *
 * @param {ArquivoDocumentoSecretaria} arquivo - Estrutura com buffer, mimeType e nome original.
 * @returns {boolean} True se a assinatura binária for compatível com o formato MIME.
 */
function assinaturaCompativel(arquivo: ArquivoDocumentoSecretaria): boolean {
  const { buffer, mimeType } = arquivo;

  if (mimeType === "application/pdf") {
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }

  if (mimeType === "image/png") {
    return iniciaCom(buffer, [0x89, 0x50, 0x4e, 0x47]);
  }

  if (mimeType === "image/jpeg") {
    return iniciaCom(buffer, [0xff, 0xd8, 0xff]);
  }

  if (mimeType === "image/gif") {
    return ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"));
  }

  if (mimeType === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return iniciaCom(buffer, [0x50, 0x4b]);
  }

  if (mimeType === "application/vnd.ms-excel") {
    return iniciaCom(buffer, [0xd0, 0xcf, 0x11, 0xe0]);
  }

  if (mimeType === "text/csv" || mimeType === "application/csv") {
    return !buffer.includes(0x00);
  }

  return false;
}

/**
 * Sanitiza um segmento de texto para ser usado com segurança em caminhos de arquivos e Storage keys,
 * removendo acentos e substituindo caracteres não alfanuméricos por hífens.
 *
 * @param {string} valor - String bruta a ser normalizada.
 * @returns {string} String contendo apenas caracteres alfanuméricos minúsculos, pontos, underscores e hífens.
 */
function sanitizarSegmento(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/**
 * Valida o arquivo de documento da secretaria quanto a MIME type permitido, limite de tamanho e assinatura mágica.
 *
 * @param {ArquivoDocumentoSecretaria} arquivo - Objeto contendo o buffer binário, mimeType e tamanho do arquivo.
 * @throws {AppError} Se o tipo MIME não for suportado, o tamanho exceder 25 MB ou o conteúdo binário for inválido.
 */
export function validarArquivoDocumentoSecretaria(
  arquivo: ArquivoDocumentoSecretaria,
): void {
  const mimePermitido =
    arquivo.mimeType === "application/pdf" ||
    MIMES_PLANILHA.has(arquivo.mimeType) ||
    MIMES_IMAGEM.has(arquivo.mimeType);

  if (!mimePermitido) {
    throw new AppError(
      "DOCUMENTO_SECRETARIA_TIPO_INVALIDO",
      "Tipo de arquivo não permitido.",
      422,
    );
  }

  if (
    arquivo.tamanhoBytes < 1 ||
    arquivo.tamanhoBytes > LIMITE_DOCUMENTO_SECRETARIA_BYTES
  ) {
    throw new AppError(
      "DOCUMENTO_SECRETARIA_TAMANHO_INVALIDO",
      "O arquivo deve ter no máximo 25 MB.",
      422,
    );
  }

  if (!assinaturaCompativel(arquivo)) {
    throw new AppError(
      "DOCUMENTO_SECRETARIA_CONTEUDO_INVALIDO",
      "O conteúdo do arquivo não corresponde ao formato informado.",
      422,
    );
  }
}

/**
 * Cria o caminho estruturado único (`storagePath`) no bucket do Firebase Storage para o documento da secretaria.
 * O padrão é `documentos_secretaria/{area}/{tipo}/{id}_{uuid}_{nomeSanitizado}`.
 *
 * @param {object} params - Parâmetros estruturais do documento.
 * @param {string} params.id - Identificador único do documento no Firestore.
 * @param {AreaDocumentoSecretaria} params.area - Área administrativa de classificação (ex: "financeiro", "atas").
 * @param {TipoDocumentoSecretaria} params.tipo - Tipo de arquivo (ex: "ata", "contrato", "planilha").
 * @param {string} params.nomeArquivo - Nome original do arquivo enviado pelo cliente.
 * @returns {string} Caminho completo relativo para armazenamento no Firebase Storage.
 */
export function criarStoragePathDocumento(params: {
  id: string;
  area: AreaDocumentoSecretaria;
  tipo: TipoDocumentoSecretaria;
  nomeArquivo: string;
}): string {
  const area = sanitizarSegmento(params.area) || "geral";
  const tipo = sanitizarSegmento(params.tipo) || "outro";
  const nome = sanitizarSegmento(params.nomeArquivo) || "documento";

  return `documentos_secretaria/${area}/${tipo}/${params.id}_${randomUUID()}_${nome}`;
}
