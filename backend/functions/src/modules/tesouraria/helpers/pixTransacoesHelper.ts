// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/helpers/pixTransacoesHelper.ts
// ============================================================================
import {
  BilheteComNumero,
  PixTransacao,
  PixTransacoesResumo,
  ResumoComprovantesTesouraria,
  StatusPagamentoPix,
  StatusValidacaoPix,
} from "../../tesouraria/types/tesourariaTypes";
import {
  cpfEhValido,
  formatarCpfVendedor,
  MapaVendedores,
  resolverVendedorDoBilhete,
} from "./vendedorLookupHelper";

const VALOR_RIFA = 10;

/**
 * Converte com segurança uma string de data para timestamp numérico em milissegundos.
 * Retorna 0 caso a data seja nula, indefinida ou inválida, prevenindo exceções `NaN`.
 *
 * @param {string | null} [data] - String de data no formato ISO 8601 ou compatível.
 * @returns {number} Timestamp em milissegundos ou 0 se inválido.
 */
export function valorDataSeguro(data?: string | null): number {
  const timestamp = new Date(data || "").getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

/**
 * Retorna a primeira data válida encontrada entre uma lista de candidatos em ordem de precedência.
 *
 * @param {...Array<string | null | undefined>} datas - Lista de strings de datas a avaliar.
 * @returns {string} Primeira string de data válida ou timestamp da época (1970-01-01) como fallback seguro.
 */
export function primeiraDataValida(...datas: Array<string | null | undefined>): string {
  const dataValida = datas.find((data) => valorDataSeguro(data) > 0);

  return dataValida || new Date(0).toISOString();
}

/**
 * Normaliza um identificador textual para formato slug seguro (apenas letras, dígitos, sublinhado e hífen).
 *
 * @param {string} valor - String bruta a ser sanitizada.
 * @returns {string} String normalizada com no máximo 255 caracteres.
 */
export function normalizarId(valor: string): string {
  return valor
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 255);
}

/**
 * Gera uma chave unificadora de agrupamento para reunir múltiplos bilhetes que pertencem à mesma compra.
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
 * Mapeia os status de bilhete e de gateway bancário para o enum unificado `StatusPagamentoPix`.
 *
 * @param {string} status - Status do bilhete ('pago', 'pendente', 'reservado', 'recusado').
 * @param {string | null} [statusBanco] - Status retornado pelo provedor de pagamento.
 * @returns {StatusPagamentoPix} Status unificado da transação: 'WAITING' | 'PAID' | 'AUTHORIZED' | 'DECLINED' | etc.
 */
export function statusPagamento(
  status: string,
  statusBanco?: string | null,
): StatusPagamentoPix {
  if (
    statusBanco &&
    ["WAITING", "PAID", "AUTHORIZED", "IN_ANALYSIS", "DECLINED", "CANCELED", "ERROR"]
      .includes(statusBanco)
  ) {
    return statusBanco as StatusPagamentoPix;
  }

  if (statusBanco === "approved" || statusBanco === "authorized") {
    return "PAID";
  }

  if (status === "pago") return "PAID";
  if (status === "recusado") return "DECLINED";
  if (status === "reservado") return "WAITING";
  if (status === "pendente") return "WAITING";

  return "WAITING";
}

/**
 * Resolve o status de validação da Tesouraria para uma transação Pix a partir do bilhete base.
 * Caso o bilhete já esteja com `status === "pago"` e possua `pix_order_id`, garante `"aceita"`.
 *
 * @param {BilheteComNumero} base - Bilhete representativo da compra.
 * @returns {StatusValidacaoPix | undefined} Status de validação ('aceita', 'negada' ou `undefined` quando pendente).
 */
export function resolverStatusValidacaoBilhete(
  base: BilheteComNumero,
): StatusValidacaoPix | undefined {
  if (base.status_validacao === "aceita" || base.status_validacao === "negada") {
    return base.status_validacao;
  }

  if (base.status === "pago" && base.pix_order_id) {
    return "aceita";
  }

  if (base.status === "recusado" && base.pix_order_id) {
    return "negada";
  }

  return undefined;
}

/**
 * Agrupa uma lista de bilhetes pertencentes à mesma compra e constrói o DTO consolidado `PixTransacao` para a UI.
 * Quando `mapaVendedores` é fornecido, enriquece os dados do aderido (CPF e nome reais).
 *
 * @param {BilheteComNumero[]} bilhetes - Bilhetes agrupados da transação.
 * @param {MapaVendedores | null} [mapaVendedores] - Mapa indexado opcional da coleção `usuarios`.
 * @returns {PixTransacao} DTO consolidado com valores somados, dados do comprador e do vendedor.
 */
