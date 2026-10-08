
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

export function pixTransacaoTemRifas(transacao: PixTransacao) {
  return Boolean(transacao.rifas && transacao.rifas.length > 0);
}

export function pixPagamentoConfirmadoBanco(transacao: PixTransacao) {
  return ["PAID", "AUTHORIZED"].includes(transacao.statusPagamento);
}

export function obterStatusValidacaoPix(transacao: PixTransacao): StatusValidacaoUI {
  if (!pixPagamentoConfirmadoBanco(transacao)) {
    return "sem_confirmacao_bancaria";
  }

  if (transacao.statusValidacao) {
    return transacao.statusValidacao;
  }

  return "pendente_validacao";
}

export function podeValidarPixTransacao(transacao: PixTransacao) {
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

function campoContemTermo(
  valor: string | undefined | null,
  termo: string,
  termoNumerico: string,
) {
  const texto = String(valor || "").toLowerCase();

  return (
    texto.includes(termo) ||
    (termoNumerico.length > 0 && somenteNumeros(texto).includes(termoNumerico))
  );
}

function atendeFiltroRapido(
  transacao: PixTransacao,
  status: PixTransacoesFiltros["status"],
) {
  if (status === "novas") return podeValidarPixTransacao(transacao);
  if (status === "recusadas") return transacao.statusValidacao === "negada";
  if (status === "aguardando_pagamento") return !pixPagamentoConfirmadoBanco(transacao);

  return true;
}

export function formatarRifasPix(transacao: PixTransacao) {
  const numeros = (transacao.rifas || [])
    .map((rifa) => rifa.numero)
    .filter(Boolean);

  return numeros.length > 0 ? numeros.join(", ") : "Sem rifas";
}

export function obterLabelStatusPagamento(status: StatusPagamentoPix) {
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

export function filtrarPixTransacoes(
  transacoes: PixTransacao[],
  filtros: PixTransacoesFiltros,
) {
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
