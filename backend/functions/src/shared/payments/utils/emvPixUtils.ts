// ============================================================================
// ARQUIVO: backend/functions/src/shared/payments/utils/emvPixUtils.ts
// ============================================================================

/**
 * Remove acentos, caracteres especiais e normaliza texto para formato ASCII compatível com EMVCo.
 *
 * @param {string} texto - Texto bruto de entrada.
 * @param {number} tamanhoMaximo - Quantidade máxima de caracteres permitida.
 * @returns {string} Texto sanitizado.
 */
export function sanitizarTextoEmv(texto: string, tamanhoMaximo: number): string {
  const normalizado = (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim();

  return normalizado.substring(0, tamanhoMaximo);
}

/**
 * Formata um campo no padrão TLV (Tag-Length-Value) do padrão EMVCo.
 *
 * @param {string} id - Código de 2 caracteres do campo (Tag).
 * @param {string} valor - Valor a ser encapsulado.
 * @returns {string} String formatada `ID + TAMANHO + VALOR`.
 */
export function formatarCampoEmv(id: string, valor: string): string {
  const tamanho = valor.length.toString().padStart(2, "0");
  return `${id}${tamanho}${valor}`;
}

/**
 * Calcula o checksum CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF)
 * exigido pela especificação do Banco Central do Brasil para códigos BR Code / Pix.
 *
 * @param {string} payload - String completa do código Pix até o campo '6304'.
 * @returns {string} Quatro dígitos hexadecimais em caixa alta (ex: 'A1B2').
 */
export function calcularCrc16Pix(payload: string): string {
  let crc = 0xffff;
  const polinomio = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polinomio) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Parâmetros para geração do payload estático offline do Pix.
 */
export interface ParametrosPayloadEmvPix {
  /** Chave Pix da conta recebedora (CNPJ, E-mail, Telefone ou Chave Aleatória) */
  chavePix: string;
  /** Nome do beneficiário recebedor (max 25 caracteres) */
  nomeBeneficiario: string;
  /** Cidade da agência recebedora (max 15 caracteres) */
  cidadeBeneficiario: string;
  /** Valor total da transação em centavos (ex: 3000 para R$ 30,00) */
  valorCentavos: number;
  /** Identificador único txid da cobrança (max 25 caracteres alfanuméricos) */
  txid: string;
}

/**
 * Gera o payload oficial do BR Code (Pix Copia-e-Cola) no padrão EMVCo do Banco Central.
 * Função 100% pura, determinística e executável sem conexão externa.
 *
 * @param {ParametrosPayloadEmvPix} params - Dados da chave, recebedor, valor e identificador.
 * @returns {string} Código Pix Copia-e-Cola completo com checksum CRC16.
 */
export function gerarPayloadPixEmv(params: ParametrosPayloadEmvPix): string {
  const chaveLimpa = params.chavePix.trim();
  const nomeLimpo = sanitizarTextoEmv(params.nomeBeneficiario || "COMISSAO FORMATURA", 25) || "COMISSAO";
  const cidadeLimpa = sanitizarTextoEmv(params.cidadeBeneficiario || "ITAJUBA", 15) || "ITAJUBA";
  const txidLimpo = (params.txid || "***").replace(/[^a-zA-Z0-9]/g, "").substring(0, 25) || "***";

  // Campo 26: Merchant Account Information
  const campoGui = formatarCampoEmv("00", "br.gov.bcb.pix");
  const campoChave = formatarCampoEmv("01", chaveLimpa);
  const merchantAccountInfo = formatarCampoEmv("26", `${campoGui}${campoChave}`);

  // Campo 54: Transaction Amount (em reais com ponto decimal)
  const valorReais = (params.valorCentavos / 100).toFixed(2);
  const campoValor = formatarCampoEmv("54", valorReais);

  // Campo 62: Additional Data Field Template (txid)
  const campoTxid = formatarCampoEmv("05", txidLimpo);
  const additionalDataField = formatarCampoEmv("62", campoTxid);

  const payloadSemCrc = [
    formatarCampoEmv("00", "01"), // Payload Format Indicator
    merchantAccountInfo,
    formatarCampoEmv("52", "0000"), // Merchant Category Code
    formatarCampoEmv("53", "986"), // Transaction Currency (BRL)
    campoValor,
    formatarCampoEmv("58", "BR"), // Country Code
    formatarCampoEmv("59", nomeLimpo),
    formatarCampoEmv("60", cidadeLimpa),
    additionalDataField,
    "6304", // CRC16 Header
  ].join("");

  const crcCalculado = calcularCrc16Pix(payloadSemCrc);
  return `${payloadSemCrc}${crcCalculado}`;
}
