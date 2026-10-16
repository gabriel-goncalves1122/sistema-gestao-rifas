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

/**
 * Avalia se o status textual de um bilhete corresponde a 'pago'.
 *
 * @param {string | null} [status] - Status do bilhete.
 * @returns {boolean} `true` se estiver pago.
 */
function statusRifaPago(status?: string | null): boolean {
  return String(status || "").trim().toLowerCase() === "pago";
}

/**
 * Avalia se todos os bilhetes de rifa associados à transação possuem status 'pago'.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {boolean} `true` se contiver bilhetes e todos forem pagos.
 */
function todasRifasPagas(transacao: PixTransacao): boolean {
  const rifas = transacao.rifas || [];

  return rifas.length > 0 && rifas.every((rifa) => statusRifaPago(rifa.status));
}

/**
 * Avalia se a transação possui valor monetário pago positivo e data de liquidação informada.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {boolean} `true` se contiver valor e data válidos.
 */
function valorPagoComData(transacao: PixTransacao): boolean {
  return (
    Number(transacao.valorPago || 0) > 0 &&
    Boolean(String(transacao.dataPagamento || "").trim())
  );
}

/**
 * Verifica se a string descritiva do vendedor indica ausência de vínculo formal com um aderido.
 *
 * @param {string | null} [valor] - Nome ou texto do vendedor.
 * @returns {boolean} `true` se for sem vínculo (ex: 'Sem aderido vinculado', 'Não vinculado').
 */
function textoIndicaSemVinculo(valor?: string | null): boolean {
  const texto = String(valor || "").trim().toLowerCase();

  return (
    !texto ||
    texto === "sem aderido" ||
    texto === "sem aderido vinculado" ||
    texto === "não vinculado" ||
    texto === "nao vinculado"
  );
}

/**
 * Verifica se a transação possui bilhetes vinculados.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {boolean} `true` se houver ao menos um bilhete.
 */
export function pixTransacaoTemRifas(transacao: PixTransacao): boolean {
  return Boolean(transacao.rifas?.length);
}

/**
 * Detecta se a transação possui pendência de vínculo cadastral (ausência de vendaId ou de aderido).
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {boolean} `true` se houver inconsistência ou pendência de vínculo.
 */
export function pixTransacaoTemPendenciaVinculo(transacao: PixTransacao): boolean {
  const possuiVenda = Boolean(String(transacao.vendaId || "").trim());
  const possuiAderido =
    Boolean(String(transacao.aderido?.id || "").trim()) ||
    !textoIndicaSemVinculo(transacao.aderido?.nome);

  return !pixTransacaoTemRifas(transacao) || !possuiVenda || !possuiAderido;
}

/**
 * Confere de forma abrangente se o pagamento foi liquidado pelo gateway bancário,
 * seja pelo enum de status (`PAID` ou `AUTHORIZED`), por todas as rifas pagas ou por valor com data.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {boolean} `true` se o pagamento estiver confirmado no banco.
 */
export function pixPagamentoConfirmadoBanco(transacao: PixTransacao): boolean {
  return (
    ["PAID", "AUTHORIZED"].includes(transacao.statusPagamento) ||
    todasRifasPagas(transacao) ||
    valorPagoComData(transacao)
  );
}

/**
 * Calcula o status visual derivado para pills e badges de validação da Tesouraria.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {StatusValidacaoUI} 'sem_confirmacao_bancaria' | 'pendente_validacao' | 'aceita' | 'negada'.
 */
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

/**
 * Retorna as configurações visuais de cores, rótulos e bordas do status de validação.
 *
 * @param {StatusValidacaoUI} status - Status da UI.
 * @returns {PixValidacaoVisual} Configurações de cores e textos.
 */
export function obterVisualStatusValidacaoUI(status: StatusValidacaoUI): PixValidacaoVisual {
  return PIX_VALIDACAO_VISUAL[status];
}

/**
 * Gera mensagem descritiva de bloqueio quando a tesouraria não pode intervir na transação.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {string} Mensagem explicativa ou vazia se a transação for passível de validação.
 */
export function obterMensagemBloqueioValidacaoPix(transacao: PixTransacao): string {
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

/**
 * Determina se a transação está elegível para aceitação ou negação manual pela tesouraria.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {boolean} `true` se puder ser validada.
 */
export function podeValidarPixTransacao(transacao: PixTransacao): boolean {
  return (
    pixPagamentoConfirmadoBanco(transacao) &&
    obterStatusValidacaoUI(transacao) === "pendente_validacao"
  );
}

/**
 * Monta o pacote de dados e regras de negócio para exibição no painel ou drawer de auditoria da transação.
 *
 * @param {PixTransacao} transacao - Transação avaliada.
 * @returns {Object} Pacote contendo status, label, descrição, flags de permissão de aceitar/negar e eventual mensagem de bloqueio.
 */
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

/**
 * Totaliza as contagens operacionais dos diferentes status de validação (aguardando, aceitas, negadas, sem banco, sem vínculo).
 *
 * @param {PixTransacao[]} transacoes - Lista de transações da tesouraria.
 * @returns {Object} Quantitativos operacionais por status de validação.
 */
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

/**
 * Mescla o resumo financeiro das transações com os quantitativos operacionais de validação para alimentar os cards da UI.
 *
 * @param {PixTransacoesResumo} resumo - Resumo financeiro consolidado.
 * @param {PixTransacao[]} transacoes - Lista de transações.
 * @returns {PixTransacoesResumoUI} Resumo unificado pronto para consumo nos componentes visuais.
 */
export function aplicarResumoValidacaoPix(
  resumo: PixTransacoesResumo,
  transacoes: PixTransacao[],
): PixTransacoesResumoUI {
  return {
    ...resumo,
    ...calcularResumoValidacaoPix(transacoes),
  };
}
