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
    confirmarEnvioPix: vi.fn(),
  },
}));

vi.mock("@/shared/services/storageService", () => ({
  storageService: {
    uploadComprovante: vi.fn().mockResolvedValue("comprovantes/123_recibo.png"),
  },
}));

vi.mock("@/shared/utils/validadorComprovante", () => ({
  validarArquivoComprovante: vi.fn().mockResolvedValue({
    valido: true,
    mimeDetectado: "image/png",
    hashSha256: "hash123",
    ehPdf: false,
  }),
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

  describe("Modo Nova API (Pix Rápido / Chave InfinitePay)", () => {
    it("Deve renderizar por padrão o modo Nova API sem campo de CPF e com e-mail opcional", () => {
      render(
        <CheckoutModal
          invalidarDadosPainel={vi.fn()}
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          numerosRifas={["001"]}
        />,
      );

      expect(screen.getByText(/Chave Pix da Comissão/i)).toBeInTheDocument();
      expect(screen.getByTestId("checkout-nome")).toBeInTheDocument();
      expect(screen.getByTestId("checkout-telefone")).toBeInTheDocument();
      expect(screen.getByTestId("checkout-email")).toBeInTheDocument();
      expect(screen.queryByTestId("checkout-documento")).not.toBeInTheDocument();
    });

    it("Deve validar apenas Nome e Telefone na Nova API, sem exigir CPF", async () => {
      render(
        <CheckoutModal
          invalidarDadosPainel={vi.fn()}
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          numerosRifas={["001"]}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /gerar pagamento/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Informe o nome completo do comprador/i),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Informe o WhatsApp do comprador/i),
        ).toBeInTheDocument();
      });

      expect(
        screen.queryByText(/Informe o CPF ou CNPJ/i),
      ).not.toBeInTheDocument();
      expect(checkoutPixService.criarCobrancaPix).not.toHaveBeenCalled();
    });

    it("Deve gerar Pix rápido apenas com Nome e WhatsApp", async () => {
      vi.mocked(checkoutPixService.criarCobrancaPix).mockResolvedValueOnce({
        id: "pix_rapido_01",
        status: "aguardando_pagamento",
        copiaECola: "000201PIXINFINITEPAYRAPIDO",
        expiraEm: null,
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
        target: { value: "Lucas Silva" },
      });
      fireEvent.change(screen.getByTestId("checkout-telefone"), {
        target: { value: "35999998888" },
      });

      fireEvent.click(screen.getByRole("button", { name: /gerar pagamento/i }));

      await waitFor(() => {
        expect(checkoutPixService.criarCobrancaPix).toHaveBeenCalledWith(
          expect.objectContaining({
            nome: "Lucas Silva",
            telefone: "(35) 99999-8888",
            numerosRifas: ["001"],
          }),
        );
      });

      expect(
        await screen.findByText("000201PIXINFINITEPAYRAPIDO"),
      ).toBeInTheDocument();
    });

    it("Não deve exibir opção de Mercado Pago nem campo de CPF, mantendo apenas InfinitePay", () => {
      render(
        <CheckoutModal
          invalidarDadosPainel={vi.fn()}
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          numerosRifas={["001"]}
        />,
      );

      expect(
        screen.queryByRole("button", { name: /mercado pago/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /pix chave rápida/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Pix Dinâmico Automático/i),
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("checkout-documento")).not.toBeInTheDocument();
      expect(
        screen.getByText(/Chave Pix da Comissão \(InfinitePay\)/i),
      ).toBeInTheDocument();
    });
  });

  describe("Ciclo de vida da máquina de estados no fluxo InfinitePay", () => {
    it("Deve exibir QR Code e Copia-e-Cola após gerar pagamento no fluxo InfinitePay", async () => {
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

      fireEvent.click(screen.getByRole("button", { name: /gerar pagamento/i }));

      await waitFor(() => {
        expect(checkoutPixService.criarCobrancaPix).toHaveBeenCalledWith(
          expect.objectContaining({
            nome: "Ana Beatriz",
            telefone: "(35) 99999-8888",
            email: "ana@email.com",
            numerosRifas: ["001", "002"],
            sessaoCheckoutId: expect.any(String),
          }),
        );
      });

      expect(await screen.findByText("000201PIXTESTE")).toBeInTheDocument();
      expect(screen.getByAltText("QR Code Pix")).toBeInTheDocument();
      expect(screen.getByText(/Pagamento gerado/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /pagamento gerado/i }),
      ).toBeInTheDocument();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("Deve abrir confirmação ao fechar pelo X em aguardando_pagamento e cancelar no backend ao confirmar", async () => {
      vi.mocked(checkoutPixService.criarCobrancaPix).mockResolvedValueOnce({
        id: "pix_ativo_whatsapp",
        status: "aguardando_pagamento",
        qrCodeBase64: "base64-qr-code",
        copiaECola: "000201PIXWHATSAPP",
        expiraEm: "2030-01-01T12:00:00.000Z",
      });
      vi.mocked(checkoutPixService.cancelarCobrancaPix).mockResolvedValueOnce(undefined as any);

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

      fireEvent.click(screen.getByRole("button", { name: /gerar pagamento/i }));

      expect(await screen.findByText("000201PIXWHATSAPP")).toBeInTheDocument();

      const btnFecharModal = screen.getByRole("button", {
        name: /fechar modal de venda/i,
      });
      fireEvent.click(btnFecharModal);

      expect(screen.getByText("Cancelar cobrança Pix?")).toBeInTheDocument();

      const btnConfirmarCancelamento = screen.getByRole("button", {
        name: /Cancelar e Liberar/i,
      });
      fireEvent.click(btnConfirmarCancelamento);

      await waitFor(() => {
        expect(checkoutPixService.cancelarCobrancaPix).toHaveBeenCalledWith(
          "pix_ativo_whatsapp",
          false,
        );
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it("Deve mostrar indisponibilidade quando o endpoint retornar erro HTTP 404", async () => {
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

      fireEvent.change(screen.getByTestId("checkout-nome"), {
        target: { value: "Ana" },
      });
      fireEvent.change(screen.getByTestId("checkout-telefone"), {
        target: { value: "35999998888" },
      });

      fireEvent.click(screen.getByRole("button", { name: /gerar pagamento/i }));

      expect(await screen.findByText("000201PIXTESTE")).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
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

      const btnFechar = screen.getByRole("button", { name: /Concluir Venda/i });
      fireEvent.click(btnFechar);

      expect(mockOnSuccess).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("Deve disparar envio e chamar onSuccess automaticamente ao confirmar pagamento / comprovante", async () => {
      vi.mocked(checkoutPixService.criarCobrancaPix).mockResolvedValueOnce({
        id: "pix_123",
        status: "aguardando_pagamento",
        qrCodeBase64: "base64-qr-code",
        copiaECola: "000201PIXTESTE",
        expiraEm: "2030-01-01T12:00:00.000Z",
      });
      vi.mocked(checkoutPixService.confirmarEnvioPix).mockResolvedValueOnce({
        sucesso: true,
        pagamentoId: "pix_123",
        rifas: ["001"],
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
        target: { value: "Gabriel" },
      });
      fireEvent.change(screen.getByTestId("checkout-telefone"), {
        target: { value: "35999998888" },
      });

      fireEvent.click(screen.getByRole("button", { name: /gerar pagamento/i }));

      expect(await screen.findByText("000201PIXTESTE")).toBeInTheDocument();

      const btnEnviar = screen.getByRole("button", {
        name: /Enviar Comprovante para Análise/i,
      });
      // Inicialmente desabilitado sem comprovante
      expect(btnEnviar).toBeDisabled();

      // Simula seleção de arquivo de comprovante
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();

      const fakeFile = new File(["dummy content"], "comprovante.png", {
        type: "image/png",
      });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [fakeFile] } });
      });

      await waitFor(() => {
        expect(btnEnviar).not.toBeDisabled();
      });

      fireEvent.click(btnEnviar);

      await waitFor(() => {
        expect(checkoutPixService.confirmarEnvioPix).toHaveBeenCalledWith(
          "pix_123",
          "comprovantes/123_recibo.png",
          "hash123",
        );
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it("Deve descartar cobrança Pix antiga do localStorage quando abrir o modal com outras rifas selecionadas", async () => {
      localStorage.setItem(
        "@aderidos:checkout_cobranca_pix",
        JSON.stringify({
          id: "pix_antigo_999",
          status: "aguardando_pagamento",
          copiaECola: "000201PIXANTIGO999",
          numerosRifas: ["099"],
          expiraEm: "2030-01-01T12:00:00.000Z",
        }),
      );

      render(
        <CheckoutModal
          invalidarDadosPainel={vi.fn()}
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          numerosRifas={["001", "002"]}
        />,
      );

      await waitFor(() => {
        expect(screen.queryByText("000201PIXANTIGO999")).not.toBeInTheDocument();
      });
      expect(screen.getByText(/20,00/i)).toBeInTheDocument();
      expect(screen.queryByText(/#099/i)).not.toBeInTheDocument();
    });
  });
});
