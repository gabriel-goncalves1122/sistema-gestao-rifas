// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/helpers/pixTransacoesHelper.ts
// ============================================================================
import {
  BilheteComNumero,
  PixTransacao,
  StatusPagamentoPix,
  StatusValidacaoPix,
} from "../types/tesourariaTypes";
import { resolverProvedorRegistro } from "./origemPagamentoHelper";
import { chaveCompra } from "./pixResumoHelper";
import {
  cpfEhValido,
  formatarCpfVendedor,
  MapaVendedores,
  resolverVendedorDoBilhete,
} from "./vendedorLookupHelper";

export {
  chaveCompra,
  transacaoPixEstaValidada,
  transacaoPixAguardandoValidacao,
  calcularResumoComprovantes,
  calcularResumoPixTransacoes,
} from "./pixResumoHelper";

const VALOR_RIFA = 10;

/**
 * Campos mínimos da coleção `bilhetes` projetados via `.select()` nas consultas da Tesouraria,
 * evitando tráfego de campos pesados desnecessários (como logs extensos).
 */
export const CAMPOS_PROJECAO_BILHETE_TESOURARIA = [
  "status",
  "pix_order_id",
  "pix_reference_id",
  "provedor_pagamento",
  "dados_conciliacao",
  "comprovante_url",
  "comprador_id",
  "comprador_nome",
  "comprador_email",
  "comprador_telefone",
  "vendedor_id",
  "vendedor_nome",
  "vendedor_cpf",
  "data_reserva",
  "data_pagamento",
  "data_expiracao",
  "sessao_checkout_id",
  "status_pagamento_banco",
  "status_validacao",
  "valor_bruto",
  "valor_pago",
  "motivo_recusa",
  "correcao_pendente",
] as const;

/**
 * Aplica projeção `.select(...)` com fallback seguro para mocks de teste que não implementam `.select()`.
 *
 * @template T
 * @param {T} query - Query Firestore ou dublê de teste.
 * @param {readonly string[]} campos - Campos a projetar.
 * @returns {T} Mesma query com projeção aplicada quando suportada.
 */
export function aplicarSelectSeguro<T>(query: T, campos: readonly string[]): T {
  const candidata = query as { select?: (...args: string[]) => T };
  if (typeof candidata?.select === "function") {
    return candidata.select(...campos);
  }
  return query;
}

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
  if (status === "recusado") {
    return statusBanco === "CANCELED" ? "CANCELED" : "DECLINED";
  }

  if (status === "pago") {
    return "PAID";
  }

  if (
    status === "pendente" &&
    (statusBanco === "CANCELED" || statusBanco === "ERROR")
  ) {
    return "WAITING";
  }

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

  if (status === "reservado") return "WAITING";
  if (status === "pendente") return "WAITING";

  return "WAITING";
}

/**
 * Resolve o status de validação da Tesouraria para uma transação Pix a partir do bilhete base.
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

  if (base.status === "pago") {
    return "aceita";
  }

  if (base.status === "recusado") {
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
 * @returns {PixTransacao} DTO consolidado com valores somados, dados do comprador, vendedor e provedor explícito.
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

  const registroOrigem =
    bilhetesOrdenados.find((b) => Boolean(b.provedor_pagamento || b.pix_order_id)) || base;
  const provedor = resolverProvedorRegistro(registroOrigem);
  const ehPix = provedor !== "COMPROVANTE_PURO";
  const comprovanteUrl =
    bilhetesOrdenados.find((bilhete) => Boolean(bilhete.comprovante_url))
      ?.comprovante_url || null;
  const chaveBruta = chaveCompra(base);

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
    origem: ehPix ? "PIX" : "COMPROVANTE",
    provedor,
    comprovanteUrl,
    chaveAcao: chaveBruta,
  };
}
