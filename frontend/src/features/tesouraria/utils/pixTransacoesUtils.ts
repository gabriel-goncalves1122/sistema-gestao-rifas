
import {
  formatarData as formatarDataPix,
  formatarMoeda as formatarMoedaPix,
  somenteNumeros,
} from "./formatadores";
import {
  PixTransacao,
  PixTransacoesFiltros,
  PixTransacoesResumo,
  PixTransacoesSerieTemporal,
  StatusPagamentoPix,
  StatusValidacaoUI,
} from "../types/pixTransacoes";

/**
 * Verifica se a transação Pix possui ao menos um bilhete de rifa associado.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {boolean} `true` se contiver bilhetes vinculados.
 */
export function pixTransacaoTemRifas(transacao: PixTransacao): boolean {
  return Boolean(transacao.rifas && transacao.rifas.length > 0);
}

/**
 * Avalia se o pagamento da transação foi confirmado/liquidado pelo banco ou gateway ('PAID' ou 'AUTHORIZED').
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {boolean} `true` se liquidado pelo gateway bancário.
 */
export function pixPagamentoConfirmadoBanco(transacao: PixTransacao): boolean {
  return ["PAID", "AUTHORIZED"].includes(transacao.statusPagamento);
}

/**
 * Determina o status visual de validação da transação para exibição de Badges/Pills na interface da Tesouraria.
 * - 'sem_confirmacao_bancaria': banco ainda não liquidou;
 * - 'aprovada' / 'negada': decisão final já proferida pela tesouraria;
 * - 'pendente_validacao': liquidado no banco, aguardando conferência manual da tesouraria.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {StatusValidacaoUI} Estado visual para a interface.
 */
export function obterStatusValidacaoPix(transacao: PixTransacao): StatusValidacaoUI {
  if (!pixPagamentoConfirmadoBanco(transacao)) {
    return "sem_confirmacao_bancaria";
  }

  if (transacao.statusValidacao) {
    return transacao.statusValidacao;
  }

  return "pendente_validacao";
}

/**
 * Determina se a tesouraria pode realizar ações de aprovação ou recusa manual sobre a transação.
 * Apenas permitido se o banco tiver liquidado e a transação estiver pendente de validação.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {boolean} `true` se os botões de ação devem ser habilitados.
 */
export function podeValidarPixTransacao(transacao: PixTransacao): boolean {
  return (
    pixPagamentoConfirmadoBanco(transacao) &&
    obterStatusValidacaoPix(transacao) === "pendente_validacao"
  );
}

export { formatarDataPix, formatarMoedaPix };

export const RESUMO_PIX_TRANSACOES_VAZIO: PixTransacoesResumo = {
  totalRecebido: 0,
  totalPendente: 0,
  totalCancelado: 0,
  totalErros: 0,
  quantidadePagas: 0,
  quantidadeAguardando: 0,
  quantidadeCanceladas: 0,
  quantidadeErros: 0,
  totalTransacoes: 0,
  ticketMedio: 0,

  // 1. Indicadores Pix (Gateway)
  pixRifasPagas: 0,
  pixRecebidoBruto: 0,
  pixRecebidoLiquido: 0,
  pixTransacoesAguardando: 0,
  pixRifasAguardando: 0,
  pixValorAguardandoBruto: 0,
  pixValorAguardandoLiquido: 0,

  // 2. Indicadores Comprovantes Manuais
  comprovantesTransacoesPagas: 0,
  comprovantesRifasPagas: 0,
  comprovantesValorRecebido: 0,
  comprovantesTransacoesPendentes: 0,
  comprovantesRifasPendentes: 0,
  comprovantesValorPendente: 0,

  // 3. Indicadores Total Geral Consolidado
  totalGeralTransacoesPagas: 0,
  totalGeralRifasPagas: 0,
  totalGeralRecebidoBruto: 0,
  totalGeralRecebidoLiquido: 0,
  totalGeralTransacoesPendentes: 0,
  totalGeralRifasPendentes: 0,
  totalGeralValorPendenteBruto: 0,
};

/**
 * Auxiliar interno de busca textual que avalia termos comuns e numéricos sanitizados (CPF, telefone, rifas).
 *
 * @param {string | undefined | null} valor - Conteúdo do campo a verificar.
 * @param {string} termo - Termo textual em minúsculas.
 * @param {string} termoNumerico - Termo contendo apenas dígitos numéricos.
 * @returns {boolean} `true` se o campo corresponder ao termo.
 */
