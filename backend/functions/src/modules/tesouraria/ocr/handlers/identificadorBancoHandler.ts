// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/handlers/identificadorBancoHandler.ts
// ============================================================================

import { ContextoAnaliseComprovante } from "../contracts/ocrContracts";
import { BaseAnalisadorHandler } from "./baseAnalisadorHandler";

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
 * Elo responsável por identificar a instituição financeira emissora do comprovante.
 */
export class IdentificadorBancoHandler extends BaseAnalisadorHandler {
  protected processar(contexto: ContextoAnaliseComprovante): void {
    for (const regra of REGRAS_BANCOS) {
      if (regra.padroes.some((padrao) => padrao.test(contexto.textoUpper))) {
        contexto.bancoDetectado = regra.nome;
        return;
      }
    }
    contexto.bancoDetectado = "DESCONHECIDO";
  }
}
