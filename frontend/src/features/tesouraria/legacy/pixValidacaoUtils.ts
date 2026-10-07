import {
  PixTransacao,
  PixTransacoesResumo,
  PixTransacoesResumoUI,
  StatusValidacaoUI,
} from "../types/pixTransacoes";

interface PixValidacaoVisual {
  label: string;
  descricao: string;
  color: string;
  bgcolor: string;
  border: string;
}

export const PIX_VALIDACAO_VISUAL: Record<
  StatusValidacaoUI,
  PixValidacaoVisual
> = {
  sem_confirmacao_bancaria: {
    label: "Sem confirmação bancária",
    descricao: "Aguardando sinal do banco antes da decisão.",
    color: "#6B4E00",
    bgcolor: "#FFF7E0",
    border: "1px solid rgba(107, 78, 0, 0.24)",
  },
  pendente_validacao: {
    label: "Aguardando validação",
    descricao: "Banco confirmou o Pix; falta aceitar ou negar.",
    color: "#063D31",
    bgcolor: "#EAF3EF",
    border: "1px solid rgba(6, 61, 49, 0.26)",
  },
  aceita: {
    label: "Aceita",
    descricao: "Compra aprovada pela validação Pix.",
    color: "#FFFFFF",
    bgcolor: "#063D31",
    border: "1px solid #063D31",
  },
  negada: {
    label: "Negada",
    descricao: "Compra negada pela validação Pix.",
    color: "#7A1F1F",
    bgcolor: "#FDF0F0",
    border: "1px solid rgba(122, 31, 31, 0.22)",
  },
};

function statusRifaPago(status?: string | null) {
  return String(status || "").trim().toLowerCase() === "pago";
}

function todasRifasPagas(transacao: PixTransacao) {
  const rifas = transacao.rifas || [];

  return rifas.length > 0 && rifas.every((rifa) => statusRifaPago(rifa.status));
}

function valorPagoComData(transacao: PixTransacao) {
  return (
    Number(transacao.valorPago || 0) > 0 &&
    Boolean(String(transacao.dataPagamento || "").trim())
  );
}

function textoIndicaSemVinculo(valor?: string | null) {
  const texto = String(valor || "").trim().toLowerCase();

  return (
    !texto ||
    texto === "sem aderido" ||
    texto === "sem aderido vinculado" ||
    texto === "não vinculado" ||
    texto === "nao vinculado"
  );
}

export function pixTransacaoTemRifas(transacao: PixTransacao) {
  return Boolean(transacao.rifas?.length);
}

export function pixTransacaoTemPendenciaVinculo(transacao: PixTransacao) {
  const possuiVenda = Boolean(String(transacao.vendaId || "").trim());
  const possuiAderido =
    Boolean(String(transacao.aderido?.id || "").trim()) ||
    !textoIndicaSemVinculo(transacao.aderido?.nome);

  return !pixTransacaoTemRifas(transacao) || !possuiVenda || !possuiAderido;
}

export function pixPagamentoConfirmadoBanco(transacao: PixTransacao) {
  return (
    ["PAID", "AUTHORIZED"].includes(transacao.statusPagamento) ||
    todasRifasPagas(transacao) ||
    valorPagoComData(transacao)
  );
}

export function obterStatusValidacaoUI(
  transacao: PixTransacao,
): StatusValidacaoUI {
  if (!pixPagamentoConfirmadoBanco(transacao)) {
    return "sem_confirmacao_bancaria";
  }

  if (transacao.statusValidacao) {
    return transacao.statusValidacao;
  }

  return "pendente_validacao";
}

export function obterVisualStatusValidacaoUI(status: StatusValidacaoUI) {
  return PIX_VALIDACAO_VISUAL[status];
}

export function obterMensagemBloqueioValidacaoPix(transacao: PixTransacao) {
  const status = obterStatusValidacaoUI(transacao);

  if (!pixPagamentoConfirmadoBanco(transacao)) {
    return "Aguardando confirmação bancária do Pix.";
  }

  if (status === "sem_confirmacao_bancaria") {
    return "Aguardando confirmação bancária do Pix.";
  }

  if (status === "aceita") {
    return "Compra já aceita pela validação Pix.";
  }

  if (status === "negada") {
    return "Compra já negada pela validação Pix.";
  }

  return "";
}

export function podeValidarPixTransacao(transacao: PixTransacao) {
  return (
    pixPagamentoConfirmadoBanco(transacao) &&
    obterStatusValidacaoUI(transacao) === "pendente_validacao"
  );
}

export function obterAuditoriaValidacaoPix(transacao: PixTransacao) {
  const status = obterStatusValidacaoUI(transacao);
  const visual = obterVisualStatusValidacaoUI(status);
  const pagamentoConfirmadoBanco = pixPagamentoConfirmadoBanco(transacao);
  const podeValidar = podeValidarPixTransacao(transacao);
  const mensagemBloqueio = obterMensagemBloqueioValidacaoPix(transacao);

  return {
    status,
    label: visual.label,
    descricao: visual.descricao,
    pagamentoConfirmadoBanco,
    podeAceitar: podeValidar,
    podeNegar: podeValidar,
    mensagemBloqueio,
  };
}

export function calcularResumoValidacaoPix(transacoes: PixTransacao[]) {
  return transacoes.reduce(
    (acc, transacao) => {
      const status = obterStatusValidacaoUI(transacao);

      if (status === "pendente_validacao") {
        acc.quantidadeAguardandoValidacao += 1;
      }

      if (status === "aceita") {
        acc.quantidadeAceitas += 1;
      }

      if (status === "negada") {
        acc.quantidadeNegadas += 1;
      }

      if (status === "sem_confirmacao_bancaria") {
        acc.quantidadeSemConfirmacaoBancaria += 1;
      }

      if (pixTransacaoTemRifas(transacao)) {
        acc.quantidadeComRifas += 1;
      }

      if (pixTransacaoTemPendenciaVinculo(transacao)) {
        acc.quantidadeSemVinculo += 1;
      }

      return acc;
    },
    {
      quantidadeAguardandoValidacao: 0,
      quantidadeAceitas: 0,
      quantidadeNegadas: 0,
      quantidadeSemConfirmacaoBancaria: 0,
      quantidadeComRifas: 0,
      quantidadeSemVinculo: 0,
    },
  );
}

export function aplicarResumoValidacaoPix(
  resumo: PixTransacoesResumo,
  transacoes: PixTransacao[],
): PixTransacoesResumoUI {
  return {
    ...resumo,
    ...calcularResumoValidacaoPix(transacoes),
  };
}
