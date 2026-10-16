import { createHash } from "crypto";

/**
 * Gera um identificador hash SHA-256 determinístico para indexação única de e-mails de aderidos no Firestore.
 * Utilizado na coleção `indices_usuarios_email` para prevenir cadastros concorrentes do mesmo e-mail.
 *
 * @param {string} emailNormalizado - E-mail do usuário devidamente sanitizado e em minúsculas.
 * @returns {string} Hash SHA-256 em formato hexadecimal de 64 caracteres.
 */
export function gerarIdIndiceEmailSecretaria(emailNormalizado: string): string {
  return createHash("sha256").update(emailNormalizado).digest("hex");
}
