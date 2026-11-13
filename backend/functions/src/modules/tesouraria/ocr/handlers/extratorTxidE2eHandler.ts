// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/handlers/extratorTxidE2eHandler.ts
// ============================================================================

import { ContextoAnaliseComprovante } from "../contracts/ocrContracts";
import { BaseAnalisadorHandler } from "./baseAnalisadorHandler";

/**
 * Elo responsável por extrair os códigos `txid` (`RIFA...` / `Cód.Produto`) e o
 * `End-to-End ID` Pix (32 caracteres iniciados por `E`) do texto normalizado.
 */
export class ExtratorTxidE2eHandler extends BaseAnalisadorHandler {
  protected processar(contexto: ContextoAnaliseComprovante): void {
    const txids = this.extrairTxIdsRifa(contexto.textoUpper);
    contexto.txidCandidatos = txids;
    contexto.txidLido = txids[0] ?? null;
    contexto.e2eId = this.extrairEndToEndIdPix(contexto.textoUpper);
  }

  private extrairTxIdsRifa(textoUpper: string): string[] {
    const encontrados = new Set<string>();
    const regexLinha = /\bR[I1L]FA[\s\-_]*([A-Z0-9]{4,21})\b/g;

    for (const match of textoUpper.matchAll(regexLinha)) {
      const sufixoLimpo = (match[1] || "").replace(/[^A-Z0-9]/g, "");
      if (sufixoLimpo.length >= 6) {
        encontrados.add(`RIFA${sufixoLimpo}`.substring(0, 25));
      }
    }

    const textoCompacto = textoUpper.replace(/[^A-Z0-9]/g, "");
    const regexCompacto = /R[I1L]FA([A-Z0-9]{8,21})/g;
    for (const match of textoCompacto.matchAll(regexCompacto)) {
      const sufixo = match[1] || "";
      if (sufixo.length >= 8) {
        const candidato14 = `RIFA${sufixo.substring(0, 10)}`;
        if (!Array.from(encontrados).some((item) => item.startsWith(candidato14))) {
          encontrados.add(candidato14);
        }
      }
    }

    return Array.from(encontrados);
  }

  private extrairEndToEndIdPix(textoUpper: string): string | null {
    const regexFronteira =
      /(?:^|[^A-Z0-9])([E£€](?:[ \t\-\r\n]*[A-Z0-9]){31,32})(?=$|[^A-Z0-9])/g;

    for (const match of textoUpper.matchAll(regexFronteira)) {
      let brutoCompacto = (match[1] || "")
        .replace(/[^A-Z0-9£€]/g, "")
        .replace(/^[£€]/, "E");

      // Corrige duplicação de zeros à esquerda do ISPB observada em prints do Inter (EOO0416968...)
      if (brutoCompacto.length === 33 && /^E[0O]{3}[1-9A-Z]/.test(brutoCompacto)) {
        const anoDeslocado = brutoCompacto
          .substring(10, 14)
          .replace(/O/g, "0")
          .replace(/[IL]/g, "1");
        if (/^202\d$/.test(anoDeslocado)) {
          brutoCompacto = `E${brutoCompacto.substring(2)}`;
        }
      }

      if (brutoCompacto.length !== 32) continue;

      const ispbNormalizado = brutoCompacto
        .substring(1, 9)
        .replace(/O/g, "0")
        .replace(/[IL]/g, "1");
      const anoNormalizado = brutoCompacto
        .substring(9, 13)
        .replace(/O/g, "0")
        .replace(/[IL]/g, "1");

      if (/^\d{8}$/.test(ispbNormalizado) && /^202\d$/.test(anoNormalizado)) {
        return `E${ispbNormalizado}${anoNormalizado}${brutoCompacto.substring(13)}`;
      }
    }

    return null;
  }
}