export function montarPixTransacao(
  bilhetes: BilheteComNumero[],
  mapaVendedores?: MapaVendedores | null,
): PixTransacao {
  const bilhetesOrdenados = [...bilhetes].sort((a, b) =>
    a.numero.localeCompare(b.numero, "pt-BR", { numeric: true }),
  );
  const base = bilhetesOrdenados[0];
  const numerosRifas = bilhetesOrdenados.map((bilhete) => bilhete.numero);
  const quantidadeRifas = bilhetesOrdenados.length;
  const valorBruto = bilhetesOrdenados.reduce(
    (acc, bilhete) => acc + (bilhete.valor_bruto || VALOR_RIFA),
    0,
  );
  const pagamento = statusPagamento(base.status, base.status_pagamento_banco);
  const dataCriacao = primeiraDataValida(base.data_reserva, base.data_pagamento);
  const dataPagamento =
    ["PAID", "AUTHORIZED"].includes(pagamento)
      ? primeiraDataValida(base.data_pagamento, base.data_reserva)
      : null;
  const idNormalizado = normalizarId(chaveCompra(base) || numerosRifas.join("-"));

  const vendedorResolvido = resolverVendedorDoBilhete(base, mapaVendedores);
  const cpfResolvido = formatarCpfVendedor(base.vendedor_cpf, vendedorResolvido);
  const cpfFinal =
    cpfResolvido !== "-"
      ? cpfResolvido
      : cpfEhValido(base.vendedor_cpf)
        ? base.vendedor_cpf
        : undefined;

  return {
    id: idNormalizado || `rifas-${numerosRifas.join("-")}`,
    pixOrderId: base.pix_order_id || undefined,
    metodo: "PIX",
    statusPagamento: pagamento,
    valorBruto,
    valorPago:
      ["PAID", "AUTHORIZED"].includes(pagamento)
        ? bilhetesOrdenados.reduce(
            (acc, bilhete) => acc + (bilhete.valor_pago || bilhete.valor_bruto || VALOR_RIFA),
            0,
          )
        : 0,
    moeda: "BRL",
    descricao: `Rifas ${numerosRifas.join(", ")}`,
    dataCriacao,
    dataPagamento,
    dataExpiracao: base.data_expiracao || null,
    compradorNome: base.comprador_nome || "Pagador Não Identificado",
    compradorEmail: base.comprador_email || undefined,
    compradorDocumento: undefined,
    compradorTelefone: base.comprador_telefone || undefined,
    aderido: {
      id: vendedorResolvido?.docId || base.vendedor_id,
      nome: vendedorResolvido?.nome || base.vendedor_nome || "Sem aderido vinculado",
      cpf: cpfFinal,
      ...(vendedorResolvido?.modalidadeAdesao
        ? { modalidade_adesao: vendedorResolvido.modalidadeAdesao }
        : {}),
      ...(vendedorResolvido?.cargo ? { cargo: vendedorResolvido.cargo } : {}),
    },
    rifas: bilhetesOrdenados.map((bilhete) => ({
      numero: bilhete.numero,
      status: bilhete.status,
    })),
    quantidadeRifas,
    compradorId: base.comprador_id || null,
    statusValidacao: resolverStatusValidacaoBilhete(base),
    observacao:
      pagamento === "DECLINED"
        ? base.motivo_recusa || "Comprovante recusado pela tesouraria."
        : undefined,
  };
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
  if (!["PAID", "AUTHORIZED"].includes(transacao.statusPagamento)) {
    return false;
  }

  if (transacao.statusValidacao === "aceita") {
    return true;
  }

  if (transacao.statusValidacao === "negada") {
    return false;
  }

  if (transacao.rifas && transacao.rifas.length > 0) {
    return transacao.rifas.every((rifa) => rifa.status === "pago");
  }

  return true;
}

/**
 * Avalia se uma transação Pix já teve o pagamento aprovado no gateway bancário,
 * mas ainda aguarda conferência/aceite manual da Tesouraria (`status === "pendente"`).
 *
 * @param {PixTransacao} transacao - Transação Pix avaliada.
 * @returns {boolean} `true` se aguarda validação da tesouraria.
 */
export function transacaoPixAguardandoValidacao(transacao: PixTransacao): boolean {
  return (
    ["PAID", "AUTHORIZED"].includes(transacao.statusPagamento) &&
    transacao.statusValidacao !== "negada" &&
    !transacaoPixEstaValidada(transacao)
  );
}

