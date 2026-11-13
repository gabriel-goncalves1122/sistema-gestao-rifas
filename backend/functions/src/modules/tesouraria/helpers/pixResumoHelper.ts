import { ProvedorPagamento } from "../../types/models";
import {
  BilheteComNumero,
  PixTransacao,
  PixTransacoesResumo,
  ResumoComprovantesTesouraria,
} from "../types/tesourariaTypes";
import { calcularValorLiquido } from "./origemPagamentoHelper";

const VALOR_RIFA = 10;

/**
 * Gera uma chave unificadora de agrupamento para reunir múltiplos bilhetes da mesma compra.
 * Prioridade: `pix_order_id` > `pix_reference_id` > `comprovante_url` > `comprador_id` > fallback por comprador/data.
 *
 * @param {BilheteComNumero} bilhete - Bilhete individual avaliado.
 * @returns {string} Chave única de agrupamento da compra.
 */
export function chaveCompra(bilhete: BilheteComNumero): string {
  if (bilhete.pix_order_id) {
    return `pix-${bilhete.pix_order_id}`;
  }

  if (bilhete.pix_reference_id) {
    return `pixref-${bilhete.pix_reference_id}`;
  }

  if (bilhete.comprovante_url) {
    return `comprovante-${bilhete.comprovante_url}`;
  }

  if (bilhete.comprador_id) {
    return `comprador-${bilhete.comprador_id}`;
  }

  const comprador = bilhete.comprador_nome || "sem-comprador";
  const reserva = bilhete.data_reserva || "sem-data";

  return `manual|${comprador}|${reserva}|${bilhete.status}`;
}

/**
 * Avalia se uma transação Pix está efetivamente validada/paga pela Tesouraria.
 * Distingue transações já aceitas (`status: "pago"` / `statusValidacao: "aceita"`) daquelas
 * cujo Pix foi liquidado no banco (`statusPagamento: "PAID"`), mas os bilhetes ainda estão `"pendente"`.
 *
 * @param {PixTransacao} transacao - Transação Pix avaliada.
 * @returns {boolean} `true` se o pagamento estiver confirmado e validado.
 */
export function transacaoPixEstaValidada(transacao: PixTransacao): boolean {
  if (transacao.statusValidacao === "aceita") {
    return true;
  }

  if (transacao.statusValidacao === "negada") {
    return false;
  }

  if (transacao.origem === "COMPROVANTE") {
    if (transacao.rifas && transacao.rifas.length > 0) {
      return transacao.rifas.every((rifa) => rifa.status === "pago");
    }
    return transacao.statusPagamento === "PAID";
  }

  if (!["PAID", "AUTHORIZED"].includes(transacao.statusPagamento)) {
    return false;
  }

  if (transacao.rifas && transacao.rifas.length > 0) {
    return transacao.rifas.every((rifa) => rifa.status === "pago");
  }

  return true;
}

/**
 * Avalia se uma transação Pix já teve o pagamento aprovado no gateway ou comprovante enviado,
 * mas ainda aguarda conferência/aceite manual da Tesouraria (`status === "pendente"`).
 *
 * @param {PixTransacao} transacao - Transação Pix avaliada.
 * @returns {boolean} `true` se aguarda validação da tesouraria.
 */
export function transacaoPixAguardandoValidacao(transacao: PixTransacao): boolean {
  if (transacao.statusValidacao === "negada" || transacaoPixEstaValidada(transacao)) {
    return false;
  }

  if (transacao.origem === "COMPROVANTE") {
    return Boolean(
      transacao.rifas?.some((r) => r.status === "pendente" || r.status === "reservado"),
    );
  }

  return (
    ["PAID", "AUTHORIZED", "IN_ANALYSIS"].includes(transacao.statusPagamento) ||
    Boolean(transacao.comprovanteUrl)
  );
}

/**
 * Resolve o provedor efetivo de um DTO `PixTransacao` para aplicar taxa de gateway apenas
 * em transações do Mercado Pago (`MERCADOPAGO_API`), mantendo Pix Normal (`EMV_OFFLINE`) sem taxa.
 *
 * @param {PixTransacao} transacao - DTO consolidado da transação.
 * @returns {ProvedorPagamento} Provedor para cálculo de valor líquido.
 */
function resolverProvedorTransacaoDto(transacao: PixTransacao): ProvedorPagamento {
  if (transacao.provedor) {
    return transacao.provedor;
  }

  if (transacao.origem === "COMPROVANTE") {
    return "COMPROVANTE_PURO";
  }

  if (String(transacao.pixOrderId || "").startsWith("RIFA") || transacao.comprovanteUrl) {
    return "EMV_OFFLINE";
  }

  return "MERCADOPAGO_API";
}

