// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/utils/gerarPdfRelatorioAderido.ts
// ============================================================================
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  formatarData,
  formatarDataCurta,
  formatarMoeda,
  formatarTelefone,
} from "@/shared/utils/formatadores";
import { RelatorioVendasAderido } from "../types/painelAderido";

/**
 * Cria um slug seguro a partir do nome para uso no nome do arquivo gerado.
 *
 * @param {string} texto - Nome ou texto original.
 * @returns {string} String sanitizada e hifenizada.
 */
function gerarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Mapeia o identificador do canal de venda para uma string amigável de exibição.
 *
 * @param {string} canal - Código do canal ("pix", "comprovante", "outro").
 * @returns {string} Rótulo formatado para o documento.
 */
function formatarCanal(canal: string): string {
  if (canal === "pix") return "Pix";
  if (canal === "comprovante") return "Comprovante";
  return "Outro";
}

/**
 * Gera e realiza o download do relatório de vendas do aderido no formato PDF A4.
 *
 * Estrutura:
 * 1. Cabeçalho institucional com faixa verde (#063D31) e acento dourado (#CBA64D).
 * 2. Identificação do formando e timestamp de emissão.
 * 3. 4 KPIs consolidados (Pagas, Em Análise, Total Vendido, Disponíveis).
 * 4. Tabela detalhada de bilhetes vendidos com comprador, contato, canal, data, status e valor.
 * 5. Rodapé com numeração de página e aviso de conformidade.
 *
 * @param {RelatorioVendasAderido} relatorio - Dados consolidados do aderido vindos da API.
 * @param {boolean} [baixarArquivo=true] - Se deve disparar doc.save() no navegador (útil false em testes).
 * @param {jsPDF} [docInstance] - Instância injetada opcional para testes unitários.
 * @returns {jsPDF} Instância do documento PDF gerado para inspeção ou testes.
 */
