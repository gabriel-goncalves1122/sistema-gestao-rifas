import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PixAnaliseOcrChip } from "@/features/tesouraria/components/pix/transacoes/shared/PixAnaliseOcrChip";
import { AnaliseOcrDTO } from "@/features/tesouraria/types/pixTransacoes";

const analiseExemplo: AnaliseOcrDTO = {
  statusExecucao: "CONCLUIDO",
  veredicto: "CORRELACAO_FORTE",
  score: 92,
  txidBate: true,
  valorBate: true,
  recebedorBate: true,
  e2eUnico: true,
  bancoDetectado: "INTER",
  txidLido: "RIFA123",
  e2eIdDetectado: "E00416968202611051205ABC12345678",
  valorLidoCentavos: 3000,
  dataTransacaoIso: "2026-11-12T14:05:00-03:00",
  recebedorDetectado: "COMISSAO FORMATURA UNIFEI",
  cnpjRecebedorDetectado: "54789437000185",
  alertas: [],
  motivos: [],
  tempoMs: 55,
  analisadoEm: "2026-11-12T17:06:00.000Z",
};

describe("Componente: PixAnaliseOcrChip", () => {
  it("não deve renderizar nada quando não há análise nem comprovante anexado", () => {
    const { container } = render(
      <PixAnaliseOcrChip analiseOcr={null} temComprovante={false} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("deve renderizar chip neutro Sem OCR quando houver comprovante sem análise", () => {
    render(<PixAnaliseOcrChip analiseOcr={null} temComprovante />);

    expect(screen.getByTestId("pix-analise-ocr-chip")).toHaveTextContent("Sem OCR");
  });

  it("deve renderizar veredicto e score quando analiseOcr estiver presente", () => {
    render(<PixAnaliseOcrChip analiseOcr={analiseExemplo} temComprovante />);

    expect(screen.getByTestId("pix-analise-ocr-chip")).toHaveTextContent(
      "Forte 92%",
    );
  });
});
