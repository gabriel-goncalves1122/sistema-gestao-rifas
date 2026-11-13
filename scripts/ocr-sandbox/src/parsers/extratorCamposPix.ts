// ============================================================================
// ARQUIVO: scripts/ocr-sandbox/src/parsers/extratorCamposPix.ts
// ============================================================================

import { CodigoAlertaOcr, DadosExtraidosComprovante } from "../types/ocrSandboxTypes.js";
import {
  identificarBancoComprovante,
  normalizarTextoSemAcentosUpper,
} from "./regrasBancosMelhoradas.js";

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
 * Extrai possíveis `txid`s gerados pelo checkout (`RIFA...`) mesmo quando o OCR
 * quebra a linha, insere espaços/hífens ou confunde `I`/`1`/`L` no prefixo `RIFA`.
 *
 * @param {string} textoUpper - Texto normalizado sem acentos em caixa alta.
 * @returns {string[]} Lista única de `txid`s candidatos ordenados por ocorrência.
 */
export function extrairTxIdsRifa(textoUpper: string): string[] {
  const encontrados = new Set<string>();
  const regexLinha = /\bR[I1L]FA[\s\-_]*([A-Z0-9]{4,21})\b/g;

  for (const match of textoUpper.matchAll(regexLinha)) {
    const sufixoLimpo = (match[1] || "").replace(/[^A-Z0-9]/g, "");
    if (sufixoLimpo.length >= 6) {
      encontrados.add(`RIFA${sufixoLimpo}`.substring(0, 25));
    }
  }

  // Fallback para textos onde o código sofreu quebra de linha no meio do sufixo
  const textoCompacto = textoUpper.replace(/[^A-Z0-9]/g, "");
  const regexCompacto = /R[I1L]FA([A-Z0-9]{8,21})/g;
  for (const match of textoCompacto.matchAll(regexCompacto)) {
    const sufixo = match[1] || "";
    if (sufixo.length >= 8) {
      // Limita ao tamanho padrão do EmvOfflinePaymentProvider (4 + 10 = 14) quando colado em rótulo seguinte
      const candidato14 = `RIFA${sufixo.substring(0, 10)}`;
      if (!Array.from(encontrados).some((item) => item.startsWith(candidato14))) {
        encontrados.add(candidato14);
      }
    }
  }

  return Array.from(encontrados);
}

/**
 * Extrai o End-to-End ID (32 caracteres iniciando com `E`, ex: `E182361202026...`)
 * tolerando espaços ou quebras de linha comuns em prints e PDFs bancários.
 *
 * @param {string} textoUpper - Texto normalizado sem acentos em caixa alta.
 * @returns {string | null} ID E2E normalizado ou `null` quando ausente/inválido.
 */
export function extrairEndToEndIdPix(textoUpper: string): string | null {
  // Procura candidatos iniciando em fronteira de palavra para evitar que o "E" de palavras
  // anteriores (ex: "IDENTIFICADOR", "RECEBEDOR") engula o início real do E2E ID.
  // Aceita 31 a 32 chars após o "E" para absorver duplicações pontuais de zeros à esquerda do ISPB (ex: Inter EOO0416968).
  const regexFronteira =
    /(?:^|[^A-Z0-9])([E£€](?:[ \t\-\r\n]*[A-Z0-9]){31,32})(?=$|[^A-Z0-9])/g;

  for (const match of textoUpper.matchAll(regexFronteira)) {
    let brutoCompacto = (match[1] || "")
      .replace(/[^A-Z0-9£€]/g, "")
      .replace(/^[£€]/, "E");

    // Corrige caso real de OCR (ex: Banco Inter) onde "E00416968..." vira "EOO0416968..." (33 chars com ano deslocado para [10..14])
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

    const ispbNumerico = /^\d{8}$/.test(ispbNormalizado);
    const anoValido = /^202\d$/.test(anoNormalizado);

    if (anoValido && ispbNumerico) {
      return `E${ispbNormalizado}${anoNormalizado}${brutoCompacto.substring(13)}`;
    }
  }

  return null;
}

/**
 * Converte string monetária brasileira (`1.234,56` ou `30,00`) para centavos inteiros.
 *
 * @param {string} trechoValor - Valor numérico capturado por regex.
 * @returns {number | null} Valor em centavos ou `null` se inválido/zero.
 */
function parseValorBrasileiroParaCentavos(trechoValor: string): number | null {
  const limpo = trechoValor.replace(/\./g, "").replace(",", ".");
  const numero = Number.parseFloat(limpo);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return Math.round(numero * 100);
}

/**
 * Extrai os valores monetários encontrados no comprovante, priorizando linhas
 * contextualizadas por palavras-chave de pagamento e ignorando linhas de saldo/tarifa.
 *
 * @param {string} textoUpper - Texto normalizado sem acentos em caixa alta.
 * @returns {{ principalCentavos: number | null; candidatosCentavos: number[] }} Valor principal e candidatos.
 */