function campoContemTermo(
  valor: string | undefined | null,
  termo: string,
  termoNumerico: string,
): boolean {
  const texto = String(valor || "").toLowerCase();

  return (
    texto.includes(termo) ||
    (termoNumerico.length > 0 && somenteNumeros(texto).includes(termoNumerico))
  );
}

/**
 * Avalia se uma transação atende aos filtros rápidos pré-selecionados na toolbar ('novas', 'recusadas', 'aguardando_pagamento').
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @param {PixTransacoesFiltros["status"]} status - Filtro rápido ativo.
 * @returns {boolean} `true` se atender ao filtro.
 */
function atendeFiltroRapido(
  transacao: PixTransacao,
  status: PixTransacoesFiltros["status"],
): boolean {
  if (status === "novas") return podeValidarPixTransacao(transacao);
  if (status === "recusadas") return transacao.statusValidacao === "negada";
  if (status === "aguardando_pagamento") return !pixPagamentoConfirmadoBanco(transacao);

  return true;
}

/**
 * Formata os números dos bilhetes de rifa da transação em uma string separada por vírgula.
 *
 * @param {PixTransacao} transacao - Transação contendo a lista de rifas.
 * @returns {string} String legível dos números ou "Sem rifas".
 */
export function formatarRifasPix(transacao: PixTransacao): string {
  const numeros = (transacao.rifas || [])
    .map((rifa) => rifa.numero)
    .filter(Boolean);

  return numeros.length > 0 ? numeros.join(", ") : "Sem rifas";
}

/**
 * Converte a chave enum do status bancário em rótulo em português para renderização na UI.
 *
 * @param {StatusPagamentoPix} status - Status bruto da transação.
 * @returns {string} Rótulo amigável (ex: 'Aguardando', 'Pago', 'Em análise').
 */
export function obterLabelStatusPagamento(status: StatusPagamentoPix): string {
  const labels: Record<StatusPagamentoPix, string> = {
    WAITING: "Aguardando",
    PAID: "Pago",
    AUTHORIZED: "Autorizado",
    IN_ANALYSIS: "Em análise",
    DECLINED: "Negado",
    CANCELED: "Cancelado",
    ERROR: "Erro",
  };

  return labels[status] || status;
}

export interface IndicadoresConsolidadosTesouraria {
  pix: {
    rifasPagas: number;
    recebidoBruto: number;
    recebidoLiquido: number;
    transacoesAguardando: number;
    rifasAguardando: number;
    valorAguardandoBruto: number;
    valorAguardandoLiquido: number;
  };
  comprovantes: {
    transacoesPagas: number;
    rifasPagas: number;
    valorRecebido: number;
    transacoesPendentes: number;
    rifasPendentes: number;
    valorPendente: number;
  };
  totalGeral: {
    transacoesPagas: number;
    rifasPagas: number;
    recebidoBruto: number;
    recebidoLiquido: number;
    transacoesPendentes: number;
    rifasPendentes: number;
    valorPendenteBruto: number;
  };
}

/**
 * Extrai e estrutura os indicadores consolidados (Pix, Comprovantes e Total Geral)
 * com fallbacks seguros a zero para consumo pelos componentes de visualização da Tesouraria.
 *
 * @param {PixTransacoesResumo} resumo - Objeto de resumo retornado pela API ou calculado localmente.
 * @returns {IndicadoresConsolidadosTesouraria} Indicadores agrupados por fonte e totalizadores.
 */