/**
 * Calcula as métricas financeiras e de volume para os bilhetes negociados manualmente
 * via comprovante bancário legado (sem `pix_order_id`).
 *
 * @param {BilheteComNumero[]} bilhetesManuais - Lista de bilhetes sem cobrança Pix vinculada.
 * @returns {ResumoComprovantesTesouraria} Totais de rifas, compras e valores de comprovantes.
 */
export function calcularResumoComprovantes(
  bilhetesManuais: BilheteComNumero[],
): ResumoComprovantesTesouraria {
  const gruposPagos = new Set<string>();
  const gruposPendentes = new Set<string>();

  let comprovantesRifasPagas = 0;
  let comprovantesValorRecebido = 0;
  let comprovantesRifasPendentes = 0;
  let comprovantesValorPendente = 0;

  bilhetesManuais.forEach((bilhete) => {
    const chave = chaveCompra(bilhete);

    if (bilhete.status === "pago") {
      gruposPagos.add(chave);
      comprovantesRifasPagas += 1;
      comprovantesValorRecebido += bilhete.valor_pago || bilhete.valor_bruto || VALOR_RIFA;
    } else if (bilhete.status === "pendente" || bilhete.status === "reservado") {
      gruposPendentes.add(chave);
      comprovantesRifasPendentes += 1;
      comprovantesValorPendente += bilhete.valor_bruto || VALOR_RIFA;
    }
  });

  return {
    comprovantesTransacoesPagas: gruposPagos.size,
    comprovantesRifasPagas,
    comprovantesValorRecebido,
    comprovantesTransacoesPendentes: gruposPendentes.size,
    comprovantesRifasPendentes,
    comprovantesValorPendente,
  };
}

/**
 * Calcula os indicadores financeiros agregados (KPIs) unificando transações Pix
 * (aplicando taxa de 1% apenas às cobranças `MERCADOPAGO_API`) e comprovantes manuais.
 *
 * @param {PixTransacao[]} transacoes - Lista consolidada de transações Pix e comprovantes.
 * @param {ResumoComprovantesTesouraria} [resumoComprovantes] - Métricas opcionais das vendas por comprovante manual.
 * @returns {PixTransacoesResumo} Métricas financeiras completas para os dashboards da Tesouraria.
 */
