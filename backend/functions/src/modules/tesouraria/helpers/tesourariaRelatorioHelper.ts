import { Bilhete, ProvedorPagamento } from "../../types/models";
import {
  BilheteComNumero,
  OrigemTransacaoTesouraria,
  TransacaoResumoAderido,
  TransacaoTesouraria,
} from "../types/tesourariaTypes";
import { calcularValorLiquido, resolverProvedorRegistro } from "./origemPagamentoHelper";
import {
  chaveCompra,
  normalizarId,
  primeiraDataValida,
  statusPagamento,
  valorDataSeguro,
} from "./pixTransacoesHelper";
import {
  formatarCpfVendedor,
  MapaVendedores,
  resolverVendedorDoBilhete,
} from "./vendedorLookupHelper";

const VALOR_RIFA = 10;

/**
 * Acumulador interno por aderido para consolidação do relatório financeiro da Tesouraria.
 */
export interface AcumuladorVendasAderido {
  rifasPagasPix: number;
  rifasPagasComprovante: number;
  valorBrutoPix: number;
  valorLiquidoPix: number;
  valorBrutoComprovante: number;
  rifasPendentes: number;
  gruposCompra: Map<string, BilheteComNumero[]>;
}

/**
 * Cria um acumulador zerado para consolidar vendas por aderido.
 *
 * @returns {AcumuladorVendasAderido} Estrutura inicial de acumulação.
 */
export function criarAcumuladorVendasAderido(): AcumuladorVendasAderido {
  return {
    rifasPagasPix: 0,
    rifasPagasComprovante: 0,
    valorBrutoPix: 0,
    valorLiquidoPix: 0,
    valorBrutoComprovante: 0,
    rifasPendentes: 0,
    gruposCompra: new Map(),
  };
}

/**
 * Resolve a origem (`PIX` ou `COMPROVANTE`) e o provedor explícito a partir de um bilhete.
 *
 * @param {Partial<Bilhete>} bilhete - Bilhete avaliado.
 * @returns {{ provedor: ProvedorPagamento; ehPix: boolean; origem: OrigemTransacaoTesouraria }} Origem classificada.
 */
export function classificarOrigemBilhete(bilhete: Partial<Bilhete>): {
  provedor: ProvedorPagamento;
  ehPix: boolean;
  origem: OrigemTransacaoTesouraria;
} {
  const provedor = resolverProvedorRegistro(bilhete);
  const ehPix = provedor !== "COMPROVANTE_PURO";
  return {
    provedor,
    ehPix,
    origem: ehPix ? "PIX" : "COMPROVANTE",
  };
}

/**
 * Converte os grupos de bilhetes de um aderido em uma lista ordenada de transações resumidas,
 * aplicando taxa de gateway apenas em cobranças `MERCADOPAGO_API` (Pix Normal permanece integral).
 *
 * @param {Map<string, BilheteComNumero[]>} gruposCompra - Mapa de bilhetes agrupados por compra.
 * @returns {TransacaoResumoAderido[]} Lista de transações ordenada pela data mais recente.
 */
export function montarTransacoesDoAderido(
  gruposCompra: Map<string, BilheteComNumero[]>,
): TransacaoResumoAderido[] {
  return Array.from(gruposCompra.values())
    .map((grupo) => {
      const ordenados = [...grupo].sort((a, b) =>
        a.numero.localeCompare(b.numero, "pt-BR", { numeric: true }),
      );
      const base = ordenados[0];
      const { provedor, origem } = classificarOrigemBilhete(
        ordenados.find((b) => Boolean(b.provedor_pagamento || b.pix_order_id)) || base,
      );
      const statusPag = statusPagamento(
        base.status || "pago",
        base.status_pagamento_banco,
      );
      const valorBruto = ordenados.reduce(
        (soma, b) => soma + (b.valor_pago || b.valor_bruto || VALOR_RIFA),
        0,
      );
      const valorPago = ["PAID", "AUTHORIZED"].includes(statusPag)
        ? calcularValorLiquido(valorBruto, provedor)
        : 0;
      const dataCriacao = primeiraDataValida(
        base.data_reserva,
        base.data_pagamento,
      );
      const dataPagamento = ["PAID", "AUTHORIZED"].includes(statusPag)
        ? primeiraDataValida(base.data_pagamento, base.data_reserva)
        : null;
      const numerosStr = ordenados.map((b) => b.numero).join("-");
      const idNormalizado =
        normalizarId(chaveCompra(base) || numerosStr) || `rifas-${numerosStr}`;

      return {
        id: idNormalizado,
        compradorNome: base.comprador_nome || "Pagador não informado",
        dataPagamento,
        dataCriacao,
        valorBruto,
        valorPago,
        quantidadeRifas: ordenados.length,
        rifas: ordenados.map((b) => ({
          numero: b.numero,
          status: b.status || "pago",
        })),
        origem,
        statusPagamento: statusPag,
      };
    })
    .sort(
      (a, b) =>
        valorDataSeguro(b.dataPagamento || b.dataCriacao) -
        valorDataSeguro(a.dataPagamento || a.dataCriacao),
    );
}

