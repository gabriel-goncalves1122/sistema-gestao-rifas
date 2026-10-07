// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/helpers/pixTransacoesHelper.ts
// ============================================================================
import {
  BilheteComNumero,
  PixTransacao,
  PixTransacoesResumo,
  StatusPagamentoPix,
  StatusValidacaoPix,
} from "../../tesouraria/types/tesourariaTypes";

const VALOR_RIFA = 10;

export function valorDataSeguro(data?: string | null) {
  const timestamp = new Date(data || "").getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function primeiraDataValida(...datas: Array<string | null | undefined>) {
  const dataValida = datas.find((data) => valorDataSeguro(data) > 0);

  return dataValida || new Date(0).toISOString();
}

export function normalizarId(valor: string) {
  return valor
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 255);
}

export function chaveCompra(bilhete: BilheteComNumero) {
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

export function montarPixTransacao(
  bilhetes: BilheteComNumero[],
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
      id: base.vendedor_id,
      nome: base.vendedor_nome || "Sem aderido vinculado",
      cpf: base.vendedor_cpf || undefined,
    },
    rifas: bilhetesOrdenados.map((bilhete) => ({
      numero: bilhete.numero,
      status: bilhete.status,
    })),
    quantidadeRifas,
    compradorId: base.comprador_id || null,
    statusValidacao: (base.status_validacao as StatusValidacaoPix) || undefined,
    observacao:
      pagamento === "DECLINED"
        ? base.motivo_recusa || "Comprovante recusado pela tesouraria."
        : undefined,
  };
}

export function calcularResumoPixTransacoes(
  transacoes: PixTransacao[],
): PixTransacoesResumo {
  const pagas = transacoes.filter(
    (transacao) => transacao.statusPagamento === "PAID" || transacao.statusPagamento === "AUTHORIZED",
  );
  const aguardando = transacoes.filter(
    (transacao) => transacao.statusPagamento === "WAITING" || transacao.statusPagamento === "IN_ANALYSIS",
  );
  const canceladas = transacoes.filter((transacao) =>
    ["CANCELED", "DECLINED"].includes(transacao.statusPagamento),
  );
  const erros = transacoes.filter(
    (transacao) => transacao.statusPagamento === "ERROR",
  );

  const totalRecebido = pagas.reduce(
    (acc, transacao) => acc + transacao.valorPago,
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
