// ============================================================================
// ARQUIVO: scripts/ocr-sandbox/src/parsers/regrasBancosMelhoradas.ts
// ============================================================================

interface RegraBanco {
  nome: string;
  padroes: RegExp[];
}

const REGRAS_BANCOS: RegraBanco[] = [
  { nome: "NUBANK", padroes: [/\bNUBANK\b/, /\bNU PAGAMENTOS\b/, /\bNU FINANCEIRA\b/] },
  { nome: "INTER", padroes: [/\bBANCO INTER\b/, /\bINTER S\.?A\b/, /\bINTERMEDIUM\b/] },
  { nome: "C6 BANK", padroes: [/\bC6\s*BANK\b/, /\bBANCO C6\b/] },
  { nome: "ITAU", padroes: [/\bITAU\b/, /\bITAUCARD\b/] },
  { nome: "MERCADO PAGO", padroes: [/\bMERCADO\s*PAGO\b/, /\bMERCADOPAGO\b/] },
  { nome: "PICPAY", padroes: [/\bPICPAY\b/] },
  { nome: "BANCO DO BRASIL", padroes: [/\bBANCO DO BRASIL\b/, /\bBB S\.?A\b/, /\bOUROCARD\b/] },
  { nome: "CAIXA", padroes: [/\bCAIXA ECONOMICA\b/, /\bCAIXA TEM\b/, /\bCEF\b/] },
  { nome: "SICOOB", padroes: [/\bSICOOB\b/, /\bBANCOOB\b/] },
  { nome: "SICREDI", padroes: [/\bSICREDI\b/] },
  { nome: "SANTANDER", padroes: [/\bSANTANDER\b/] },
  { nome: "BRADESCO", padroes: [/\bBRADESCO\b/, /\bNEXT\b.*BRADESCO/] },
  { nome: "99PAY", padroes: [/\b99PAY\b/] },
  { nome: "PAGBANK", padroes: [/\bPAGBANK\b/, /\bPAGSEGURO\b/] },
  { nome: "BTG PACTUAL", padroes: [/\bBTG\s*PACTUAL\b/] },
  { nome: "CORA", padroes: [/\bCORA\b.*SCD\b/, /\bBANCO CORA\b/] },
  { nome: "INFINITEPAY", padroes: [/\bINFINITEPAY\b/, /\bCLOUDWALK\b/] },
  { nome: "XP", padroes: [/\bBANCO XP\b/, /\bXP INVESTIMENTOS\b/] },
  { nome: "STONE", padroes: [/\bSTONE PAGAMENTOS\b/, /\bCONTA STONE\b/, /\bTON\b.*STONE/] },
];

/**
 * Remove acentos e converte texto para maiúsculas para comparações determinísticas.
 *
 * @param {string} texto - Texto bruto de entrada.
 * @returns {string} Texto normalizado sem diacríticos em caixa alta.
 */
export function normalizarTextoSemAcentosUpper(texto: string): string {
  return (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

/**
 * Normaliza caracteres visualmente ambíguos produzidos por OCR em códigos alfanuméricos
 * (ex: `O -> 0`, `I/L -> 1`, `£/€ -> E`), preservando uso seguro apenas para comparação tolerante.
 *
 * @param {string} identificador - Código extraído (ex: `E2E ID` ou `txid`).
 * @returns {string} Identificador padronizado em caixa alta apenas com alfanuméricos.
 */
export function normalizarIdentificadorConfusaoOcr(identificador: string): string {
  if (!identificador) return "";

  return normalizarTextoSemAcentosUpper(identificador)
    .replace(/[^A-Z0-9£€]/g, "")
    .replace(/[£€]/g, "E")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

/**
 * Identifica a instituição financeira emissora ou envolvida com base nos termos do comprovante.
 *
 * @param {string} textoBruto - Texto completo extraído do comprovante.
 * @returns {string} Nome padronizado do banco ou `"DESCONHECIDO"`.
 */
export function identificarBancoComprovante(textoBruto: string): string {
  const textoNormalizado = normalizarTextoSemAcentosUpper(textoBruto);

  for (const regra of REGRAS_BANCOS) {
    if (regra.padroes.some((padrao) => padrao.test(textoNormalizado))) {
      return regra.nome;
    }
  }

  return "DESCONHECIDO";
}
