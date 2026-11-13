// ============================================================================
// ARQUIVO: frontend/src/features/tesouraria/utils/auditoriaComprasMetricasUtils.ts
// ============================================================================
import { normalizarTexto } from "@/shared/utils/formatadores";
import {
  ContagensAuditoriaCompras,
  ResumoAuditoriaCompras,
  TransacaoTesouraria,
} from "../types/auditoriaCompras";

/**
 * Computa as contagens absolutas por status, canal e pendência de correção para exibição nos chips de filtro.
 *
 * @param {TransacaoTesouraria[]} compras - Lista total de compras na base.
 * @returns {ContagensAuditoriaCompras} Objeto com os contadores por categoria.
 */
export function calcularContagensAuditoria(
  compras: TransacaoTesouraria[],
): ContagensAuditoriaCompras {
  let pago = 0;
  let pendente = 0;
  let recusado = 0;
  let pix = 0;
  let comprovante = 0;
  let correcaoPendente = 0;

  for (const compra of compras) {
    const status = normalizarTexto(compra.status);
    if (status === "pago") pago += 1;
    else if (status === "pendente") pendente += 1;
    else if (status === "recusado") recusado += 1;

    if ((compra.origem || "").toUpperCase() === "PIX") {
      pix += 1;
    } else {
      comprovante += 1;
    }

    if (compra.correcaoPendente) {
      correcaoPendente += 1;
    }
  }

  return {
    todas: compras.length,
    pago,
    pendente,
    recusado,
    pix,
    comprovante,
    correcaoPendente,
  };
}

/**
 * Computa as contagens e valores consolidados (brutos e líquidos) para os cards de resumo da auditoria.
 * Executa em passada única linear O(N) para máxima eficiência de processamento e memória.
 *
 * @param {TransacaoTesouraria[]} compras - Lista de compras auditadas.
 * @returns {ResumoAuditoriaCompras} Quantitativos e totais financeiros.
 */
export function calcularResumoAuditoria(
  compras: TransacaoTesouraria[],
): ResumoAuditoriaCompras {
  let totalRifas = 0;
  let valorTotal = 0;
  let valorLiquido = 0;
  let pagas = 0;
  let pendentes = 0;
  let recusadas = 0;
  let comprasPix = 0;

  for (let i = 0; i < compras.length; i++) {
    const compra = compras[i];
    totalRifas += compra.bilhetes ? compra.bilhetes.length : 0;
    valorTotal += compra.valorTotal || 0;
    valorLiquido += compra.valorLiquido ?? compra.valorTotal ?? 0;

    const status = normalizarTexto(compra.status);
    if (status === "pago") {
      pagas += 1;
    } else if (status === "pendente") {
      pendentes += 1;
    } else if (status === "recusado") {
      recusadas += 1;
    }

    if ((compra.origem || "").toUpperCase() === "PIX") {
      comprasPix += 1;
    }
  }

  const comprasComprovante = compras.length - comprasPix;

  return {
    totalCompras: compras.length,
    totalRifas,
    valorTotal,
    valorLiquido,
    comprasPix,
    comprasComprovante,
    pagas,
    pendentes,
    recusadas,
  };
}