/**
 * Agrupa e ordena bilhetes para o histórico detalhado da Tesouraria, diferenciando taxa líquida
 * de gateway (`MERCADOPAGO_API`) vs. Pix Normal (`EMV_OFFLINE`) e comprovantes manuais.
 *
 * @param {Array<{ id: string; data: () => Bilhete }>} bilhetesDocs - Snapshots de bilhetes lidos do Firestore.
 * @param {MapaVendedores | null} mapaVendedores - Mapa indexado opcional para enriquecimento de aderidos.
 * @returns {TransacaoTesouraria[]} Lista ordenada do histórico consolidado da Tesouraria.
 */
export function agruparHistoricoTesouraria(
  bilhetesDocs: Array<{ id: string; data: () => Bilhete }>,
  mapaVendedores: MapaVendedores | null,
): TransacaoTesouraria[] {
  const agrupado: Record<string, TransacaoTesouraria> = {};
  const valorLiquidoPorChave: Record<string, number> = {};

  bilhetesDocs.forEach((doc) => {
    const data = doc.data() as Bilhete;
    const numero = doc.id;
    const bilheteComNumero: BilheteComNumero = { ...data, numero };

    const chave = chaveCompra(bilheteComNumero);
    const vendedorResolvido = resolverVendedorDoBilhete(data, mapaVendedores);
    const vendedorNome =
      vendedorResolvido?.nome || data.vendedor_nome || "Desconhecido";
    const vendedorCpf = formatarCpfVendedor(data.vendedor_cpf, vendedorResolvido);
    const dataReserva = data.data_reserva || data.data_pagamento || null;
    const dataPagamento =
      data.data_pagamento || (data.status === "pago" ? data.data_reserva || null : null);
    const valorBilhete = data.valor_pago || data.valor_bruto || VALOR_RIFA;
    const { provedor, origem } = classificarOrigemBilhete(data);
    const valorLiquidoBilhete = calcularValorLiquido(valorBilhete, provedor);

    if (!agrupado[chave]) {
      agrupado[chave] = {
        id: chave,
        dataReserva,
        dataPagamento,
        vendedorId: vendedorResolvido?.docId || data.vendedor_id,
        vendedorNome,
        vendedorCpf,
        compradorId: data.comprador_id || null,
        compradorNome: data.comprador_nome || "Desconhecido",
        compradorEmail: data.comprador_email || "",
        compradorTelefone: data.comprador_telefone || "",
        status: data.status,
        comprovanteUrl: data.comprovante_url || null,
        bilhetes: [numero],
        valorTotal: valorBilhete,
        origem,
        provedor,
        pixOrderId: data.pix_order_id || null,
        statusPagamentoBanco: data.status_pagamento_banco || null,
        statusValidacao: data.status_validacao || null,
        correcaoPendente: Boolean(data.correcao_pendente),
      };
      valorLiquidoPorChave[chave] = valorLiquidoBilhete;
    } else {
      if (!agrupado[chave].bilhetes.includes(numero)) {
        agrupado[chave].bilhetes.push(numero);
        agrupado[chave].valorTotal += valorBilhete;
        valorLiquidoPorChave[chave] = Number(
          (valorLiquidoPorChave[chave] + valorLiquidoBilhete).toFixed(2),
        );
      }
      agrupado[chave].comprovanteUrl =
        agrupado[chave].comprovanteUrl || data.comprovante_url || null;
      agrupado[chave].dataReserva =
        agrupado[chave].dataReserva || dataReserva;
      agrupado[chave].dataPagamento =
        agrupado[chave].dataPagamento || dataPagamento;
      if (data.correcao_pendente) {
        agrupado[chave].correcaoPendente = true;
      }
    }
  });

  const historico = Object.entries(agrupado).map(([chave, transacao]) => {
    transacao.bilhetes.sort((a, b) =>
      a.localeCompare(b, "pt-BR", { numeric: true }),
    );
    transacao.valorLiquido = Number((valorLiquidoPorChave[chave] ?? transacao.valorTotal).toFixed(2));
    return transacao;
  });

  return historico.sort((a, b) => {
    const dataA = valorDataSeguro(a.dataReserva || a.dataPagamento);
    const dataB = valorDataSeguro(b.dataReserva || b.dataPagamento);
    return dataB - dataA;
  });
}
