import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PixAnaliseOcrDetalhesSection } from "@/features/tesouraria/components/pix/transacoes/shared/PixAnaliseOcrDetalhesSection";
import { PixTransacao } from "@/features/tesouraria/types/pixTransacoes";

const transacaoBase: PixTransacao = {
  id: "tx_ocr_01",
  metodo: "PIX",
  statusPagamento: "IN_ANALYSIS",
  valorBruto: 20,
  valorPago: 0,
  moeda: "BRL",
  dataCriacao: "2026-11-12T17:00:00.000Z",
  origem: "COMPROVANTE",
  comprovanteUrl: "https://exemplo.com/comp.pdf",
  analiseOcr: {
    statusExecucao: "CONCLUIDO",
    veredicto: "DIVERGENTE",
    score: 45,
    txidBate: true,
    valorBate: false,
    recebedorBate: true,
    e2eUnico: true,
    bancoDetectado: "NUBANK",
    txidLido: "RIFAAB12CD34EF",
    e2eIdDetectado: "E18236120202611121705ABC12345678",
    valorLidoCentavos: 1000,
    dataTransacaoIso: "2026-11-12T14:05:00-03:00",
    recebedorDetectado: "COMISSAO FORMATURA UNIFEI",
    cnpjRecebedorDetectado: "54789437000185",
    alertas: ["VALOR_DIVERGENTE"],
    motivos: ["Valor lido (R$ 10,00) diverge do esperado (R$ 20,00)"],
    tempoMs: 85,
    analisadoEm: "2026-11-12T17:06:00.000Z",
  },
};

describe("Componente: PixAnaliseOcrDetalhesSection", () => {
  it("não deve renderizar nada quando não há análise nem comprovante", () => {
    const { container } = render(
      <PixAnaliseOcrDetalhesSection
        transacao={{ ...transacaoBase, comprovanteUrl: null, analiseOcr: null }}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("deve exibir veredicto, checklist, dados extraídos, alertas e chamar onReanalisarOcr", async () => {
    const onReanalisarOcr = vi.fn().mockResolvedValue(transacaoBase.analiseOcr);

    render(
      <PixAnaliseOcrDetalhesSection
        transacao={transacaoBase}
        onReanalisarOcr={onReanalisarOcr}
      />,
    );

    expect(screen.getByText("Divergente (45%)")).toBeInTheDocument();
    expect(screen.getByText("NUBANK")).toBeInTheDocument();
    expect(screen.getByText("RIFAAB12CD34EF")).toBeInTheDocument();
    expect(
      screen.getByText("• Valor lido diverge do valor esperado"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Reanalisar OCR/i }));

    await waitFor(() => {
      expect(onReanalisarOcr).toHaveBeenCalledWith("tx_ocr_01");
    });
  });

  it("deve exibir botão Analisar OCR agora quando comprovante existir sem análise prévia", () => {
    render(
      <PixAnaliseOcrDetalhesSection
        transacao={{ ...transacaoBase, analiseOcr: null }}
        onReanalisarOcr={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Analisar OCR agora/i }),
    ).toBeInTheDocument();
  });
});
