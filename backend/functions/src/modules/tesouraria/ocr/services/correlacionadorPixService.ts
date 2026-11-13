// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/services/correlacionadorPixService.ts
// ============================================================================

import {
  CodigoAlertaOcr,
  ContextoAnaliseComprovante,
  PedidoCorrelacaoOcr,
  ResultadoCorrelacaoOcr,
  VeredictoCorrelacaoOcr,
} from "../contracts/ocrContracts";
import {
  normalizarIdentificadorConfusaoOcr,
  normalizarTextoSemAcentosUpper,
} from "../handlers/normalizacaoOcrUtils";

const STOPWORDS_RECEBEDOR = new Set([
  "DE",
  "DA",
  "DO",
  "DOS",
  "DAS",
  "LTDA",
  "EPP",
  "MEI",
  "SA",
  "S",
  "A",
]);

/**
 * Serviço OO puro responsável por correlacionar os campos extraídos de um comprovante
 * com os dados esperados do pedido no Firestore, calculando score e veredicto consultivo.
 */
export class CorrelacionadorPixService {
  /**
   * Executa a correlação determinística entre o contexto extraído e o pedido.
   * Nunca aprova financeiramente por conta própria; produz apenas veredicto consultivo.
   *
   * @param {ContextoAnaliseComprovante} contexto - Dados extraídos pela Chain of Responsibility.
   * @param {PedidoCorrelacaoOcr} pedido - Metadados esperados do pedido.
   * @param {boolean} e2eDuplicado - Indica se o E2E ID já pertence a outro pagamento.
   * @returns {ResultadoCorrelacaoOcr} Score (0-100), veredicto, flags e motivos.
   */
  correlacionar(
    contexto: ContextoAnaliseComprovante,
    pedido: PedidoCorrelacaoOcr,
    e2eDuplicado: boolean,
  ): ResultadoCorrelacaoOcr {
    const alertas = new Set<CodigoAlertaOcr>(contexto.alertasTexto);
    const motivos: string[] = [];
    let score = 0;

    // 1. Correlação pelo TxID (RIFA...)
    const avaliacaoTxid = this.avaliarCorrespondenciaTxid(
      contexto.txidCandidatos,
      pedido.txidEsperado,
    );
    if (avaliacaoTxid.bate) {
      if (avaliacaoTxid.tipoMatch === "EXATO") {
        score += 45;
        motivos.push(`TxID conferido exatamente (${pedido.txidEsperado}).`);
      } else if (avaliacaoTxid.tipoMatch === "OCR_CHAR") {
        score += 40;
        motivos.push(
          `TxID conferido com normalização de leitura OCR (${pedido.txidEsperado}).`,
        );
      } else {
        score += 38;
        motivos.push(
          `TxID compatível com tolerância de 1 caractere OCR (lido ${contexto.txidLido}, esperado ${pedido.txidEsperado}).`,
        );
      }
    } else if (avaliacaoTxid.outroPedido) {
      alertas.add("TXID_DE_OUTRO_PEDIDO");
      motivos.push(
        `TxID divergente: esperado ${pedido.txidEsperado}, lido ${contexto.txidCandidatos.join(", ")}.`,
      );
    } else {
      alertas.add("TXID_NAO_ENCONTRADO");
      motivos.push("Comprovante não exibiu ou OCR não localizou o TxID RIFA....");
    }

    // 2. Conferência de valor exato (em centavos)
    const tolerancia = pedido.toleranciaCentavos ?? 0;
    let valorBate = false;
    if (
      contexto.valorCentavos !== null &&
      Math.abs(contexto.valorCentavos - pedido.valorCentavos) <= tolerancia
    ) {
      valorBate = true;
      score += 35;
      motivos.push(`Valor conferido: R$ ${(pedido.valorCentavos / 100).toFixed(2)}.`);
    } else if (
      contexto.valoresCandidatosCentavos.some(
        (v) => Math.abs(v - pedido.valorCentavos) <= tolerancia,
      )
    ) {
      valorBate = true;
      score += 25;
      motivos.push(
        `Valor esperado (R$ ${(pedido.valorCentavos / 100).toFixed(2)}) encontrado em campo secundário.`,
      );
    } else if (contexto.valoresCandidatosCentavos.length > 0) {
      alertas.add("VALOR_DIVERGENTE");
      const lidoReais = (
        (contexto.valorCentavos ?? contexto.valoresCandidatosCentavos[0]) / 100
      ).toFixed(2);
      motivos.push(
        `Valor divergente: esperado R$ ${(pedido.valorCentavos / 100).toFixed(2)}, lido R$ ${lidoReais}.`,
      );
    } else {
      alertas.add("VALOR_NAO_ENCONTRADO");
      motivos.push("Não foi possível identificar valor em R$ no comprovante.");
    }

    // 3. Unicidade do E2E ID
    let e2eUnico = true;
    if (contexto.e2eId) {
      if (e2eDuplicado) {
        e2eUnico = false;
        alertas.add("E2E_DUPLICADO");
        motivos.push(`End-to-End ID ${contexto.e2eId} já utilizado em outro pagamento.`);
      } else {
        score += 10;
        motivos.push(`End-to-End ID único identificado (${contexto.e2eId}).`);
      }
    }

    // 4. Conferência de recebedor (CNPJ ou nome/aliases)
    const avalRecebedor = this.avaliarRecebedor(contexto, pedido);
    if (avalRecebedor.bate === true) {
      score += 10;
      motivos.push(
        avalRecebedor.viaCnpj
          ? `CNPJ do recebedor conferido (${contexto.cnpjRecebedorDetectado}).`
          : `Recebedor compatível (${contexto.recebedorDetectado}).`,
      );
    } else if (avalRecebedor.bate === false) {
      alertas.add("RECEBEDOR_DIVERGENTE");
      motivos.push(
        `Recebedor divergente: lido '${contexto.recebedorDetectado || contexto.cnpjRecebedorDetectado}'.`,
      );
    }

    // 5. Conferência temporal (fuso BRT -03:00 vs UTC)
    if (
      this.verificarComprovanteAnteriorAoPedido(
        contexto.dataTransacaoIso,
        pedido.dataCriacaoIso,
      )
    ) {
      alertas.add("COMPROVANTE_ANTERIOR_AO_PEDIDO");
      motivos.push(
        `Data do comprovante (${contexto.dataTransacaoIso}) é anterior à criação do pedido (${pedido.dataCriacaoIso}).`,
      );
    }

    if (alertas.has("AGENDAMENTO_DETECTADO")) {
      motivos.push("Comprovante indica Pix AGENDADO/programado (não efetivado).");
    }
    if (alertas.has("STATUS_CANCELADO_OU_RECUSADO")) {
      motivos.push("Comprovante indica transação CANCELADA, recusada ou estornada.");
    }

    const veredicto = this.definirVeredicto(
      alertas,
      avaliacaoTxid.bate,
      valorBate,
      avalRecebedor.bate,
      Boolean(contexto.e2eId),
    );

    const scoreFinal =
      veredicto === "SUSPEITO" || veredicto === "DIVERGENTE"
        ? Math.min(score, 40)
        : Math.min(score, 100);

    return {
      veredicto,
      score: scoreFinal,
      txidBate: avaliacaoTxid.bate,
      valorBate,
      recebedorBate: avalRecebedor.bate,
      e2eUnico,
      alertas: Array.from(alertas),
      motivos,
    };
  }

