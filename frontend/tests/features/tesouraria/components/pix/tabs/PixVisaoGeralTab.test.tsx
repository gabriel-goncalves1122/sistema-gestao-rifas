import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PixVisaoGeralTab } from "@/features/tesouraria/components/pix/tabs/PixVisaoGeralTab";
import { pixTransacoesMock } from "@/features/tesouraria/mocks/pixTransacoesMock";
import { calcularResumoPixTransacoes } from "@/features/tesouraria/utils/pixTransacoesUtils";

vi.mock("recharts", async () => {
  const OriginalRecharts = await vi.importActual<any>("recharts");

  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 320 }}>{children}</div>
    ),
  };
});

const matchMediaOriginal = window.matchMedia;

function simularMobile() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("Aba: PixVisaoGeralTab", () => {
  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: matchMediaOriginal,
    });

    vi.restoreAllMocks();
  });

  it("Deve renderizar resumo consolidado e análise temporal no desktop", () => {
    render(
      <PixVisaoGeralTab
        resumo={calcularResumoPixTransacoes(pixTransacoesMock)}
        transacoes={pixTransacoesMock}
      />,
    );

    expect(screen.getByText("TOTAL GERAL CONSOLIDADO")).toBeInTheDocument();
    expect(screen.getByText("PIX AUTOMATIZADO")).toBeInTheDocument();
    expect(screen.getByText("COMPROVANTES MANUAIS")).toBeInTheDocument();
    expect(screen.getByText("Recebimentos ao longo do tempo")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Evolução diária dos Pix recebidos, pendentes e pontos que exigem conciliação./i,
      ),
    ).toBeInTheDocument();
  });

  it("Deve renderizar resumo consolidado no mobile sem texto explicativo longo no gráfico", () => {
    simularMobile();

    render(
      <PixVisaoGeralTab
        resumo={calcularResumoPixTransacoes(pixTransacoesMock)}
        transacoes={pixTransacoesMock}
      />,
    );

    expect(screen.getByText("TOTAL GERAL CONSOLIDADO")).toBeInTheDocument();
    expect(screen.getByText("PIX AUTOMATIZADO")).toBeInTheDocument();
    expect(screen.getByText("COMPROVANTES MANUAIS")).toBeInTheDocument();
    expect(screen.getByText("Recebimentos ao longo do tempo")).toBeInTheDocument();
    expect(
      screen.queryByText(
        /Evolução diária dos Pix recebidos, pendentes e pontos que exigem conciliação./i,
      ),
    ).not.toBeInTheDocument();
  });
});
