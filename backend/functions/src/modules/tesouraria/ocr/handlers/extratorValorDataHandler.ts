// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/handlers/extratorValorDataHandler.ts
// ============================================================================

import { ContextoAnaliseComprovante } from "../contracts/ocrContracts";
import { BaseAnalisadorHandler } from "./baseAnalisadorHandler";

const MESES_PT: Record<string, number> = {
  JAN: 1,
  JANEIRO: 1,
  FEV: 2,
  FEVEREIRO: 2,
  MAR: 3,
  MARCO: 3,
  ABR: 4,
  ABRIL: 4,
  MAI: 5,
  MAIO: 5,
  JUN: 6,
  JUNHO: 6,
  JUL: 7,
  JULHO: 7,
  AGO: 8,
  AGOSTO: 8,
  SET: 9,
  SETEMBRO: 9,
  OUT: 10,
  OUTUBRO: 10,
  NOV: 11,
  NOVEMBRO: 11,
  DEZ: 12,
  DEZEMBRO: 12,
};

const PALAVRAS_CHAVE_VALOR =
  /\b(VALOR|PAGO|PAGAMENTO|TRANSFERIDO|TRANSFERENCIA|PIX ENVIADO|TOTAL)\b/;
const PALAVRAS_IGNORAR_VALOR = /\b(SALDO|LIMITE|TARIFA|TAXA|IOF|DESCONTO)\b/;

/**
 * Elo responsável por extrair valores monetários em centavos (ignorando saldo/tarifa)
 * e data/hora da transação já normalizada no fuso horário de Brasília (`-03:00`).
 */
export class ExtratorValorDataHandler extends BaseAnalisadorHandler {
  protected processar(contexto: ContextoAnaliseComprovante): void {
    const { principalCentavos, candidatosCentavos } = this.extrairValoresCentavos(
      contexto.textoUpper,
    );
    contexto.valorCentavos = principalCentavos;
    contexto.valoresCandidatosCentavos = candidatosCentavos;
    contexto.dataTransacaoIso = this.extrairDataTransacaoIso(contexto.textoUpper);
  }

  private parseValorBrasileiroParaCentavos(trechoValor: string): number | null {
    const limpo = trechoValor.replace(/\./g, "").replace(",", ".");
    const numero = Number.parseFloat(limpo);
    if (!Number.isFinite(numero) || numero <= 0) return null;
    return Math.round(numero * 100);
  }

  private extrairValoresCentavos(textoUpper: string): {
    principalCentavos: number | null;
    candidatosCentavos: number[];
  } {
    const linhas = textoUpper.split(/\r?\n/);
    const prioritarios: number[] = [];
    const secundarios: number[] = [];
    const regexMoeda =
      /(?:R\s*\$|RS|BRL)\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)/g;

    for (const linha of linhas) {
      if (PALAVRAS_IGNORAR_VALOR.test(linha)) continue;

      for (const match of linha.matchAll(regexMoeda)) {
        const centavos = this.parseValorBrasileiroParaCentavos(match[1]);
        if (centavos === null) continue;

        if (PALAVRAS_CHAVE_VALOR.test(linha)) {
          prioritarios.push(centavos);
        } else {
          secundarios.push(centavos);
        }
      }
    }

    if (prioritarios.length === 0 && secundarios.length === 0) {
      for (const linha of linhas) {
        if (!PALAVRAS_CHAVE_VALOR.test(linha) || PALAVRAS_IGNORAR_VALOR.test(linha)) continue;
        for (const match of linha.matchAll(/\b(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\b/g)) {
          const centavos = this.parseValorBrasileiroParaCentavos(match[1]);
          if (centavos !== null) prioritarios.push(centavos);
        }
      }
    }

    return {
      principalCentavos: prioritarios[0] ?? secundarios[0] ?? null,
      candidatosCentavos: Array.from(new Set([...prioritarios, ...secundarios])),
    };
  }

  private montarDataIso(
    dia: number,
    mes: number,
    ano: number,
    hora = 0,
    minuto = 0,
    segundo = 0,
  ): string | null {
    if (ano < 2020 || ano > 2035 || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
      return null;
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${ano}-${pad(mes)}-${pad(dia)}T${pad(hora)}:${pad(minuto)}:${pad(segundo)}-03:00`;
  }

  private extrairDataTransacaoIso(textoUpper: string): string | null {
    const matchHorarioSeparado = textoUpper.match(
      /\bHORARIO[:\s]+(\d{1,2})H(\d{2})(?:M(\d{2}))?\b/,
    );
    const horaExtra = matchHorarioSeparado ? Number(matchHorarioSeparado[1]) : 0;
    const minExtra = matchHorarioSeparado ? Number(matchHorarioSeparado[2]) : 0;
    const segExtra = matchHorarioSeparado?.[3] ? Number(matchHorarioSeparado[3]) : 0;

    const matchNumerico = textoUpper.match(
      /\b(\d{2})\/(\d{2})\/(20\d{2})(?:\s*(?:-|AS|A)?\s*(\d{2}):(\d{2})(?::(\d{2}))?)?\b/,
    );
    if (matchNumerico) {
      const temHora = matchNumerico[4] !== undefined;
      return this.montarDataIso(
        Number(matchNumerico[1]),
        Number(matchNumerico[2]),
        Number(matchNumerico[3]),
        temHora ? Number(matchNumerico[4]) : horaExtra,
        temHora ? Number(matchNumerico[5]) : minExtra,
        temHora ? Number(matchNumerico[6] ?? 0) : segExtra,
      );
    }

    const matchTextual = textoUpper.match(
      /\b(\d{1,2})[\s/]+(?:DE\s+)?([A-Z]{3,9})[\s/]+(?:DE\s+)?(20\d{2})(?:[\s,.-]*(?:AS)?\s*(\d{2}):(\d{2})(?::(\d{2}))?)?\b/,
    );
    if (matchTextual) {
      const mesNumero = MESES_PT[matchTextual[2]];
      if (mesNumero) {
        const temHora = matchTextual[4] !== undefined;
        return this.montarDataIso(
          Number(matchTextual[1]),
          mesNumero,
          Number(matchTextual[3]),
          temHora ? Number(matchTextual[4]) : horaExtra,
          temHora ? Number(matchTextual[5]) : minExtra,
          temHora ? Number(matchTextual[6] ?? 0) : segExtra,
        );
      }
    }

    return null;
  }
}