export function calcularResumoPixTransacoes(
  transacoes: PixTransacao[],
  resumoComprovantes?: ResumoComprovantesTesouraria,
): PixTransacoesResumo {
  const transacoesPix = transacoes.filter((t) => t.origem !== "COMPROVANTE");
  const transacoesComprovante = transacoes.filter((t) => t.origem === "COMPROVANTE");

  const pagas = transacoesPix.filter(transacaoPixEstaValidada);
  const idsAguardando = new Set<string>();
  const aguardando = transacoesPix.filter((transacao) => {
    const ehAguardando =
      transacao.statusPagamento === "WAITING" ||
      transacao.statusPagamento === "IN_ANALYSIS" ||
      transacaoPixAguardandoValidacao(transacao);
    if (!ehAguardando || idsAguardando.has(transacao.id)) {
      return false;
    }
    idsAguardando.add(transacao.id);
    return true;
  });

  const canceladas = transacoesPix.filter(
    (transacao) =>
      ["CANCELED", "DECLINED"].includes(transacao.statusPagamento) ||
      transacao.statusValidacao === "negada",
  );
  const erros = transacoesPix.filter(
    (transacao) => transacao.statusPagamento === "ERROR",
  );

  const contarRifasTransacao = (transacao: PixTransacao): number => {
    if (typeof transacao.quantidadeRifas === "number" && transacao.quantidadeRifas > 0) {
      return transacao.quantidadeRifas;
    }
    if (Array.isArray(transacao.rifas) && transacao.rifas.length > 0) {
      return transacao.rifas.length;
    }
    const baseValor = transacao.valorPago || transacao.valorBruto || 0;
    return baseValor > 0 ? Math.round(baseValor / VALOR_RIFA) : 0;
  };

  const pixRecebidoBruto = pagas.reduce(
    (acc, transacao) => acc + (transacao.valorPago || transacao.valorBruto),
    0,
  );
  const totalRecebido = Number(
    pagas
      .reduce(
        (acc, transacao) =>
          acc +
          calcularValorLiquido(
            transacao.valorPago || transacao.valorBruto,
            resolverProvedorTransacaoDto(transacao),
          ),
        0,
      )
      .toFixed(2),
  );
  const totalPendente = aguardando.reduce(
    (acc, transacao) => acc + transacao.valorBruto,
    0,
  );
  const pixValorAguardandoLiquido = Number(
    aguardando
      .reduce(
        (acc, transacao) =>
          acc +
          calcularValorLiquido(
            transacao.valorBruto,
            resolverProvedorTransacaoDto(transacao),
          ),
        0,
      )
      .toFixed(2),
  );
  const totalCancelado = canceladas.reduce(
    (acc, transacao) => acc + transacao.valorBruto,
    0,
  );
  const totalErros = erros.reduce(
    (acc, transacao) => acc + transacao.valorBruto,
    0,
  );

  const pixRifasPagas = pagas.reduce((acc, t) => acc + contarRifasTransacao(t), 0);
  const pixRifasAguardando = aguardando.reduce((acc, t) => acc + contarRifasTransacao(t), 0);

  const comprovantes: ResumoComprovantesTesouraria = resumoComprovantes || {
    comprovantesTransacoesPagas: transacoesComprovante.filter(transacaoPixEstaValidada).length,
    comprovantesRifasPagas: transacoesComprovante
      .filter(transacaoPixEstaValidada)
      .reduce((acc, t) => acc + contarRifasTransacao(t), 0),
    comprovantesValorRecebido: transacoesComprovante
      .filter(transacaoPixEstaValidada)
      .reduce((acc, t) => acc + (t.valorPago || t.valorBruto), 0),
    comprovantesTransacoesPendentes: transacoesComprovante.filter(transacaoPixAguardandoValidacao).length,
    comprovantesRifasPendentes: transacoesComprovante
      .filter(transacaoPixAguardandoValidacao)
      .reduce((acc, t) => acc + contarRifasTransacao(t), 0),
    comprovantesValorPendente: transacoesComprovante
      .filter(transacaoPixAguardandoValidacao)
      .reduce((acc, t) => acc + t.valorBruto, 0),
  };

  const totalGeralTransacoesPagas = pagas.length + comprovantes.comprovantesTransacoesPagas;
  const totalGeralRifasPagas = pixRifasPagas + comprovantes.comprovantesRifasPagas;
  const totalGeralRecebidoBruto = pixRecebidoBruto + comprovantes.comprovantesValorRecebido;
  const totalGeralRecebidoLiquido = Number(
    (totalRecebido + comprovantes.comprovantesValorRecebido).toFixed(2),
  );
  const totalGeralTransacoesPendentes =
    aguardando.length + comprovantes.comprovantesTransacoesPendentes;
  const totalGeralRifasPendentes =
    pixRifasAguardando + comprovantes.comprovantesRifasPendentes;
  const totalGeralValorPendenteBruto =
    totalPendente + comprovantes.comprovantesValorPendente;

  return {
    totalRecebido,
    totalPendente,
    totalCancelado,
    totalErros,
    quantidadePagas: pagas.length,
    quantidadeAguardando: aguardando.length,
    quantidadeCanceladas: canceladas.length,
    quantidadeErros: erros.length,
    totalTransacoes: transacoes.length,
    ticketMedio: pagas.length > 0 ? Number((totalRecebido / pagas.length).toFixed(2)) : 0,

    pixRifasPagas,
    pixRecebidoBruto,
    pixRecebidoLiquido: totalRecebido,
    pixTransacoesAguardando: aguardando.length,
    pixRifasAguardando,
    pixValorAguardandoBruto: totalPendente,
    pixValorAguardandoLiquido,

    comprovantesTransacoesPagas: comprovantes.comprovantesTransacoesPagas,
    comprovantesRifasPagas: comprovantes.comprovantesRifasPagas,
    comprovantesValorRecebido: comprovantes.comprovantesValorRecebido,
    comprovantesTransacoesPendentes: comprovantes.comprovantesTransacoesPendentes,
    comprovantesRifasPendentes: comprovantes.comprovantesRifasPendentes,
    comprovantesValorPendente: comprovantes.comprovantesValorPendente,

    totalGeralTransacoesPagas,
    totalGeralRifasPagas,
    totalGeralRecebidoBruto,
    totalGeralRecebidoLiquido,
    totalGeralTransacoesPendentes,
    totalGeralRifasPendentes,
    totalGeralValorPendenteBruto,
  };
}
