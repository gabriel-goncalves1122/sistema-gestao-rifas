/**
 * Parser determinístico para extratos bancários de Pix (CSV e OFX da InfinitePay).
 *
 * @module extratoBancarioParser
 */
import * as Papa from "papaparse";

export interface LinhaExtratoBancario {
  data: string;
  valor: number;
  txid?: string;
  endToEndId?: string;
  nomePagador?: string;
  documentoPagador?: string;
  descricao?: string;
  linhaOriginal: number;
}

/**
 * Converte strings monetárias variadas (ex: "R$ 20,00", " 20,50 ", "20.00", "20") em number.
 *
 * @param {any} valorBruto - Entrada crua de valor.
 * @returns {number} Valor numérico em reais ou 0 se inválido.
 */
export function normalizarValorMonetario(valorBruto: any): number {
  if (typeof valorBruto === "number") {
    return isNaN(valorBruto) ? 0 : Number(valorBruto.toFixed(2));
  }
  if (!valorBruto || typeof valorBruto !== "string") {
    return 0;
  }

  // Remove caracteres que não sejam dígitos, sinal de menos, ponto ou vírgula
  const limpo = valorBruto
    .replace(/[^\d.,-]/g, "")
    .trim();

  if (!limpo) return 0;

  // Se tiver vírgula e ponto (ex: "1.250,50"), remove o ponto e troca vírgula por ponto
  if (limpo.includes(",") && limpo.includes(".")) {
    const tratado = limpo.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(tratado);
    return isNaN(num) ? 0 : Number(num.toFixed(2));
  }

  // Se tiver apenas vírgula (ex: "20,00"), substitui por ponto
  if (limpo.includes(",")) {
    const tratado = limpo.replace(",", ".");
    const num = parseFloat(tratado);
    return isNaN(num) ? 0 : Number(num.toFixed(2));
  }

  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : Number(num.toFixed(2));
}

/**
 * Normaliza um identificador txid ou EndToEndId removendo espaços e caracteres especiais.
 *
 * @param {any} id - Identificador bruto.
 * @returns {string | undefined} Identificador limpo em caixa alta ou undefined.
 */
export function normalizarIdentificadorPix(id: any): string | undefined {
  if (!id || typeof id !== "string") return undefined;
  const limpo = id.trim().replace(/[^a-zA-Z0-9]/g, "");
  return limpo.length > 0 ? limpo.toUpperCase() : undefined;
}

/**
 * Extrai o EndToEndId (iniciado por E seguido de 31 caracteres alfanuméricos) se presente no texto.
 *
 * @param {string} texto - Texto onde buscar o E2E.
 * @returns {string | undefined} E2E ID normalizado ou undefined.
 */
export function extrairEndToEndId(texto: string): string | undefined {
  if (!texto) return undefined;
  const match = texto.match(/E[a-zA-Z0-9]{31}/i);
  return match ? match[0].toUpperCase() : undefined;
}

/**
 * Extrai txid embutido em texto (como MEMO ou descrição), procurando por "RIFA..."
 *
 * @param {string} texto - Texto onde buscar o txid.
 * @returns {string | undefined} txid ou undefined.
 */
export function extrairTxidDeTexto(texto: string): string | undefined {
  if (!texto) return undefined;
  const match = texto.match(/RIFA[a-zA-Z0-9]{6,21}/i);
  return match ? match[0].toUpperCase() : undefined;
}

/**
 * Faz o parsing de conteúdo CSV de extrato bancário (InfinitePay).
 *
 * @param {string} conteudoCsv - Conteúdo de texto do arquivo CSV.
 * @returns {LinhaExtratoBancario[]} Lista de transações normalizadas.
 */
