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
 *
 * @param {TransacaoTesouraria[]} compras - Lista de compras auditadas.
 * @returns {ResumoAuditoriaCompras} Quantitativos e totais financeiros.
 */
export function calcularResumoAuditoria(
  compras: TransacaoTesouraria[],
): ResumoAuditoriaCompras {
  const totalRifas = compras.reduce(
    (acc, compra) => acc + compra.bilhetes.length,
    0,
  );
  const valorTotal = compras.reduce(
    (acc, compra) => acc + (compra.valorTotal || 0),
    0,
  );
  const valorLiquido = compras.reduce(
    (acc, compra) => acc + (compra.valorLiquido ?? compra.valorTotal ?? 0),
    0,
  );
  const pagas = compras.filter(
    (compra) => normalizarTexto(compra.status) === "pago",
  ).length;
  const pendentes = compras.filter(
    (compra) => normalizarTexto(compra.status) === "pendente",
  ).length;
  const recusadas = compras.filter(
    (compra) => normalizarTexto(compra.status) === "recusado",
  ).length;

  const comprasPix = compras.filter(
    (compra) => (compra.origem || "").toUpperCase() === "PIX",
  ).length;
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
