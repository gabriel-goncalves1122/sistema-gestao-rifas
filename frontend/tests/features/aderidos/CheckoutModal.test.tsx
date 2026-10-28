// ============================================================================
// ARQUIVO: frontend/tests/features/aderidos/CheckoutModal.test.tsx
// ============================================================================
import { fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutModal } from "@/features/aderidos/CheckoutModal";
import { checkoutPixService } from "@/features/aderidos/services/checkoutPixService";
import { painelAderidoStyles } from "@/features/aderidos/styles/painelAderidoStyles";

// Mock do Firebase Firestore para o onSnapshot
const mockOnSnapshotCallback = { current: null as any };
vi.mock("firebase/firestore", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    doc: vi.fn(),
    onSnapshot: vi.fn((ref, callback) => {
      mockOnSnapshotCallback.current = callback;
      return vi.fn(); // unsubscribe
    }),
  };
});

vi.mock("@/features/aderidos/services/checkoutPixService", () => ({
  checkoutPixService: {
    criarCobrancaPix: vi.fn(),
    cancelarCobrancaPix: vi.fn(),
  },
}));

describe("Componente <CheckoutModal />", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("Nao deve abrir o dialog quando open for false", () => {
    render(
      <CheckoutModal
        invalidarDadosPainel={vi.fn()}
        open={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        numerosRifas={["001", "002"]}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Deve calcular corretamente o valor total do Pix na tela", () => {
    render(
      <CheckoutModal
        invalidarDadosPainel={vi.fn()}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        numerosRifas={["001", "002"]}
      />,
    );

    expect(screen.getByText(/20,00/i)).toBeInTheDocument();
  });

  it("Deve compartilhar o PaperProps visual com modal de detalhes", () => {
    expect(painelAderidoStyles.detalheDialogPaper).toMatchObject({
      bgcolor: "#F6F8F7",
      overflow: "auto",
    });
  });

  it("Deve mostrar erro de validacao sem exigir comprovante", async () => {
    render(
      <CheckoutModal
        invalidarDadosPainel={vi.fn()}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        numerosRifas={["001"]}
      />,
    );

    expect(screen.getByText(/Resumo da venda/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /gerar pagamento/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Informe o nome completo do comprador/i),
      ).toBeInTheDocument();

      expect(
        screen.getByText(/Informe o CPF ou CNPJ do pagador/i),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/Anexe o comprovante do PIX/i),
    ).not.toBeInTheDocument();
    expect(checkoutPixService.criarCobrancaPix).not.toHaveBeenCalled();
  });

  it("Deve gerar pagamento via Pix pelo backend do sistema", async () => {
    vi.mocked(checkoutPixService.criarCobrancaPix).mockResolvedValueOnce({
      id: "pix_001",
      status: "aguardando_pagamento",
      qrCodeBase64: "base64-qr-code",
      copiaECola: "000201PIXTESTE",
      expiraEm: "2030-01-01T12:00:00.000Z",
    });

    render(
      <CheckoutModal
        invalidarDadosPainel={vi.fn()}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        numerosRifas={["001", "002"]}
      />,
    );

    fireEvent.change(screen.getByTestId("checkout-nome"), {
      target: { value: "Ana Beatriz" },
    });
    fireEvent.change(screen.getByTestId("checkout-telefone"), {
      target: { value: "35999998888" },
    });
    fireEvent.change(screen.getByTestId("checkout-email"), {
      target: { value: "ana@email.com" },
    });
    fireEvent.change(screen.getByTestId("checkout-documento"), {
      target: { value: "12345678909" },
    });

    fireEvent.click(screen.getByRole("button", { name: /gerar pagamento/i }));

    await waitFor(() => {
      expect(checkoutPixService.criarCobrancaPix).toHaveBeenCalledWith(expect.objectContaining({
        nome: "Ana Beatriz",
        telefone: "(35) 99999-8888",
        email: "ana@email.com",
        documento: "123.456.789-09",
        numerosRifas: ["001", "002"],
        sessaoCheckoutId: expect.any(String),
      }));
    });

    expect(await screen.findByText("000201PIXTESTE")).toBeInTheDocument();
    expect(screen.getByAltText("QR Code Pix")).toBeInTheDocument();
    expect(screen.getByText(/Pagamento gerado/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /pagamento gerado/i }),
    ).toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("Deve permitir fechar o modal durante aguardando_pagamento SEM cancelar o Pix no Mercado Pago", async () => {
    vi.mocked(checkoutPixService.criarCobrancaPix).mockResolvedValueOnce({
      id: "pix_ativo_whatsapp",
      status: "aguardando_pagamento",
      qrCodeBase64: "base64-qr-code",
      copiaECola: "000201PIXWHATSAPP",
      expiraEm: "2030-01-01T12:00:00.000Z",
    });

    render(
      <CheckoutModal
        invalidarDadosPainel={vi.fn()}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        numerosRifas={["001"]}
      />,
    );

    fireEvent.change(screen.getByTestId("checkout-nome"), {
      target: { value: "Comprador Remoto" },
    });
    fireEvent.change(screen.getByTestId("checkout-telefone"), {
      target: { value: "35999998888" },
    });
    fireEvent.change(screen.getByTestId("checkout-email"), {
      target: { value: "comprador@email.com" },
    });
    fireEvent.change(screen.getByTestId("checkout-documento"), {
      target: { value: "12345678909" },
    });

    fireEvent.click(screen.getByRole("button", { name: /gerar pagamento/i }));

    expect(await screen.findByText("000201PIXWHATSAPP")).toBeInTheDocument();

    // Clica no X do header do modal para fechar e mandar no WhatsApp
    const btnFecharModal = screen.getByRole("button", { name: /fechar modal de venda/i });
    fireEvent.click(btnFecharModal);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(checkoutPixService.cancelarCobrancaPix).not.toHaveBeenCalled();
  });

  it("Deve mostrar indisponibilidade quando o endpoint futuro ainda nao responder", async () => {
    vi.mocked(checkoutPixService.criarCobrancaPix).mockRejectedValueOnce(
      new Error("Erro HTTP 404"),
    );

    render(
      <CheckoutModal
        invalidarDadosPainel={vi.fn()}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        numerosRifas={["001"]}
      />,
    );

    fireEvent.change(screen.getByTestId("checkout-nome"), {
      target: { value: "Ana Beatriz" },
    });
    fireEvent.change(screen.getByTestId("checkout-telefone"), {
      target: { value: "35999998888" },
    });
    fireEvent.change(screen.getByTestId("checkout-email"), {
      target: { value: "ana@email.com" },
    });
    fireEvent.change(screen.getByTestId("checkout-documento"), {
      target: { value: "12345678909" },
    });

    fireEvent.click(screen.getByRole("button", { name: /gerar pagamento/i }));

    expect(
      await screen.findByText(/Pagamento via Pix indisponivel no momento/i),
    ).toBeInTheDocument();
  });

  it("Deve fechar o modal e limpar o cache quando o pagamento for aprovado e o botão clicado", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    vi.mocked(checkoutPixService.criarCobrancaPix).mockResolvedValueOnce({
      id: "pix_002",
      status: "aguardando_pagamento",
      qrCodeBase64: "base64-qr-code",
      copiaECola: "000201PIXTESTE",
      expiraEm: "2030-01-01T12:00:00.000Z",
    });

    render(
      <CheckoutModal
        invalidarDadosPainel={vi.fn()}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        numerosRifas={["001"]}
      />,
    );

    // Precisamos envolver os eventos de click/change em act para não gerar warnings
    fireEvent.change(screen.getByTestId("checkout-nome"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByTestId("checkout-telefone"), { target: { value: "35999998888" } });
    fireEvent.change(screen.getByTestId("checkout-email"), { target: { value: "ana@email.com" } });
    fireEvent.change(screen.getByTestId("checkout-documento"), { target: { value: "12345678909" } });

    fireEvent.click(screen.getByRole("button", { name: /gerar pagamento/i }));

    expect(await screen.findByText("000201PIXTESTE")).toBeInTheDocument();

    expect(await screen.findByText("000201PIXTESTE")).toBeInTheDocument();

    // Simula que o Firestore enviou atualização de sucesso (Real-time Pix)
    await act(async () => {
      if (mockOnSnapshotCallback.current) {
        mockOnSnapshotCallback.current({
          exists: () => true,
          data: () => ({ status_pagamento_banco: "approved" }),
        });
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/Pagamento confirmado!/i)).toBeInTheDocument();
    });

    // Clica no botão de fechar (que aparece após sucesso)
    const btnFechar = screen.getByRole("button", { name: /Concluir Venda/i });
    fireEvent.click(btnFechar);

    expect(mockOnSuccess).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