export function extrairValoresPixCentavos(textoUpper: string): {
  principalCentavos: number | null;
  candidatosCentavos: number[];
} {
  const linhas = textoUpper.split(/\r?\n/);
  const prioritarios: number[] = [];
  const secundarios: number[] = [];
  const regexMoeda = /(?:R\s*\$|RS|BRL)\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g;

  for (const linha of linhas) {
    if (PALAVRAS_IGNORAR_VALOR.test(linha)) continue;

    for (const match of linha.matchAll(regexMoeda)) {
      const centavos = parseValorBrasileiroParaCentavos(match[1]);
      if (centavos === null) continue;

      if (PALAVRAS_CHAVE_VALOR.test(linha)) {
        prioritarios.push(centavos);
      } else {
        secundarios.push(centavos);
      }
    }
  }

  // Fallback para comprovantes onde "R$" foi corrompido pelo OCR próximo a palavra-chave "VALOR"
  if (prioritarios.length === 0 && secundarios.length === 0) {
    for (const linha of linhas) {
      if (!PALAVRAS_CHAVE_VALOR.test(linha) || PALAVRAS_IGNORAR_VALOR.test(linha)) continue;
      for (const match of linha.matchAll(/\b(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\b/g)) {
        const centavos = parseValorBrasileiroParaCentavos(match[1]);
        if (centavos !== null) prioritarios.push(centavos);
      }
    }
  }

  const todosUnicos = Array.from(new Set([...prioritarios, ...secundarios]));
  const principalCentavos = prioritarios[0] ?? secundarios[0] ?? null;

  return {
    principalCentavos,
    candidatosCentavos: todosUnicos,
  };
}

/**
 * Monta string ISO UTC/local simplificada quando dia, mês e ano são válidos.
 */
function montarDataIso(
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
  // Comprovantes bancários brasileiros são sempre emitidos em fuso de Brasília (-03:00)
  return `${ano}-${pad(mes)}-${pad(dia)}T${pad(hora)}:${pad(minuto)}:${pad(segundo)}-03:00`;
}

/**
 * Extrai a data (e hora opcional) da transação suportando formato numérico (`DD/MM/YYYY`),
 * data com mês abreviado (`02/set/2026` no PicPay) e formato textual (`13 NOV 2026`),
 * além de capturar `Horário 10h42` em linha separada (Banco Inter).
 *
 * @param {string} textoUpper - Texto normalizado sem acentos em caixa alta.
 * @returns {string | null} Data/hora ISO com offset `-03:00` ou `null`.
 */
export function extrairDataTransacaoIso(textoUpper: string): string | null {
  const matchHorarioSeparado = textoUpper.match(/\bHORARIO[:\s]+(\d{1,2})H(\d{2})(?:M(\d{2}))?\b/);
  const horaExtra = matchHorarioSeparado ? Number(matchHorarioSeparado[1]) : 0;
  const minExtra = matchHorarioSeparado ? Number(matchHorarioSeparado[2]) : 0;
  const segExtra = matchHorarioSeparado?.[3] ? Number(matchHorarioSeparado[3]) : 0;

  const matchNumerico = textoUpper.match(
    /\b(\d{2})\/(\d{2})\/(20\d{2})(?:\s*(?:-|AS|A)?\s*(\d{2}):(\d{2})(?::(\d{2}))?)?\b/,
  );

  if (matchNumerico) {
    const temHoraMesmaLinha = matchNumerico[4] !== undefined;
    return montarDataIso(
      Number(matchNumerico[1]),
      Number(matchNumerico[2]),
      Number(matchNumerico[3]),
      temHoraMesmaLinha ? Number(matchNumerico[4]) : horaExtra,
      temHoraMesmaLinha ? Number(matchNumerico[5]) : minExtra,
      temHoraMesmaLinha ? Number(matchNumerico[6] ?? 0) : segExtra,
    );
  }

  const matchTextual = textoUpper.match(
    /\b(\d{1,2})[\s/]+(?:DE\s+)?([A-Z]{3,9})[\s/]+(?:DE\s+)?(20\d{2})(?:\s*(?:-|AS)?\s*(\d{2}):(\d{2})(?::(\d{2}))?)?\b/,
  );

  if (matchTextual) {
    const mesNumero = MESES_PT[matchTextual[2]];
    if (mesNumero) {
      const temHoraMesmaLinha = matchTextual[4] !== undefined;
      return montarDataIso(
        Number(matchTextual[1]),
        mesNumero,
        Number(matchTextual[3]),
        temHoraMesmaLinha ? Number(matchTextual[4]) : horaExtra,
        temHoraMesmaLinha ? Number(matchTextual[5]) : minExtra,
        temHoraMesmaLinha ? Number(matchTextual[6] ?? 0) : segExtra,
      );
    }
  }

  return null;
}

/**
 * Tenta capturar o nome e o CNPJ do recebedor/favorecido nas linhas adjacentes aos rótulos bancários.
 *
 * @param {string} textoUpper - Texto normalizado sem acentos em caixa alta.
 * @returns {{ recebedorDetectado: string | null; cnpjRecebedorDetectado: string | null }} Nome e CNPJ do recebedor.
 */
export function extrairRecebedorECnpj(textoUpper: string): {
  recebedorDetectado: string | null;
  cnpjRecebedorDetectado: string | null;
} {
  const linhas = textoUpper
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\|\[\]•·\-\s]+/, "").trim())
    .filter(Boolean);

  const rotulosRecebedor =
    /^(?:PARA|RECEBEDOR|FAVORECIDO|DESTINO|BENEFICIARIO|NOME DO RECEBEDOR|QUEM RECEBEU|DADOS DE QUEM RECEBEU)\b[:\s-]*(.*)$/;

  let recebedorDetectado: string | null = null;
  let cnpjRecebedorDetectado: string | null = null;

  for (let i = 0; i < linhas.length; i++) {
    const match = linhas[i].match(rotulosRecebedor);
    if (!match) continue;

    const valorMesmaLinha = (match[1] || "").trim();
    if (
      !recebedorDetectado &&
      valorMesmaLinha.length >= 3 &&
      !/^(NOME|CPF|CNPJ|CHAVE|INSTITUICAO)$/.test(valorMesmaLinha)
    ) {
      recebedorDetectado = valorMesmaLinha;
    }

    for (let j = i + 1; j <= Math.min(i + 4, linhas.length - 1); j++) {
      const linhaSeguinte = linhas[j];
      if (!recebedorDetectado) {
        const semPrefixoNome = linhaSeguinte.replace(/^NOME[:\s-]*/, "").trim();
        if (
          semPrefixoNome.length >= 3 &&
          !/^(CPF|CNPJ|CPF\/CNPJ|CHAVE|BANCO|INSTITUICAO|AGENCIA|CONTA|TIPO DE CONTA)\b/.test(
            semPrefixoNome,
          ) &&
          !/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(semPrefixoNome)
        ) {
          recebedorDetectado = semPrefixoNome;
        }
      }

      if (!cnpjRecebedorDetectado) {
        const matchCnpj = linhaSeguinte.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/);
        if (matchCnpj) {
          const digitos = matchCnpj[1].replace(/\D/g, "");
          if (digitos.length === 14) {
            cnpjRecebedorDetectado = digitos;
          }
        }
      }
    }

    if (recebedorDetectado || cnpjRecebedorDetectado) break;
  }

  return { recebedorDetectado, cnpjRecebedorDetectado };
}

