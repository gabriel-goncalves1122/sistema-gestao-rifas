// ============================================================================
// ARQUIVO: frontend/tests/features/rifas/components/CardArrecadacao.test.tsx
// ============================================================================
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CardArrecadacao } from "@/features/aderidos/components/resumo/CardArrecadacao";

function buscarTextoNormalizado(textoEsperado: string) {
  return screen.getByText((conteudo) => {
    const textoNormalizado = conteudo.replace(/\s/g, " ").trim();

    return textoNormalizado === textoEsperado;
  });
}

describe("Componente: CardArrecadacao", () => {
  it("Deve renderizar o título de arrecadação", () => {
    render(<CardArrecadacao valorArrecadado={0} />);

    expect(screen.getByText("Arrecadado")).toBeInTheDocument();
  });

  it("Deve renderizar o valor arrecadado formatado em reais", () => {
    render(<CardArrecadacao valorArrecadado={150} />);

    expect(buscarTextoNormalizado("R$ 150,00")).toBeInTheDocument();
  });

  it("Deve renderizar R$ 0,00 quando o valor arrecadado for zero", () => {
    render(<CardArrecadacao valorArrecadado={0} />);

    expect(buscarTextoNormalizado("R$ 0,00")).toBeInTheDocument();
  });

  it("Deve renderizar a microcopy do valor confirmado", () => {
    render(<CardArrecadacao valorArrecadado={250} />);

    expect(
      screen.getByText("Confirmado nas vendas aprovadas."),
    ).toBeInTheDocument();
  });

  it("Não deve renderizar o botão de exportar relatório se onExportarRelatorio não for informado", () => {
    render(<CardArrecadacao valorArrecadado={100} />);

    expect(
      screen.queryByRole("button", { name: /Exportar relatório de vendas em PDF/i }),
    ).not.toBeInTheDocument();
  });

  it("Deve renderizar o botão de exportar relatório e disparar callback ao clicar", () => {
    const onExportarRelatorio = vi.fn();
    render(
      <CardArrecadacao
        valorArrecadado={100}
        onExportarRelatorio={onExportarRelatorio}
      />,
    );

    const botao = screen.getByRole("button", {
      name: /Exportar relatório de vendas em PDF/i,
    });
    expect(botao).toBeInTheDocument();

    fireEvent.click(botao);
    expect(onExportarRelatorio).toHaveBeenCalledTimes(1);
  });

  it("Deve desabilitar o botão e exibir spinner quando exportandoRelatorio for true", () => {
    const onExportarRelatorio = vi.fn();
    render(
      <CardArrecadacao
        valorArrecadado={100}
        onExportarRelatorio={onExportarRelatorio}
        exportandoRelatorio={true}
      />,
    );

    const botao = screen.getByRole("button", {
      name: /Exportar relatório de vendas em PDF/i,
    });
    expect(botao).toBeDisabled();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    fireEvent.click(botao);
    expect(onExportarRelatorio).not.toHaveBeenCalled();
  });

  it("Deve renderizar a barra de progresso da meta quando totalRifas for informado", () => {
    render(
      <CardArrecadacao
        valorArrecadado={450}
        totalRifas={120}
        rifasPagas={45}
      />,
    );

    expect(screen.getByTestId("barra-progresso-meta")).toBeInTheDocument();
    expect(screen.getByText(/45 de 120 vendidas \(38%\)/i)).toBeInTheDocument();
  });

  it("Deve renderizar badge de meta atingida quando o percentual for 100%", () => {
    render(
      <CardArrecadacao
        valorArrecadado={1200}
        totalRifas={120}
        rifasPagas={120}
      />,
    );

    expect(screen.getByText(/Meta atingida! 🎉/i)).toBeInTheDocument();
  });
});
