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
 * Valida matematicamente os dígitos verificadores de um CPF (11 dígitos).
 * Rejeita sequências de dígitos repetidos (ex: '111.111.111-11') e aplica o cálculo oficial de módulo 11.
 *
 * @param {string | null} [cpf] - CPF com ou sem máscara.
 * @returns {boolean} `true` se o CPF for matematicamente válido.
 */
export function validarCpf(cpf?: string | null): boolean {
  const numeros = sanitizarDocumento(cpf);
  if (numeros.length !== 11 || /^(\d)\1{10}$/.test(numeros)) {
    return false;
  }

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += Number(numeros[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== Number(numeros[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += Number(numeros[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === Number(numeros[10]);
}

/**
 * Valida matematicamente os dígitos verificadores de um CNPJ (14 dígitos).
 * Rejeita sequências repetidas e aplica o cálculo oficial de módulo 11.
 *
 * @param {string | null} [cnpj] - CNPJ com ou sem máscara.
 * @returns {boolean} `true` se o CNPJ for matematicamente válido.
 */
export function validarCnpj(cnpj?: string | null): boolean {
  const numeros = sanitizarDocumento(cnpj);
  if (numeros.length !== 14 || /^(\d)\1{13}$/.test(numeros)) {
    return false;
  }

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += Number(numeros[i]) * pesos1[i];
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (digito1 !== Number(numeros[12])) return false;

  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += Number(numeros[i]) * pesos2[i];
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  return digito2 === Number(numeros[13]);
}

/**
 * Valida se o documento informado corresponde a um CPF (11 dígitos) ou CNPJ (14 dígitos) matematicamente válido.
 *
 * @param {string | null} [documento] - Documento com ou sem formatação.
 * @returns {boolean} `true` se for um CPF ou CNPJ válido.
 */
export function validarDocumentoPix(documento?: string | null): boolean {
  const numeros = sanitizarDocumento(documento);
  if (numeros.length === 11) return validarCpf(numeros);
  if (numeros.length === 14) return validarCnpj(numeros);
  return false;
}

/**
 * Valida se o e-mail possui domínio e TLD alfabético de pelo menos 2 caracteres (exigido pelo Mercado Pago).
 *
 * @param {string | null} [email] - Endereço de e-mail a validar.
 * @returns {boolean} `true` se o formato do e-mail for válido.
 */
export function validarEmailPix(email?: string | null): boolean {
  const limpo = String(email || "").trim();
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(limpo);
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
