
import {
  formatarData as formatarDataPix,
  formatarMoeda as formatarMoedaPix,
  somenteNumeros,
} from "./formatadores";
import {
  PixTransacoesFiltros,
  PixTransacoesResumo,
  PixTransacoesSerieTemporal,
  StatusPagamentoPix,
  StatusValidacaoPix,
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
  };

  return labels[status] || status;
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
  const pagas = transacoes.filter(
    (transacao) => transacao.statusPagamento === "PAID",
  );

  const aguardando = transacoes.filter(
    (transacao) => transacao.statusPagamento === "WAITING",
  );

  const canceladas = transacoes.filter(
    (transacao) => transacao.statusPagamento === "CANCELED",
  );

  const erros = transacoes.filter(
    (transacao) => transacao.statusPagamento === "ERROR",
  );

  const totalRecebido = pagas.reduce(
    (acc, transacao) => acc + (transacao.valorPago * 0.99),
    0,
  );

  const totalPendente = aguardando.reduce(
    (acc, transacao) => acc + transacao.valorBruto,
    0,
  );

  const totalCancelado = canceladas.reduce(
    (acc, transacao) => acc + transacao.valorBruto,
    0,
  );

  const totalErros = erros.reduce(
    (acc, transacao) => acc + transacao.valorBruto,
    0,
  );

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
    ticketMedio: pagas.length > 0 ? totalRecebido / pagas.length : 0,
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
