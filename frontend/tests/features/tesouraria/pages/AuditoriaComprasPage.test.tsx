import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuditoriaComprasPage } from "@/features/tesouraria/pages/AuditoriaComprasPage";
import { auditoriaComprasService } from "@/features/tesouraria/services/auditoriaComprasService";

vi.mock("@/shared/hooks/useDebounce", () => ({
  useDebounce: vi.fn((val) => val),
}));

vi.mock("@/features/tesouraria/services/auditoriaComprasService", () => ({
  auditoriaComprasService: {
    buscarHistoricoDetalhado: vi.fn(),
    atualizarComprador: vi.fn(),
    reenviarEmailComprovante: vi.fn(),
  },
}));

const matchMediaOriginal = window.matchMedia;

function simularViewport(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
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

const historicoMock = [
  {
    id: "comprador_maria",
    vendedorId: "aderido_ana",
    vendedorNome: "Ana Vendedora",
    vendedorCpf: "11122233344",
    compradorId: "comprador_maria",
    compradorNome: "Maria Souza",
    compradorEmail: "maria@teste.com",
    compradorTelefone: "35999990000",
    dataReserva: "2026-05-01T10:00:00.000-03:00",
    dataPagamento: "2026-05-02T10:00:00.000-03:00",
    status: "pago",
    comprovanteUrl: "https://storage.mock/comprovante-maria.png",
    bilhetes: ["001", "002"],
    valorTotal: 20,
  },
  {
    id: "comprador_joao",
    vendedorId: "aderido_bruno",
    vendedorNome: "Bruno Vendedor",
    vendedorCpf: "55566677788",
    compradorId: "comprador_joao",
    compradorNome: "João Lima",
    compradorEmail: "joao@teste.com",
    compradorTelefone: "35988887777",
    dataReserva: "2026-05-10T10:00:00.000-03:00",
    dataPagamento: "-",
    status: "pendente",
    comprovanteUrl: null,
    bilhetes: ["003"],
    valorTotal: 10,
  },
];

describe("Página <AuditoriaComprasPage />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    simularViewport(false);

    vi.mocked(
      auditoriaComprasService.buscarHistoricoDetalhado,
    ).mockResolvedValue(historicoMock);
    vi.mocked(auditoriaComprasService.atualizarComprador).mockResolvedValue({
      sucesso: true,
    });
    vi.mocked(
      auditoriaComprasService.reenviarEmailComprovante,
    ).mockResolvedValue({
      sucesso: true,
      mensagem: "E-mail de comprovante reenviado.",
      envio: {
        comprador_id: "comprador_maria",
        email: "maria@teste.com",
        rifas: ["001", "002"],
        status: "aprovado",
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: matchMediaOriginal,
    });
  });

  it("Deve renderizar auditoria, resumo e compras agrupadas", async () => {
    render(<AuditoriaComprasPage />);

    expect(await screen.findByText("Auditoria de compras")).toBeInTheDocument();
    expect(screen.getByText(/sem alterar vínculos da venda/i)).toBeInTheDocument();
    expect(screen.getByText("Compras")).toBeInTheDocument();
    expect(screen.getAllByText("Maria Souza").length).toBeGreaterThan(0);
    expect(screen.getAllByText("(35) 99999-0000").length).toBeGreaterThan(0);
    expect(screen.queryByText(/ID: comprador_maria/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("002").length).toBeGreaterThan(0);

    // Apenas a compra pendente (João Lima) deve exibir o botão 'Recusar compra', protegendo a compra já paga (Maria Souza)
    expect(screen.getAllByRole("button", { name: /recusar compra/i })).toHaveLength(1);
  });

  it("Deve filtrar por busca textual e status", async () => {
    render(<AuditoriaComprasPage />);

    const busca = await screen.findByPlaceholderText(
      /buscar comprador, cpf, e-mail, telefone ou rifa/i,
    );

    fireEvent.change(busca, { target: { value: "003" } });

    expect(screen.getAllByText("João Lima").length).toBeGreaterThan(0);
    expect(screen.queryByText("Maria Souza")).not.toBeInTheDocument();

    fireEvent.change(busca, { target: { value: "" } });
    fireEvent.click(screen.getByText("Pendentes"));

    expect(screen.getAllByText("João Lima").length).toBeGreaterThan(0);
    expect(screen.queryByText("Maria Souza")).not.toBeInTheDocument();
  });

  it("Deve mostrar estado vazio e manter ações futuras desabilitadas", async () => {
    render(<AuditoriaComprasPage />);

    const busca = await screen.findByPlaceholderText(
      /buscar comprador, cpf, e-mail, telefone ou rifa/i,
    );

    fireEvent.change(busca, { target: { value: "compra inexistente" } });

    expect(screen.getByText("Nenhuma compra encontrada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /exportar csv/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /exportar comprovantes/i }),
    ).toBeDisabled();
  });

  it("Deve renderizar filtros mobile recolhíveis e cards de compra", async () => {
    simularViewport(true);

    render(<AuditoriaComprasPage />);

    expect(await screen.findByPlaceholderText(/buscar compra, rifa ou contato/i))
      .toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /abrir filtros de auditoria/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("João Lima").length).toBeGreaterThan(0);
    expect(screen.queryByText("Sem comprovante")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /abrir filtros de auditoria/i }),
    );

    expect(screen.getByLabelText("Início")).toBeInTheDocument();
    expect(screen.getByLabelText("Fim")).toBeInTheDocument();
  });

  it("Deve abrir detalhes, editar comprador e visualizar comprovante", async () => {
    const detalhes = render(<AuditoriaComprasPage />);

    await screen.findByText("Auditoria de compras");

    fireEvent.click(screen.getAllByRole("button", { name: /ver detalhes/i })[0]);
    expect(screen.getByText("Detalhes da compra")).toBeInTheDocument();
    expect(screen.queryByText("Campos bloqueados")).not.toBeInTheDocument();

    detalhes.unmount();

    const edicao = render(<AuditoriaComprasPage />);

    await screen.findByText("Auditoria de compras");

    fireEvent.click(screen.getAllByRole("button", { name: /editar comprador/i })[0]);

    expect(screen.getByText("Editar dados do comprador")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /nome do comprador/i }),
    ).toHaveValue("Maria Souza");
    expect(screen.queryByText("Dados editáveis")).not.toBeInTheDocument();
    expect(screen.queryByText("Campos bloqueados")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: /nome do comprador/i }), {
      target: { value: "Maria Atualizada" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /e-mail do comprador/i }), {
      target: { value: "maria.atualizada@teste.com" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /telefone do comprador/i }), {
      target: { value: "35977776666" },
    });

    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(auditoriaComprasService.atualizarComprador).toHaveBeenCalledWith(
        "comprador_maria",
        {
          nome: "Maria Atualizada",
          email: "maria.atualizada@teste.com",
          telefone: "35977776666",
        },
      );
    });

    edicao.unmount();

    render(<AuditoriaComprasPage />);

    await screen.findByText("Auditoria de compras");

    const botaoComprovanteHabilitado = screen
      .getAllByRole("button", { name: /ver comprovante/i })
      .find((botao) => !botao.hasAttribute("disabled"));

    expect(botaoComprovanteHabilitado).toBeDefined();
    fireEvent.click(botaoComprovanteHabilitado!);

    expect(screen.getByAltText("Comprovante Pix")).toBeInTheDocument();
  }, 15000);

  it("Deve reenviar e-mail de comprovante apenas para compra paga com e-mail", async () => {
    let resolverEnvio: (valor: any) => void = () => {};
    vi.mocked(
      auditoriaComprasService.reenviarEmailComprovante,
    ).mockReturnValueOnce(
      new Promise((resolve) => {
        resolverEnvio = resolve;
      }),
    );

    render(<AuditoriaComprasPage />);

    await screen.findByText("Auditoria de compras");

    const botoesEmail = screen.getAllByRole("button", {
      name: /reenviar e-mail/i,
    });
    const botaoHabilitado = botoesEmail.find(
      (botao) => !botao.hasAttribute("disabled"),
    );
    const botoesDesabilitados = botoesEmail.filter((botao) =>
      botao.hasAttribute("disabled"),
    );

    expect(botaoHabilitado).toBeDefined();
    expect(botoesDesabilitados.length).toBeGreaterThan(0);

    fireEvent.click(botaoHabilitado!);

    await waitFor(() => {
      expect(botaoHabilitado).toBeDisabled();
    });
    expect(
      auditoriaComprasService.reenviarEmailComprovante,
    ).toHaveBeenCalledWith("comprador_maria");

    resolverEnvio({
      sucesso: true,
      mensagem: "E-mail de comprovante reenviado.",
      envio: {
        comprador_id: "comprador_maria",
        email: "maria@teste.com",
        rifas: ["001", "002"],
        status: "aprovado",
      },
    });

    expect(
      await screen.findByText("E-mail de comprovante reenviado."),
    ).toBeInTheDocument();
  });
});