/**
 * Detecta alertas críticos diretamente no texto (agendamento, cancelamento ou texto ilegível).
 *
 * @param {string} textoUpper - Texto normalizado sem acentos em caixa alta.
 * @returns {CodigoAlertaOcr[]} Lista de códigos de alerta encontrados.
 */
export function detectarAlertasTextoPix(textoUpper: string): CodigoAlertaOcr[] {
  const alertas: CodigoAlertaOcr[] = [];

  if (textoUpper.trim().length < 25) {
    alertas.push("TEXTO_INSUFICIENTE");
    return alertas;
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

  return alertas;
}

/**
 * Executa toda a extração pura e determinística dos campos Pix a partir de um texto bruto.
 *
 * @param {string} textoBruto - Texto completo retornado pelo `pdf-parse` ou `Tesseract.js`.
 * @returns {DadosExtraidosComprovante} Campos estruturados prontos para o correlacionador.
 */
export function extrairCamposPix(textoBruto: string): DadosExtraidosComprovante {
  const textoUpper = normalizarTextoSemAcentosUpper(textoBruto);
  const txidCandidatos = extrairTxIdsRifa(textoUpper);
  const e2eId = extrairEndToEndIdPix(textoUpper);
  const { principalCentavos, candidatosCentavos } = extrairValoresPixCentavos(textoUpper);
  const dataTransacaoIso = extrairDataTransacaoIso(textoUpper);
  const { recebedorDetectado, cnpjRecebedorDetectado } = extrairRecebedorECnpj(textoUpper);
  const bancoDetectado = identificarBancoComprovante(textoBruto);
  const alertasTexto = detectarAlertasTextoPix(textoUpper);

  return {
    bancoDetectado,
    txidLido: txidCandidatos[0] ?? null,
    txidCandidatos,
    e2eId,
    valorCentavos: principalCentavos,
    valoresCandidatosCentavos: candidatosCentavos,
    dataTransacaoIso,
    recebedorDetectado,
    cnpjRecebedorDetectado,
    alertasTexto,
  };
}
