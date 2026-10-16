/**
 * Limites máximos de comprimento de caracteres para campos cadastrais de entrada.
 */
export const SANITIZE_LIMITES = {
  nome: 120,
  email: 254,
  telefone: 20,
  documento: 14,
} as const;

/**
 * Sanitiza o nome do usuário removendo espaços das bordas e truncando no limite de 120 caracteres.
 *
 * @param {string} valor - Nome bruto informado no input.
 * @returns {string} Nome limpo e truncado.
 */
export function sanitizarNome(valor: string): string {
  return valor.trim().slice(0, SANITIZE_LIMITES.nome);
}

/**
 * Sanitiza número de telefone removendo pontuação e limitando a 20 dígitos.
 *
 * @param {string} valor - Telefone com máscara ou caracteres especiais.
 * @returns {string} Apenas os dígitos numéricos.
 */
export function sanitizarTelefone(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, SANITIZE_LIMITES.telefone);
}

/**
 * Sanitiza o documento de identificação (CPF/CNPJ) mantendo apenas números e limitando a 14 dígitos.
 *
 * @param {string | null} [valor] - Documento com formatação ou nulo.
 * @returns {string} Dígitos numéricos do documento.
 */
export function sanitizarDocumento(valor?: string | null): string {
  return String(valor || "")
    .replace(/\D/g, "")
    .slice(0, SANITIZE_LIMITES.documento);
}

/**
 * Sanitiza o e-mail removendo espaços, truncando no tamanho máximo e validando o padrão básico de e-mail.
 *
 * @param {string} valor - E-mail digitado pelo usuário.
 * @returns {string} E-mail válido e limpo, ou string vazia caso o formato seja inválido.
 */
export function sanitizarEmail(valor: string): string {
  const email = valor.trim().slice(0, SANITIZE_LIMITES.email);

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "";
  }

  return email;
}

/**
 * Sanitiza conjuntamente o pacote de dados do comprador antes do envio para o checkout ou atualização cadastral.
 *
 * @param {object} dados - Objeto contendo nome, telefone e email opcional.
 * @param {string} dados.nome - Nome do cliente.
 * @param {string} dados.telefone - Telefone de contato.
 * @param {string} [dados.email] - E-mail para recebimento de comprovante.
 * @returns {{ nome: string; telefone: string; email: string }} Objeto com todos os campos limpos.
 */
export function sanitizarDadosCliente(dados: {
  nome: string;
  telefone: string;
  email?: string;
}) {
  return {
    nome: sanitizarNome(dados.nome),
    telefone: sanitizarTelefone(dados.telefone),
    email: sanitizarEmail(dados.email || ""),
  };
}