export function parsearExtratoCsv(conteudoCsv: string): LinhaExtratoBancario[] {
  if (!conteudoCsv || !conteudoCsv.trim()) {
    return [];
  }

  const parsed = Papa.parse<Record<string, string>>(conteudoCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const linhas: LinhaExtratoBancario[] = [];

  parsed.data.forEach((linha, index) => {
    // Busca colunas de valor
    const valorChave = Object.keys(linha).find((k) =>
      /valor|amount|bruto|liquido/i.test(k)
    );
    const valor = valorChave ? normalizarValorMonetario(linha[valorChave]) : 0;

    // Filtra apenas recebimentos (valores positivos > 0)
    if (valor <= 0) return;

    // Filtra transações canceladas, recusadas, negadas ou estornadas (comum em extratos de adquirentes)
    const statusChave = Object.keys(linha).find((k) =>
      /status|situacao|situação/i.test(k)
    );
    const statusTexto = statusChave
      ? String(linha[statusChave] || "").trim().toLowerCase()
      : "";

    if (
      statusTexto &&
      /negad|recusad|cancelad|falh|estorn/i.test(statusTexto)
    ) {
      return;
    }

    // Busca colunas de data
    const dataChave = Object.keys(linha).find((k) =>
      /data|date|horario|criado/i.test(k)
    );
    const data = dataChave ? String(linha[dataChave] || "").trim() : "";

    // Busca colunas de Identificador / txid
    const idChave = Object.keys(linha).find((k) =>
      /identificador|txid|referencia|codigo/i.test(k)
    );
    let txid = idChave ? normalizarIdentificadorPix(linha[idChave]) : undefined;

    // Busca colunas de E2E
    const e2eChave = Object.keys(linha).find((k) =>
      /e2e|fim a fim|endtoend/i.test(k)
    );
    let endToEndId = e2eChave ? normalizarIdentificadorPix(linha[e2eChave]) : undefined;

    // Se o txid tem formato de E2E (E + 31 chars), move para endToEndId
    if (txid && /^E[A-Z0-9]{31}$/.test(txid)) {
      if (!endToEndId) endToEndId = txid;
      txid = undefined;
    }

    // Busca colunas de nome do pagador
    const nomeChave = Object.keys(linha).find((k) =>
      /origem - nome|nome do pagador|nome|cliente|pagador/i.test(k)
    );
    const nomePagador = nomeChave ? String(linha[nomeChave] || "").trim() : undefined;

    // Busca CPF/CNPJ
    const docChave = Object.keys(linha).find((k) =>
      /cpf|cnpj|documento/i.test(k)
    );
    const documentoPagador = docChave ? String(linha[docChave] || "").trim() : undefined;

    // Busca descrição / memo
    const descChave = Object.keys(linha).find((k) =>
      /descricao|descrição|memo|tipo/i.test(k)
    );
    const descricao = descChave ? String(linha[descChave] || "").trim() : undefined;

    // Se não encontrou txid diretamente, tenta encontrar na descrição ou no nome
    if (!txid && descricao) {
      txid = extrairTxidDeTexto(descricao);
    }
    if (!endToEndId && descricao) {
      endToEndId = extrairEndToEndId(descricao);
    }

    linhas.push({
      data,
      valor,
      txid,
      endToEndId,
      nomePagador: nomePagador || undefined,
      documentoPagador: documentoPagador || undefined,
      descricao: descricao || undefined,
      linhaOriginal: index + 2, // Compensando cabeçalho (linha 1)
    });
  });

  return linhas;
}

/**
 * Faz o parsing de conteúdo OFX de extrato bancário.
 *
 * @param {string} conteudoOfx - Conteúdo de texto do arquivo OFX.
 * @returns {LinhaExtratoBancario[]} Lista de transações de crédito normalizadas.
 */
export function parsearExtratoOfx(conteudoOfx: string): LinhaExtratoBancario[] {
  if (!conteudoOfx || !conteudoOfx.trim()) {
    return [];
  }

  const linhas: LinhaExtratoBancario[] = [];
  const transacoesRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = transacoesRegex.exec(conteudoOfx)) !== null) {
    index++;
    const bloco = match[1];

    // Tipo de transação (CREDIT / OTHER)
    const trnTypeMatch = bloco.match(/<TRNTYPE>([\s\S]*?)(?:<|\r|\n)/i);
    const trnType = trnTypeMatch ? trnTypeMatch[1].trim().toUpperCase() : "";

    // Valor da transação
    const trnAmtMatch = bloco.match(/<TRNAMT>([\s\S]*?)(?:<|\r|\n)/i);
    const valor = trnAmtMatch ? normalizarValorMonetario(trnAmtMatch[1]) : 0;

    // Apenas créditos / valores positivos
    if (valor <= 0 && trnType !== "CREDIT") continue;

    // Data
    const dtPostedMatch = bloco.match(/<DTPOSTED>([\s\S]*?)(?:<|\r|\n)/i);
    const data = dtPostedMatch ? dtPostedMatch[1].trim() : "";

    // FITID / CHECKNUM / MEMO / NAME
    const fitIdMatch = bloco.match(/<FITID>([\s\S]*?)(?:<|\r|\n)/i);
    const fitId = fitIdMatch ? fitIdMatch[1].trim() : "";

    const checkNumMatch = bloco.match(/<CHECKNUM>([\s\S]*?)(?:<|\r|\n)/i);
    const checkNum = checkNumMatch ? checkNumMatch[1].trim() : "";

    const memoMatch = bloco.match(/<MEMO>([\s\S]*?)(?:<|\r|\n)/i);
    const memo = memoMatch ? memoMatch[1].trim() : "";

    const nameMatch = bloco.match(/<NAME>([\s\S]*?)(?:<|\r|\n)/i);
    const name = nameMatch ? nameMatch[1].trim() : "";

    const textoCompleto = `${fitId} ${checkNum} ${memo} ${name}`;
    const txid = extrairTxidDeTexto(textoCompleto) || normalizarIdentificadorPix(checkNum);
    const endToEndId = extrairEndToEndId(textoCompleto);

    linhas.push({
      data,
      valor: Math.abs(valor),
      txid,
      endToEndId,
      nomePagador: name || undefined,
      descricao: memo || undefined,
      linhaOriginal: index,
    });
  }

  return linhas;
}

/**
 * Função unificada que identifica o formato pelo conteúdo ou nome do arquivo e faz o parse.
 *
 * @param {string} conteudo - Conteúdo textual do extrato.
 * @param {string} nomeArquivo - Nome do arquivo para inferência de formato.
 * @returns {LinhaExtratoBancario[]} Lista de transações extraídas.
 */
export function parsearExtratoBancario(
  conteudo: string,
  nomeArquivo?: string,
): LinhaExtratoBancario[] {
  const ehOfx =
    (nomeArquivo && /\.ofx$/i.test(nomeArquivo)) ||
    conteudo.includes("<OFX>") ||
    conteudo.includes("<STMTTRN>");

  if (ehOfx) {
    return parsearExtratoOfx(conteudo);
  }

  return parsearExtratoCsv(conteudo);
}