/**
 * Calcula as métricas financeiras e de volume para os bilhetes negociados manualmente
 * via comprovante bancário legado (sem `pix_order_id`).
 *
 * @param {BilheteComNumero[]} bilhetesManuais - Lista de bilhetes sem `pix_order_id`.
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
 * Calcula os indicadores financeiros agregados (KPIs) unificando:
 * 1. Transações Pix automatizadas (separando validadas de aguardando validação, com taxa de 1% -> fator 0.99);
 * 2. Rifas negociadas manualmente via comprovante bancário;
 * 3. Total Geral consolidado da Tesouraria.
 *
 * @param {PixTransacao[]} transacoes - Lista consolidada de transações Pix.
 * @param {ResumoComprovantesTesouraria} [resumoComprovantes] - Métricas opcionais das vendas por comprovante manual.
 * @returns {PixTransacoesResumo} Métricas financeiras completas para os dashboards da Tesouraria.
 */
export function calcularResumoPixTransacoes(
  transacoes: PixTransacao[],
  resumoComprovantes?: ResumoComprovantesTesouraria,
): PixTransacoesResumo {
  const pagas = transacoes.filter(transacaoPixEstaValidada);
  const aguardandoBanco = transacoes.filter(
    (transacao) =>
      transacao.statusPagamento === "WAITING" ||
      transacao.statusPagamento === "IN_ANALYSIS",
  );
  const aguardandoValidacao = transacoes.filter(transacaoPixAguardandoValidacao);
  const aguardando = [...aguardandoBanco, ...aguardandoValidacao];

  const canceladas = transacoes.filter(
    (transacao) =>
      ["CANCELED", "DECLINED"].includes(transacao.statusPagamento) ||
      transacao.statusValidacao === "negada",
  );
  const erros = transacoes.filter(
    (transacao) => transacao.statusPagamento === "ERROR",
  );

  const pixRecebidoBruto = pagas.reduce(
    (acc, transacao) => acc + (transacao.valorPago || transacao.valorBruto),
    0,
  );
  const totalRecebido = Number(
    pagas.reduce((acc, transacao) => acc + transacao.valorPago * 0.99, 0).toFixed(2),
  );
  const totalPendente = aguardando.reduce(
    (acc, transacao) => acc + transacao.valorBruto,
    0,
  );
  const pixValorAguardandoLiquido = Number((totalPendente * 0.99).toFixed(2));
  const totalCancelado = canceladas.reduce(
    (acc, transacao) => acc + transacao.valorBruto,
    0,
  );
  const totalErros = erros.reduce(
    (acc, transacao) => acc + transacao.valorBruto,
    0,
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

  const pixRifasPagas = pagas.reduce((acc, t) => acc + contarRifasTransacao(t), 0);
  const pixRifasAguardando = aguardando.reduce((acc, t) => acc + contarRifasTransacao(t), 0);

  const comprovantes: ResumoComprovantesTesouraria = resumoComprovantes || {
    comprovantesTransacoesPagas: 0,
    comprovantesRifasPagas: 0,
    comprovantesValorRecebido: 0,
    comprovantesTransacoesPendentes: 0,
    comprovantesRifasPendentes: 0,
    comprovantesValorPendente: 0,
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

    // 1. Indicadores Pix
    pixRifasPagas,
    pixRecebidoBruto,
    pixRecebidoLiquido: totalRecebido,
    pixTransacoesAguardando: aguardando.length,
    pixRifasAguardando,
    pixValorAguardandoBruto: totalPendente,
    pixValorAguardandoLiquido,

    // 2. Indicadores Comprovantes Manuais
    comprovantesTransacoesPagas: comprovantes.comprovantesTransacoesPagas,
    comprovantesRifasPagas: comprovantes.comprovantesRifasPagas,
    comprovantesValorRecebido: comprovantes.comprovantesValorRecebido,
    comprovantesTransacoesPendentes: comprovantes.comprovantesTransacoesPendentes,
    comprovantesRifasPendentes: comprovantes.comprovantesRifasPendentes,
    comprovantesValorPendente: comprovantes.comprovantesValorPendente,

    // 3. Indicadores Total Geral Consolidado
    totalGeralTransacoesPagas,
    totalGeralRifasPagas,
    totalGeralRecebidoBruto,
    totalGeralRecebidoLiquido,
    totalGeralTransacoesPendentes,
    totalGeralRifasPendentes,
    totalGeralValorPendenteBruto,
  };
}