  private extrairTokensSignificativos(nome: string): string[] {
    return normalizarTextoSemAcentosUpper(nome)
      .replace(/[^A-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !STOPWORDS_RECEBEDOR.has(t));
  }

  private calcularDistanciaEdicao(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (Math.abs(m - n) > 2) return Math.abs(m - n);

    const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const custo = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + custo,
        );
      }
    }

    return dp[m][n];
  }

  private normalizarAmbiguidadeEstendidaTxid(txid: string): string {
    return normalizarIdentificadorConfusaoOcr(txid)
      .replace(/B/g, "8")
      .replace(/G/g, "6")
      .replace(/S/g, "5")
      .replace(/Z/g, "2");
  }

  private avaliarCorrespondenciaTxid(
    candidatos: string[],
    txidEsperado: string,
  ): { bate: boolean; tipoMatch: "EXATO" | "OCR_CHAR" | "FUZZY_1" | null; outroPedido: boolean } {
    if (candidatos.length === 0) {
      return { bate: false, tipoMatch: null, outroPedido: false };
    }

    const esperadoUpper = normalizarTextoSemAcentosUpper(txidEsperado).trim();
    if (candidatos.some((c) => c === esperadoUpper)) {
      return { bate: true, tipoMatch: "EXATO", outroPedido: false };
    }

    const esperadoNorm = this.normalizarAmbiguidadeEstendidaTxid(esperadoUpper);
    if (
      esperadoNorm &&
      candidatos.some((c) => this.normalizarAmbiguidadeEstendidaTxid(c) === esperadoNorm)
    ) {
      return { bate: true, tipoMatch: "OCR_CHAR", outroPedido: false };
    }

    if (esperadoUpper.startsWith("RIFA") && esperadoUpper.length >= 10) {
      const sufixoEsperado = this.normalizarAmbiguidadeEstendidaTxid(esperadoUpper.slice(4));
      const bateFuzzy = candidatos.some((c) => {
        if (!c.startsWith("RIFA") || c.length < 10) return false;
        const sufixoLido = this.normalizarAmbiguidadeEstendidaTxid(c.slice(4));
        return this.calcularDistanciaEdicao(sufixoLido, sufixoEsperado) <= 1;
      });

      if (bateFuzzy) {
        return { bate: true, tipoMatch: "FUZZY_1", outroPedido: false };
      }
    }

    return { bate: false, tipoMatch: null, outroPedido: true };
  }

  private avaliarRecebedor(
    contexto: ContextoAnaliseComprovante,
    pedido: PedidoCorrelacaoOcr,
  ): { bate: boolean | null; viaCnpj: boolean } {
    const cnpjEsperado = (pedido.cnpjRecebedorEsperado || "").replace(/\D/g, "");
    if (cnpjEsperado && contexto.cnpjRecebedorDetectado) {
      return {
        bate: contexto.cnpjRecebedorDetectado === cnpjEsperado,
        viaCnpj: true,
      };
    }

    const nomesEsperados = [
      ...(pedido.recebedorEsperado ? [pedido.recebedorEsperado] : []),
      ...(pedido.recebedorAliases ?? []),
    ].filter(Boolean);

    if (!contexto.recebedorDetectado || nomesEsperados.length === 0) {
      return { bate: null, viaCnpj: false };
    }

    const detectadoUpper = normalizarTextoSemAcentosUpper(
      contexto.recebedorDetectado,
    ).trim();
    const tokensDetectados = new Set(
      this.extrairTokensSignificativos(contexto.recebedorDetectado),
    );
    if (tokensDetectados.size === 0) {
      return { bate: null, viaCnpj: false };
    }

    for (const nomeEsperado of nomesEsperados) {
      const esperadoUpper = normalizarTextoSemAcentosUpper(nomeEsperado).trim();
      if (detectadoUpper === esperadoUpper) {
        return { bate: true, viaCnpj: false };
      }

      const tokensEsperados = this.extrairTokensSignificativos(nomeEsperado);
      if (tokensEsperados.length === 0) continue;

      const encontrados = tokensEsperados.filter((t) => tokensDetectados.has(t)).length;
      if (encontrados / tokensEsperados.length >= 0.5) {
        return { bate: true, viaCnpj: false };
      }
    }

    return { bate: false, viaCnpj: false };
  }

  private verificarComprovanteAnteriorAoPedido(
    dataTransacaoIso: string | null,
    dataPedidoIso?: string,
  ): boolean {
    if (!dataTransacaoIso || !dataPedidoIso) {
      return false;
    }

    const diaComprovante = dataTransacaoIso.slice(0, 10);
    const diaPedido = dataPedidoIso.slice(0, 10);
    const semHoraExplicita = dataTransacaoIso.includes("T00:00:00");

    if (semHoraExplicita) {
      return diaComprovante < diaPedido;
    }

    const msComprovante = Date.parse(dataTransacaoIso);
    const msPedido = Date.parse(dataPedidoIso);
    if (Number.isFinite(msComprovante) && Number.isFinite(msPedido)) {
      return msComprovante < msPedido - 5 * 60 * 1000;
    }

    return diaComprovante < diaPedido;
  }

  private definirVeredicto(
    alertas: Set<CodigoAlertaOcr>,
    txidBate: boolean,
    valorBate: boolean,
    recebedorBate: boolean | null,
    temE2e: boolean,
  ): VeredictoCorrelacaoOcr {
    if (
      alertas.has("AGENDAMENTO_DETECTADO") ||
      alertas.has("STATUS_CANCELADO_OU_RECUSADO") ||
      alertas.has("E2E_DUPLICADO")
    ) {
      return "SUSPEITO";
    }

    if (
      alertas.has("VALOR_DIVERGENTE") ||
      alertas.has("TXID_DE_OUTRO_PEDIDO") ||
      alertas.has("RECEBEDOR_DIVERGENTE") ||
      alertas.has("COMPROVANTE_ANTERIOR_AO_PEDIDO")
    ) {
      return "DIVERGENTE";
    }

    if (alertas.has("TEXTO_INSUFICIENTE") || (!txidBate && !valorBate)) {
      return "ILEGIVEL";
    }

    if (txidBate && valorBate) {
      return "CORRELACAO_FORTE";
    }

    if (valorBate && (recebedorBate === true || temE2e)) {
      return "CORRELACAO_PARCIAL";
    }

    return "CORRELACAO_PARCIAL";
  }
}
