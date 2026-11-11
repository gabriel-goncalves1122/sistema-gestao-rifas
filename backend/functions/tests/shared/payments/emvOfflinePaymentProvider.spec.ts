// ============================================================================
// ARQUIVO: backend/functions/tests/shared/payments/emvOfflinePaymentProvider.spec.ts
// ============================================================================

import { beforeEach, describe, expect, it } from "@jest/globals";
import {
  calcularCrc16Pix,
  gerarPayloadPixEmv,
  sanitizarTextoEmv,
} from "../../../src/shared/payments/utils/emvPixUtils";
import { EmvOfflinePaymentProvider } from "../../../src/shared/payments/providers/emvOfflinePaymentProvider";
import { PaymentProviderFactory } from "../../../src/shared/payments/paymentProviderFactory";

describe("emvPixUtils (Núcleo Funcional EMV Pix)", () => {
  it("deve sanitizar texto removendo acentos e caracteres especiais", () => {
    const texto = "Comissão Formatura - Unifei 2026!";
    const sanitizado = sanitizarTextoEmv(texto, 25);
    expect(sanitizado).toBe("Comissao Formatura  Unife");
  });

  it("deve calcular o CRC16-CCITT de forma determinística", () => {
    const payloadExemplo = "00020126360014br.gov.bcb.pix011412345678901234520400005303986540510.005802BR5910TESTE NOME6007ITAJUBA62120508RIFA12346304";
    const crc = calcularCrc16Pix(payloadExemplo);
    expect(crc).toMatch(/^[0-9A-F]{4}$/);
    expect(crc.length).toBe(4);
  });

  it("deve gerar payload BR Code completo contendo tags do Banco Central", () => {
    const payload = gerarPayloadPixEmv({
      chavePix: "teste@unifei.edu.br",
      nomeBeneficiario: "Comissao 2026",
      cidadeBeneficiario: "Itajuba",
      valorCentavos: 3000,
      txid: "RIFA108A91",
    });

    expect(payload).toContain("000201"); // Format indicator
    expect(payload).toContain("br.gov.bcb.pix"); // GUI
    expect(payload).toContain("teste@unifei.edu.br"); // Chave
    expect(payload).toContain("540530.00"); // Valor R$ 30,00
    expect(payload).toContain("5802BR"); // País
    expect(payload).toContain("RIFA108A91"); // txid
    expect(payload).toMatch(/6304[0-9A-F]{4}$/); // Tag final CRC16
  });
});

describe("EmvOfflinePaymentProvider", () => {
  it("deve criar cobrança offline com orderId e QR Code em Base64", async () => {
    const provider = new EmvOfflinePaymentProvider();
    const cobranca = await provider.criarCobranca({
      referenceId: "ref_compra_987",
      nome: "Carlos Silva",
      telefone: "35999998888",
      email: "carlos@gmail.com",
      documento: "12345678909",
      numerosRifas: ["00100", "00101"],
      valorCentavos: 2000,
      expirationDate: new Date(Date.now() + 3600000).toISOString(),
    });

    expect(cobranca.orderId).toContain("RIFA");
    expect(cobranca.status).toBe("WAITING");
    expect(cobranca.copiaECola).toContain("br.gov.bcb.pix");
    expect(cobranca.qrCodeBase64).toBeDefined();
    expect(typeof cobranca.qrCodeBase64).toBe("string");
    expect(cobranca.qrCodeBase64!.length).toBeGreaterThan(100);
  });

  it("deve consultar e cancelar sem falhas no modo offline", async () => {
    const provider = new EmvOfflinePaymentProvider();
    const consulta = await provider.consultarCobranca("RIFA_TESTE");
    expect(consulta?.status).toBe("WAITING");

    await expect(provider.cancelarCobranca("RIFA_TESTE")).resolves.toBeUndefined();
  });
});

describe("PaymentProviderFactory", () => {
  beforeEach(() => {
    PaymentProviderFactory.resetarParaTestes();
  });

  it("deve fornecer EmvOfflinePaymentProvider quando configurado explicitamente", () => {
    process.env.MODO_PAGAMENTO_PROVIDER = "EMV_OFFLINE";
    const provider = PaymentProviderFactory.obterProvedor();
    expect(provider).toBeInstanceOf(EmvOfflinePaymentProvider);
    delete process.env.MODO_PAGAMENTO_PROVIDER;
  });

  it("deve fornecer MercadoPagoPaymentProvider quando MODO_PAGAMENTO_PROVIDER for MERCADOPAGO_API", () => {
    process.env.MODO_PAGAMENTO_PROVIDER = "MERCADOPAGO_API";
    const provider = PaymentProviderFactory.obterProvedor();
    expect(provider.constructor.name).toBe("MercadoPagoPaymentProvider");
    delete process.env.MODO_PAGAMENTO_PROVIDER;
  });
});
