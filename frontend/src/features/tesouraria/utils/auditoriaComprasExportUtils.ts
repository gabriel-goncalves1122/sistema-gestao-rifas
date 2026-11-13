// ============================================================================
// ARQUIVO: frontend/src/features/tesouraria/utils/auditoriaComprasExportUtils.ts
// ============================================================================
import { formatarDataCurta } from "@/shared/utils/formatadores";
import { TransacaoTesouraria } from "../types/auditoriaCompras";
import {
  origemLabelAuditoria,
  statusLabelAuditoria,
} from "./auditoriaComprasFiltrosUtils";

/**
 * Converte a lista de transações de compras em formato CSV compatível com Excel (delimitador ponto-e-vírgula).
 * Inclui canal de origem, valores bruto e líquido, status bancário e pendência de correção.
 *
 * @param {TransacaoTesouraria[]} compras - Lista de compras a exportar.
 * @returns {string} Conteúdo em string CSV pronto para download.
 */
export function criarCsvAuditoriaCompras(compras: TransacaoTesouraria[]): string {
  const headers = [
    "Data Reserva",
    "Data Pagamento",
    "Origem",
    "Status",
    "Rifas",
    "Qtd",
    "Valor Bruto (R$)",
    "Valor Líquido (R$)",
    "Status Banco",
    "Correção Pendente",
    "Vendedor",
    "CPF Vendedor",
    "Comprador",
    "Email Comprador",
    "Telefone Comprador",
    "Comprovante",
  ];
  const linhas = compras.map((compra) => [
    formatarDataCurta(compra.dataReserva),
    formatarDataCurta(compra.dataPagamento),
    origemLabelAuditoria(compra.origem),
    statusLabelAuditoria(compra.status),
    `"${compra.bilhetes.join(", ")}"`,
    compra.bilhetes.length,
    compra.valorTotal,
    compra.valorLiquido ?? compra.valorTotal,
    compra.statusPagamentoBanco || "-",
    compra.correcaoPendente ? "Sim" : "Não",
    `"${compra.vendedorNome}"`,
    `"${compra.vendedorCpf}"`,
    `"${compra.compradorNome}"`,
    `"${compra.compradorEmail}"`,
    `"${compra.compradorTelefone}"`,
    compra.comprovanteUrl ? "Sim" : "Não",
  ]);

  return [headers.join(";"), ...linhas.map((linha) => linha.join(";"))].join(
    "\n",
  );
}
