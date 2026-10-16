import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesempenhoPage } from "@/features/tesouraria/pages/DesempenhoPage";
import { useDesempenhoController } from "@/features/tesouraria/hooks/useDesempenhoController";
import { montarDadosDesempenho } from "@/features/tesouraria/utils/desempenhoDataUtils";

vi.mock("@/features/tesouraria/hooks/useDesempenhoController", () => ({
  useDesempenhoController: vi.fn(),
}));

vi.mock("recharts", async () => {
  const OriginalRecharts = await vi.importActual<any>("recharts");
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 300 }}>{children}</div>
    ),
  };
});

const matchMediaOriginal = window.matchMedia;

function simularDesktop() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
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

function mockarController(carregando = false) {
  const dados = montarDadosDesempenho({
    resumoGeral: { totalArrecadado: 500, rifasPagas: 50, aderidosAtivos: 10 },
    aderidos: [{ arrecadado: 150, meta: 100 }],
    historicoTransacoes: [
      { status: "pago", data_reserva: "2026-05-01", valor: 500 },
    ],
  });

  vi.mocked(useDesempenhoController).mockReturnValue({
    dados,
    carregando,
    erro: null,
    carregarDados: vi.fn(),
  });
}

describe("Página <DesempenhoPage />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    simularDesktop();
  });

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: matchMediaOriginal,
    });
  });

  it("deve renderizar os KPIs principais com os dados do controller", () => {
    mockarController();

    render(<DesempenhoPage />);

    expect(screen.getByText("Receita validada (Líquida)")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s*500,00/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/50 rifas/i)).toBeInTheDocument();
    expect(screen.getByText(/10 alunos/i)).toBeInTheDocument();
    expect(screen.getByText("Meta atingida")).toBeInTheDocument();
  });

  it("deve renderizar carregamento enquanto busca dados", () => {
    mockarController(true);

    render(<DesempenhoPage />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