export function gerarPdfRelatorioAderido(
  relatorio: RelatorioVendasAderido,
  baixarArquivo = true,
  docInstance?: jsPDF,
): jsPDF {
  const doc =
    docInstance ||
    new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

  const totalPagesExp = "{total_pages_count_string}";

  // Dimensões úteis da página A4
  const margemEsq = 14;
  const larguraUtil = 182; // 210 - 28

  // --------------------------------------------------------------------------
  // 1. CABEÇALHO INSTITUCIONAL
  // --------------------------------------------------------------------------
  // Faixa dourada superior
  doc.setFillColor(203, 166, 77); // #CBA64D
  doc.rect(0, 0, 210, 2.5, "F");

  // Faixa verde principal
  doc.setFillColor(6, 61, 49); // #063D31
  doc.rect(0, 2.5, 210, 21.5, "F");

  // Título e subtítulo institucionais
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    "SISTEMA DE GESTÃO DE RIFAS • COMISSÃO DE FORMATURA",
    margemEsq,
    9.5,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RELATÓRIO INDIVIDUAL DE VENDAS", margemEsq, 17.5);

  // --------------------------------------------------------------------------
  // 2. IDENTIFICAÇÃO DO FORMANDO / ADERIDO
  // --------------------------------------------------------------------------
  const yInfo = 29;
  doc.setFillColor(243, 247, 245); // Fundo suave esverdeado
  doc.setDrawColor(218, 230, 224);
  doc.roundedRect(margemEsq, yInfo, larguraUtil, 12, 1.5, 1.5, "FD");

  doc.setFontSize(8.5);
  doc.setTextColor(27, 45, 38);

  // Lado esquerdo: Nome e E-mail do Aderido
  doc.setFont("helvetica", "bold");
  doc.text("Aderido(a):", margemEsq + 3, yInfo + 5);
  doc.setFont("helvetica", "normal");
  doc.text(relatorio.aderido.nome || "Não informado", margemEsq + 21, yInfo + 5);

  doc.setFont("helvetica", "bold");
  doc.text("E-mail:", margemEsq + 3, yInfo + 9.5);
  doc.setFont("helvetica", "normal");
  doc.text(relatorio.aderido.email || "Não informado", margemEsq + 15, yInfo + 9.5);

  // Lado direito: Emissão do Relatório
  const dataFormatada = formatarData(relatorio.geradoEm);
  doc.setFont("helvetica", "bold");
  doc.text("Emissão:", margemEsq + 115, yInfo + 7.5);
  doc.setFont("helvetica", "normal");
  doc.text(dataFormatada, margemEsq + 130, yInfo + 7.5);

  // --------------------------------------------------------------------------
  // 3. CARDS DE KPI / RESUMO CONSOLIDADO
  // --------------------------------------------------------------------------
  const yCards = 44;
  const alturaCard = 18;
  const espacoCard = 3;
  const larguraCard = (larguraUtil - 3 * espacoCard) / 4; // ~43.25mm

  const cards = [
    {
      titulo: "PAGAS / CONFIRMADAS",
      qtd: `${relatorio.resumo.rifasPagas} rifas`,
      valor: formatarMoeda(relatorio.resumo.valorPagoConfirmado),
      corTitulo: [11, 81, 54] as [number, number, number],
      fundo: [234, 247, 239] as [number, number, number],
      borda: [186, 225, 203] as [number, number, number],
    },
    {
      titulo: "EM ANÁLISE",
      qtd: `${relatorio.resumo.rifasEmAnalise} rifas`,
      valor: formatarMoeda(relatorio.resumo.valorEmAnalise),
      corTitulo: [138, 101, 17] as [number, number, number],
      fundo: [255, 248, 230] as [number, number, number],
      borda: [243, 222, 169] as [number, number, number],
    },
    {
      titulo: "TOTAL NEGOCIADO",
      qtd: `${relatorio.resumo.totalVendidas} rifas`,
      valor: formatarMoeda(relatorio.resumo.valorTotalNegociado),
      corTitulo: [6, 61, 49] as [number, number, number],
      fundo: [240, 245, 243] as [number, number, number],
      borda: [204, 222, 214] as [number, number, number],
    },
    {
      titulo: "DISPONÍVEIS",
      qtd: `${relatorio.resumo.rifasDisponiveis} rifas`,
      valor: `de ${relatorio.resumo.totalRifasLote} do lote`,
      corTitulo: [83, 105, 98] as [number, number, number],
      fundo: [247, 248, 248] as [number, number, number],
      borda: [225, 228, 227] as [number, number, number],
    },
  ];

  cards.forEach((card, index) => {
    const x = margemEsq + index * (larguraCard + espacoCard);

    doc.setFillColor(...card.fundo);
    doc.setDrawColor(...card.borda);
    doc.roundedRect(x, yCards, larguraCard, alturaCard, 1.5, 1.5, "FD");

    // Título do card
    doc.setTextColor(...card.corTitulo);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(card.titulo, x + 2.5, yCards + 4.5);

    // Quantidade em destaque
    doc.setTextColor(27, 45, 38);
    doc.setFontSize(10.5);
    doc.text(card.qtd, x + 2.5, yCards + 10.5);

    // Subvalor
    doc.setTextColor(...card.corTitulo);
    doc.setFontSize(7.5);
    doc.text(card.valor, x + 2.5, yCards + 15);
  });

  // --------------------------------------------------------------------------
  // 4. TABELA DE ITENS VENDIDOS
  // --------------------------------------------------------------------------
  const tableData =
    relatorio.itens.length > 0
      ? relatorio.itens.map((item) => [
          String(item.numeroRifa).padStart(3, "0"),
          item.compradorNome,
          formatarTelefone(item.compradorTelefone) || "-",
          item.compradorEmail || "-",
          formatarCanal(item.canal),
          formatarDataCurta(item.data),
          item.statusFormatado,
          formatarMoeda(item.valor),
        ])
      : [
          [
            "-",
            "Nenhum bilhete vendido ou em análise registrado até o momento.",
            "-",
            "-",
            "-",
            "-",
            "-",
            "-",
          ],
        ];

  autoTable(doc, {
    startY: 66,
    margin: { left: margemEsq, right: margemEsq },
    head: [
      [
        "Nº",
        "Comprador",
        "Telefone / WhatsApp",
        "E-mail",
        "Canal",
        "Data",
        "Status",
        "Valor",
      ],
    ],
    body: tableData,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      textColor: [27, 45, 38],
      cellPadding: 2.2,
      overflow: "ellipsize",
    },
    headStyles: {
      fillColor: [6, 61, 49],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 249],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 38 },
      2: { cellWidth: 26 },
      3: { cellWidth: 34 },
      4: { cellWidth: 18, halign: "center" },
      5: { cellWidth: 20, halign: "center" },
      6: { cellWidth: 18, halign: "center" },
      7: { cellWidth: 16, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      // Cores semânticas para a coluna de Status (índice 6)
      if (data.section === "body" && data.column.index === 6) {
        const statusTexto = String(data.cell.raw);
        if (statusTexto === "Pago") {
          data.cell.styles.textColor = [11, 81, 54];
          data.cell.styles.fontStyle = "bold";
        } else if (statusTexto === "Em análise") {
          data.cell.styles.textColor = [160, 115, 20];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    didDrawPage: (_data) => {
      // ----------------------------------------------------------------------
      // 5. RODAPÉ DE PÁGINA
      // ----------------------------------------------------------------------
      const alturaPagina = doc.internal.pageSize.getHeight();

      // Linha separadora
      doc.setDrawColor(218, 230, 224);
      doc.line(
        margemEsq,
        alturaPagina - 12,
        margemEsq + larguraUtil,
        alturaPagina - 12,
      );

      // Texto de conformidade à esquerda
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120, 140, 134);
      doc.text(
        "Sistema de Gestão de Rifas • Documento emitido para controle individual do formando",
        margemEsq,
        alturaPagina - 7.5,
      );

      // Numeração de página à direita
      const numPagina = `Página ${doc.internal.getNumberOfPages()} de ${totalPagesExp}`;
      doc.text(
        numPagina,
        margemEsq + larguraUtil,
        alturaPagina - 7.5,
        { align: "right" },
      );
    },
  });

  // Substitui a contagem total de páginas no rodapé
  if (typeof doc.putTotalPages === "function") {
    doc.putTotalPages(totalPagesExp);
  }

  // --------------------------------------------------------------------------
  // 6. DOWNLOAD DO ARQUIVO
  // --------------------------------------------------------------------------
  if (baixarArquivo) {
    const slugNome = gerarSlug(relatorio.aderido.nome || "aderido");
    const dataStr = new Date().toISOString().slice(0, 10);
    const nomeArquivo = `relatorio-vendas-${slugNome}-${dataStr}.pdf`;
    doc.save(nomeArquivo);
  }

  return doc;
}