export function obterIndicadoresConsolidados(
  resumo: PixTransacoesResumo,
): IndicadoresConsolidadosTesouraria {
  const pixRecebidoLiquido = resumo.pixRecebidoLiquido ?? resumo.totalRecebido ?? 0;
  const pixRecebidoBruto =
    resumo.pixRecebidoBruto ??
    (pixRecebidoLiquido > 0 ? Number((pixRecebidoLiquido / 0.99).toFixed(2)) : 0);
  const pixValorAguardandoBruto =
    resumo.pixValorAguardandoBruto ?? resumo.totalPendente ?? 0;
  const pixValorAguardandoLiquido =
    resumo.pixValorAguardandoLiquido ??
    Number((pixValorAguardandoBruto * 0.99).toFixed(2));

  const comprovantesTransacoesPagas = resumo.comprovantesTransacoesPagas ?? 0;
  const comprovantesRifasPagas = resumo.comprovantesRifasPagas ?? 0;
  const comprovantesValorRecebido = resumo.comprovantesValorRecebido ?? 0;
  const comprovantesTransacoesPendentes = resumo.comprovantesTransacoesPendentes ?? 0;
  const comprovantesRifasPendentes = resumo.comprovantesRifasPendentes ?? 0;
  const comprovantesValorPendente = resumo.comprovantesValorPendente ?? 0;

  const totalGeralTransacoesPagas =
    resumo.totalGeralTransacoesPagas ??
    (resumo.quantidadePagas + comprovantesTransacoesPagas);
  const totalGeralRifasPagas =
    resumo.totalGeralRifasPagas ??
    ((resumo.pixRifasPagas ?? 0) + comprovantesRifasPagas);
  const totalGeralRecebidoBruto =
    resumo.totalGeralRecebidoBruto ??
    (pixRecebidoBruto + comprovantesValorRecebido);
  const totalGeralRecebidoLiquido =
    resumo.totalGeralRecebidoLiquido ??
    Number((pixRecebidoLiquido + comprovantesValorRecebido).toFixed(2));
  const totalGeralTransacoesPendentes =
    resumo.totalGeralTransacoesPendentes ??
    (resumo.quantidadeAguardando + comprovantesTransacoesPendentes);
  const totalGeralRifasPendentes =
    resumo.totalGeralRifasPendentes ??
    ((resumo.pixRifasAguardando ?? 0) + comprovantesRifasPendentes);
  const totalGeralValorPendenteBruto =
    resumo.totalGeralValorPendenteBruto ??
    (pixValorAguardandoBruto + comprovantesValorPendente);

  return {
    pix: {
      rifasPagas: resumo.pixRifasPagas ?? 0,
      recebidoBruto: pixRecebidoBruto,
      recebidoLiquido: pixRecebidoLiquido,
      transacoesAguardando:
        resumo.pixTransacoesAguardando ?? resumo.quantidadeAguardando ?? 0,
      rifasAguardando: resumo.pixRifasAguardando ?? 0,
      valorAguardandoBruto: pixValorAguardandoBruto,
      valorAguardandoLiquido: pixValorAguardandoLiquido,
    },
    comprovantes: {
      transacoesPagas: comprovantesTransacoesPagas,
      rifasPagas: comprovantesRifasPagas,
      valorRecebido: comprovantesValorRecebido,
      transacoesPendentes: comprovantesTransacoesPendentes,
      rifasPendentes: comprovantesRifasPendentes,
      valorPendente: comprovantesValorPendente,
    },
    totalGeral: {
      transacoesPagas: totalGeralTransacoesPagas,
      rifasPagas: totalGeralRifasPagas,
      recebidoBruto: totalGeralRecebidoBruto,
      recebidoLiquido: totalGeralRecebidoLiquido,
      transacoesPendentes: totalGeralTransacoesPendentes,
      rifasPendentes: totalGeralRifasPendentes,
      valorPendenteBruto: totalGeralValorPendenteBruto,
    },
  };
}

/**
 * Calcula os totais monetários e contagens resumidas para exibição nos cards do dashboard da Tesouraria Pix.
 * Desconta taxa bancária de 1% (fator 0.99) sobre o valor total recebido.
 *
 * @param {PixTransacao[]} transacoes - Lista consolidada de transações.
 * @returns {PixTransacoesResumo} Métricas financeiras e de volume de vendas.
 */
