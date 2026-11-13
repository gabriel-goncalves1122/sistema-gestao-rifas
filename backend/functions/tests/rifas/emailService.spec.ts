// ============================================================================
// ARQUIVO: backend/functions/tests/rifas/emailService.spec.ts
// ============================================================================

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockSendMail = jest.fn<any>();
const mockCreateTransport = jest.fn<any>(() => ({
  sendMail: mockSendMail,
}));

jest.mock("nodemailer", () => ({
  createTransport: mockCreateTransport,
}));

import { enviarEmailRecibo } from "../../src/modules/rifas/emailService";

describe("EmailService - enviarEmailRecibo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SMTP_PASS = "senha_app_teste";
    process.env.SMTP_USER = "comissao0026@gmail.com";
  });

  it("deve limpar espaços/maiúsculas do e-mail e enviar versão texto e HTML para status pendente", async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: "msg_1" });

    const enviado = await enviarEmailRecibo(
      "  Maria.Silva@Gmail.COM  ",
      "Maria <script>",
      ["00012", "00013"],
      "pendente",
    );

    expect(enviado).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.to).toBe("maria.silva@gmail.com");
    expect(mailOptions.from).toContain("comissao0026@gmail.com");
    expect(mailOptions.replyTo).toBe("comissao0026@gmail.com");
    expect(mailOptions.text).toContain("Nº 00012, Nº 00013");
    expect(mailOptions.html).toContain("Olá, Maria.");
    expect(mailOptions.html).not.toContain("<script>");
  });

  it("deve enviar comprovante com versão texto e HTML para status aprovado", async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: "msg_2" });

    const enviado = await enviarEmailRecibo(
      "lucas@unifei.edu.br",
      "Lucas",
      ["00099"],
      "aprovado",
    );

    expect(enviado).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.subject).toContain("confirmados");
    expect(mailOptions.text).toContain("Pagamento confirmado");
    expect(mailOptions.html).toContain("Nº 00099");
  });

  it("deve rejeitar silenciosamente sem chamar SMTP quando e-mail for inválido ou sem bilhetes", async () => {
    expect(await enviarEmailRecibo("email-invalido", "Ana", ["00001"], "pendente")).toBe(false);
    expect(await enviarEmailRecibo("ana@gmail.com", "Ana", [], "aprovado")).toBe(false);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("deve realizar retry automático em erro transitório (ETIMEDOUT) e retornar true se recuperar", async () => {
    const erroTransitorio = Object.assign(new Error("Connection timeout"), { code: "ETIMEDOUT" });
    mockSendMail
      .mockRejectedValueOnce(erroTransitorio)
      .mockResolvedValueOnce({ messageId: "msg_ok" });

    const enviado = await enviarEmailRecibo(
      "comprador@gmail.com",
      "Carlos",
      ["00005"],
      "aprovado",
    );

    expect(enviado).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(2);
  });

  it("não deve tentar novamente em erro permanente e deve retornar false", async () => {
    const erroPermanente = Object.assign(new Error("Invalid login"), { code: "EAUTH" });
    mockSendMail.mockRejectedValueOnce(erroPermanente);

    const enviado = await enviarEmailRecibo(
      "comprador@gmail.com",
      "Carlos",
      ["00005"],
      "aprovado",
    );

    expect(enviado).toBe(false);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});
