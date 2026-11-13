// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/checkout/pixNormalCheckoutStrategy.spec.ts
// ============================================================================

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../../src/modules/rifas/helpers/usuarioRifasHelper", () => ({
  obterContextoAderidoPorEmail: jest.fn(),
}));
jest.mock("../../../src/modules/rifas/emailService", () => ({
  enviarEmailRecibo: jest.fn().mockResolvedValue(true as never),
}));

import { obterContextoAderidoPorEmail } from "../../../src/modules/rifas/helpers/usuarioRifasHelper";
import { PixNormalCheckoutStrategy } from "../../../src/modules/tesouraria/checkout/strategies/pixNormalCheckoutStrategy";
import { CheckoutPixRepository } from "../../../src/modules/tesouraria/checkout/repositories/checkoutPixRepository";
import { IPaymentProvider } from "../../../src/shared/payments/types/paymentProviderTypes";

describe("PixNormalCheckoutStrategy", () => {
  let mockRepo: jest.Mocked<CheckoutPixRepository>;
  let mockProvider: jest.Mocked<IPaymentProvider>;
  let strategy: PixNormalCheckoutStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    (obterContextoAderidoPorEmail as jest.Mock<any>).mockResolvedValue({
      idAderido: "ADERIDO_1",
      vendedorNome: "Vendedor",
      vendedorCpf: "12345678909",
    });

    mockRepo = {
      obterPagamentoAtivoPorLock: jest.fn().mockResolvedValue(null as never),
      verificarDisponibilidadeRifas: jest.fn().mockResolvedValue(undefined as never),
      reservarBilhetesAtomicamente: jest.fn().mockResolvedValue({
        existente: null,
        compradorId: "COMP_1",
        pagamentoId: "PAG_1",
        referenceId: "rifas-pix-COMP_1",
      } as never),
      persistirCobrancaGerada: jest.fn().mockResolvedValue(undefined as never),
      cancelarPagamentoLocal: jest.fn(),
      aplicarEventoPagamento: jest.fn(),
      registrarConfirmacaoEnvio: jest.fn(),
    } as unknown as jest.Mocked<CheckoutPixRepository>;

    mockProvider = {
      modo: "EMV_OFFLINE",
      criarCobranca: jest.fn().mockResolvedValue({
        orderId: "RIFA_TX_1",
        copiaECola: "000201_BR_CODE",
        qrCodeBase64: "base64_qr",
        qrCodeImagemUrl: "data:image/png;base64,base64_qr",
        status: "WAITING",
        rawResponse: { geradoOffline: true },
      } as never),
      consultarCobranca: jest.fn(),
      consultarEventoStatus: jest.fn(),
      cancelarCobranca: jest.fn(),
    };

    strategy = new PixNormalCheckoutStrategy(mockRepo, mockProvider);
  });

  it("deve criar checkout Pix Normal sem exigir CPF nem e-mail", async () => {
    const resposta = await strategy.criarCheckout("uid_1", "aderido@unifei.edu.br", {
      nome: "Comprador Local",
      telefone: "35999990000",
      numerosRifas: ["010"],
    });

    expect(resposta.id).toBe("PAG_1");
    expect(resposta.copiaECola).toBe("000201_BR_CODE");
    expect(mockRepo.persistirCobrancaGerada).toHaveBeenCalledWith(
      expect.objectContaining({ provedorPagamento: "EMV_OFFLINE" }),
    );
  });

  it("deve realizar cancelamento e expiração 100% locais sem consultar ou cancelar provedor externo", async () => {
    const pagamento = {
      id: "PAG_OFF_1",
      pix_order_id: "RIFA_TX_1",
      status_pagamento_banco: "WAITING",
    } as any;

    mockRepo.cancelarPagamentoLocal.mockResolvedValue({
      pagamento,
      jaCancelado: false,
    });

    await strategy.cancelarCheckout(
      { uid: "uid_1", email: "aderido@unifei.edu.br", role: "super-admin", pagamentoId: "PAG_OFF_1" },
      pagamento,
    );
    await strategy.expirarCheckout("PAG_OFF_1", pagamento);

    expect(mockProvider.consultarEventoStatus).not.toHaveBeenCalled();
    expect(mockProvider.cancelarCobranca).not.toHaveBeenCalled();
    expect(mockRepo.cancelarPagamentoLocal).toHaveBeenCalledTimes(2);
  });

  it("deve expirar pagamento mesmo quando pix_order_id estiver ausente (CRIANDO)", async () => {
    const pagamentoSemOrderId = {
      id: "PAG_SEM_ORDER",
      pix_order_id: null,
      status_pagamento_banco: "CRIANDO",
    } as any;

    mockRepo.cancelarPagamentoLocal.mockResolvedValueOnce({
      pagamento: pagamentoSemOrderId,
      jaCancelado: false,
    });

    await expect(
      strategy.expirarCheckout("PAG_SEM_ORDER", pagamentoSemOrderId),
    ).resolves.not.toThrow();

    expect(mockRepo.cancelarPagamentoLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        pagamentoId: "PAG_SEM_ORDER",
        reterReserva: false,
      }),
    );
  });

  it("deve retornar false ao sincronizar pois não depende de gateway externo", async () => {
    const sincronizado = await strategy.sincronizarCheckout({
      id: "PAG_OFF_1",
      pix_order_id: "RIFA_TX_1",
    } as any);

    expect(sincronizado).toBe(false);
    expect(mockProvider.consultarEventoStatus).not.toHaveBeenCalled();
    expect(mockRepo.aplicarEventoPagamento).not.toHaveBeenCalled();
  });

  it("deve permitir confirmação manual de envio de comprovante", async () => {
    mockRepo.registrarConfirmacaoEnvio.mockResolvedValueOnce({
      numerosRifas: ["010"],
      compradorEmail: "comprador@teste.com",
      compradorNome: "Comprador Local",
    });

    const resultado = await strategy.confirmarEnvioComprovante({
      uid: "uid_1",
      emailLogado: "aderido@unifei.edu.br",
      pagamentoId: "PAG_OFF_1",
      comprovanteUrl: "https://storage.mock/comp.png",
    });

    expect(resultado).toEqual({
      sucesso: true,
      pagamentoId: "PAG_OFF_1",
      rifas: ["010"],
    });
  });
});