export function calcularResumoPixTransacoes(
  transacoes: PixTransacao[],
): PixTransacoesResumo {
  const pagas = transacoes.filter((transacao) =>
    ["PAID", "AUTHORIZED"].includes(transacao.statusPagamento),
  );

  const aguardando = transacoes.filter((transacao) =>
    ["WAITING", "IN_ANALYSIS"].includes(transacao.statusPagamento),
  );

  const canceladas = transacoes.filter((transacao) =>
    ["CANCELED", "DECLINED"].includes(transacao.statusPagamento),
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

  const contarRifas = (t: PixTransacao) =>
    t.quantidadeRifas || t.rifas?.length || Math.round((t.valorPago || t.valorBruto || 0) / 10);

  const pixRifasPagas = pagas.reduce((acc, t) => acc + contarRifas(t), 0);
  const pixRifasAguardando = aguardando.reduce((acc, t) => acc + contarRifas(t), 0);

  return {
    ...RESUMO_PIX_TRANSACOES_VAZIO,
    totalRecebido,
    totalPendente,
    totalCancelado,
    totalErros,
    quantidadePagas: pagas.length,
    quantidadeAguardando: aguardando.length,
    quantidadeCanceladas: canceladas.length,
    quantidadeErros: erros.length,
    totalTransacoes: transacoes.length,
    ticketMedio:
      pagas.length > 0 ? Number((totalRecebido / pagas.length).toFixed(2)) : 0,

    // Indicadores Pix
    pixRifasPagas,
    pixRecebidoBruto,
    pixRecebidoLiquido: totalRecebido,
    pixTransacoesAguardando: aguardando.length,
    pixRifasAguardando,
    pixValorAguardandoBruto: totalPendente,
    pixValorAguardandoLiquido,

    // Total Geral (no fallback local são equivalentes ao Pix isolado)
    totalGeralTransacoesPagas: pagas.length,
    totalGeralRifasPagas: pixRifasPagas,
    totalGeralRecebidoBruto: pixRecebidoBruto,
    totalGeralRecebidoLiquido: totalRecebido,
    totalGeralTransacoesPendentes: aguardando.length,
    totalGeralRifasPendentes: pixRifasAguardando,
    totalGeralValorPendenteBruto: totalPendente,
  };
}

/**
 * Filtra a lista de transações Pix com base no termo de busca textual (comprador, email, CPF, telefone, aderido, rifas)
 * e nos filtros rápidos de status selecionados pelo usuário.
 *
 * @param {PixTransacao[]} transacoes - Lista de transações brutas.
 * @param {PixTransacoesFiltros} filtros - Critérios de filtro informados na barra de ferramentas.
 * @returns {PixTransacao[]} Lista filtrada de transações.
 */
export function filtrarPixTransacoes(
  transacoes: PixTransacao[],
  filtros: PixTransacoesFiltros,
): PixTransacao[] {
  const termo = filtros.busca.trim().toLowerCase();
  const termoNumerico = somenteNumeros(termo);

  return transacoes.filter((transacao) => {
    const camposBusca = [
      transacao.descricao,
      transacao.compradorNome,
      transacao.compradorEmail,
      transacao.compradorDocumento,
      transacao.compradorTelefone,
      transacao.aderido?.nome,
      transacao.aderido?.cpf,
      ...(transacao.rifas || []).map((rifa) => rifa.numero),
    ];

    const buscaValida =
      !termo ||
      camposBusca.some((campo) => campoContemTermo(campo, termo, termoNumerico));

    return buscaValida && atendeFiltroRapido(transacao, filtros.status);
  });
}

/**
 * Agrupa transações por data (dia/mês) para montagem do gráfico de série temporal de arrecadação Pix.
 *
 * @param {PixTransacao[]} transacoes - Lista de transações avaliadas.
 * @returns {PixTransacoesSerieTemporal[]} Série de dados cronológica para gráficos do Recharts.
 */
export function montarPixTransacoesSerieTemporal(
  transacoes: PixTransacao[],
): PixTransacoesSerieTemporal[] {
  const agrupado = transacoes.reduce<Record<string, PixTransacoesSerieTemporal>>(
    (acc, transacao) => {
      const dataBase = transacao.dataPagamento || transacao.dataCriacao;

      const data = new Date(dataBase).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });

      if (!acc[data]) {
        acc[data] = {
          data,
          recebido: 0,
          pendente: 0,
          quantidadePagas: 0,
        };
      }

      if (transacao.statusPagamento === "PAID") {
        acc[data].recebido += transacao.valorPago;
        acc[data].quantidadePagas += 1;
      }

      if (transacao.statusPagamento === "WAITING") {
        acc[data].pendente += transacao.valorBruto;
      }

      return acc;
    },
    {},
  );

  return Object.values(agrupado);
}
