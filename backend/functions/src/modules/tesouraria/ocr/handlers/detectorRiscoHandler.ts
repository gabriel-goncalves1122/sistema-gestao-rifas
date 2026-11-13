// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/handlers/detectorRiscoHandler.ts
// ============================================================================

import { CodigoAlertaOcr, ContextoAnaliseComprovante } from "../contracts/ocrContracts";
import { BaseAnalisadorHandler } from "./baseAnalisadorHandler";

/**
 * Elo responsável por detectar sinais de risco diretamente no texto:
 * texto ilegível/insuficiente, Pix agendado/programado ou transação cancelada/recusada.
 */
export class DetectorRiscoHandler extends BaseAnalisadorHandler {
  protected processar(contexto: ContextoAnaliseComprovante): void {
    const alertas: CodigoAlertaOcr[] = [];
    const { textoUpper } = contexto;

    if (textoUpper.trim().length < 25) {
      contexto.alertasTexto = ["TEXTO_INSUFICIENTE"];
      return;
    }

    const temAgendamento =
      /\b(PIX\s+AGENDADO|PAGAMENTO\s+AGENDADO|TRANSFERENCIA\s+AGENDADA|AGENDAMENTO\s+DE\s+PIX|COMPROVANTE\s+DE\s+AGENDAMENTO)\b/.test(
        textoUpper,
      ) || /\b(?:STATUS|SITUACAO)\s*[:\-]?\s*AGENDAD[OA]\b/.test(textoUpper);

    if (temAgendamento) {
      alertas.push("AGENDAMENTO_DETECTADO");
    }

    const temCancelamentoOuRecusa =
      /\b(?:STATUS|SITUACAO)\s*[:\-]?\s*(?:CANCELAD[OA]|RECUSAD[OA]|ESTORNAD[OA]|NAO\s+REALIZAD[OA]|DEVOLVID[OA])\b/.test(
        textoUpper,
      ) ||
      /\b(PIX\s+CANCELADO|TRANSACAO\s+NAO\s+REALIZADA|PAGAMENTO\s+RECUSADO|TRANSFERENCIA\s+ESTORNADA)\b/.test(
        textoUpper,
      );

    if (temCancelamentoOuRecusa) {
      alertas.push("STATUS_CANCELADO_OU_RECUSADO");
    }

    contexto.alertasTexto = alertas;
  }
}
