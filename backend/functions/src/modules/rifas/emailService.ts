// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/emailService.ts
// ============================================================================
import * as nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER || "comissao0026@gmail.com",
    pass: process.env.SMTP_PASS || "",
  },
});

interface TemplateEmailParams {
  nome: string;
  tituloCabecalho: string;
  mensagem: string;
  textoStatus: string;
  corStatus: string;
  bgStatus: string;
  bordaStatus: string;
  bilhetesHtml: string;
}

/**
 * Constrói o template HTML institucional para e-mails transacionais de compra e confirmação de rifas.
 *
 * @param {TemplateEmailParams} params - Dados da mensagem, status e bilhetes.
 * @returns {string} Código HTML completo e responsivo para envio via SMTP.
 */
const criarTemplateEmail = (params: TemplateEmailParams): string => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.tituloCabecalho}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
    
    <!-- Cabeçalho Institucional -->
    <div style="background: linear-gradient(135deg, #0B2F24 0%, #154734 100%); color: #ffffff; padding: 26px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 19px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">COMISSÃO DE FORMATURA 2026</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.85; letter-spacing: 0.3px;">Universidade Federal de Itajubá • UNIFEI</p>
    </div>

    <!-- Conteúdo Principal -->
    <div style="padding: 28px 24px;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 17px; font-weight: 700;">Olá, ${params.nome}.</h2>
      <p style="color: #334155; line-height: 1.6; font-size: 15px; margin: 10px 0 20px 0;">${params.mensagem}</p>
      
      <!-- Card de Status do Pedido -->
      <div style="margin: 20px 0; padding: 12px 16px; border-left: 4px solid ${params.corStatus}; background-color: ${params.bgStatus}; border-radius: 0 8px 8px 0; border-top: 1px solid ${params.bordaStatus}; border-right: 1px solid ${params.bordaStatus}; border-bottom: 1px solid ${params.bordaStatus};">
        <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Status do Pedido</p>
        <p style="margin: 3px 0 0 0; font-size: 14px; font-weight: 800; color: ${params.corStatus}; letter-spacing: 0.3px;">${params.textoStatus}</p>
      </div>

      <!-- Seção de Bilhetes -->
      <h3 style="color: #0f172a; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 24px 0 14px 0;">
        Bilhete(s) do Sorteio:
      </h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
        ${params.bilhetesHtml}
      </div>
    </div>

    <!-- Rodapé Corporativo -->
    <div style="background-color: #f8fafc; color: #64748b; padding: 20px 24px; text-align: center; font-size: 12px; border-top: 1px solid #e2e8f0; line-height: 1.5;">
      <p style="margin: 0; font-weight: 600; color: #334155;">Comissão de Formatura 2026</p>
      <p style="margin: 3px 0 0 0;">Mensagem automática emitida pelo Sistema Oficial de Gestão de Rifas.</p>
      <p style="margin: 3px 0 0 0;">Suporte e atendimento: <a href="mailto:comissao0026@gmail.com" style="color: #0B2F24; text-decoration: underline; font-weight: 600;">comissao0026@gmail.com</a></p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Dispara e-mail transacional institucional (recibo de reserva ou comprovante oficial aprovado).
 *
 * @param {string} emailDestino - Endereço eletrônico do comprador.
 * @param {string} nomeComprador - Nome do comprador cadastrado.
 * @param {string[]} numerosRifas - Lista de números das rifas vinculadas.
 * @param {"pendente" | "aprovado"} status - Situação do pedido ('pendente' para reserva em análise, 'aprovado' para pagamento confirmado).
 * @returns {Promise<boolean>} Verdadeiro se o e-mail foi despachado com sucesso.
 * @sideEffects Envio assíncrono de e-mail via servidor SMTP do Gmail.
 */
export const enviarEmailRecibo = async (
  emailDestino: string,
  nomeComprador: string,
  numerosRifas: string[],
  status: "pendente" | "aprovado",
): Promise<boolean> => {
  if (!emailDestino || numerosRifas.length === 0) return false;

  const primeiroNome = String(nomeComprador || "Comprador").trim().split(" ")[0];

  try {
    if (status === "pendente") {
      const assunto = "Confirmação de Reserva: Pedido de Rifas Recebido";
      const mensagem =
        "Recebemos seu pedido. Seus bilhetes foram reservados e aguardam validação da Tesouraria. Você receberá a confirmação definitiva assim que o pagamento for aprovado.";

      const bilhetesHtml = numerosRifas
        .map(
          (num) => `
        <span style="display: inline-block; background-color: #f8fafc; color: #0f172a; padding: 7px 14px; border-radius: 6px; font-weight: 700; font-size: 15px; border: 1px solid #cbd5e1; font-family: monospace, monospace;">
          Nº ${num}
        </span>
      `,
        )
        .join("");

      const html = criarTemplateEmail({
        nome: primeiroNome,
        tituloCabecalho: "Reserva de Rifas Registrada",
        mensagem,
        textoStatus: "EM ANÁLISE PELA TESOURARIA",
        corStatus: "#b45309",
        bgStatus: "#fef3c7",
        bordaStatus: "#fde68a",
        bilhetesHtml,
      });

      await transporter.sendMail({
        from: '"Comissão de Formatura 2026" <comissao0026@gmail.com>',
        to: emailDestino,
        subject: assunto,
        html,
      });

      return true;
    } else if (status === "aprovado") {
      const assunto = "Comprovante Oficial: Pagamento Confirmado e Bilhetes Emitidos";
      const mensagem =
        "Seu pagamento foi confirmado com sucesso. Seus bilhetes oficiais já estão ativos para o sorteio. Guarde este e-mail como comprovante.";

      const bilhetesHtml = numerosRifas
        .map(
          (num) => `
        <span style="display: inline-block; background-color: #ecfdf5; color: #065f46; padding: 9px 18px; border-radius: 8px; font-weight: 800; font-size: 17px; border: 2px solid #059669; font-family: monospace, monospace; letter-spacing: 0.5px;">
          Nº ${num}
        </span>
      `,
        )
        .join("");

      const html = criarTemplateEmail({
        nome: primeiroNome,
        tituloCabecalho: "Comprovante Oficial de Participação",
        mensagem,
        textoStatus: "PAGAMENTO CONFIRMADO • BILHETES ATIVOS",
        corStatus: "#047857",
        bgStatus: "#ecfdf5",
        bordaStatus: "#a7f3d0",
        bilhetesHtml,
      });

      await transporter.sendMail({
        from: '"Comissão de Formatura 2026" <comissao0026@gmail.com>',
        to: emailDestino,
        subject: assunto,
        html,
      });

      return true;
    }
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);

    return false;
  }

  return false;
};
