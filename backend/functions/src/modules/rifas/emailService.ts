// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/emailService.ts
// ============================================================================
import * as nodemailer from "nodemailer";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODIGOS_ERRO_TRANSITORIOS = new Set(["ETIMEDOUT", "ECONNRESET", "ESOCKET", "ECONNECTION"]);
const CODIGOS_SMTP_TRANSITORIOS = new Set([421, 450, 451, 454]);
const MAX_TENTATIVAS_ENVIO = 3;
const ATRASO_BASE_RETRY_MS = 800;

let transporterInstancia: nodemailer.Transporter | null = null;

/**
 * Obtém o endereço de e-mail remetente configurado no ambiente ou o padrão institucional.
 *
 * @returns {string} Endereço de e-mail sanitizado do remetente.
 */
function obterRemetente(): string {
  return String(process.env.SMTP_USER || "comissao0026@gmail.com").trim();
}

/**
 * Retorna (e inicializa sob demanda) o transporter SMTP do Nodemailer com pool e rate-limit
 * configurados para evitar bloqueios em rajadas e timeouts em Cloud Functions.
 *
 * @returns {nodemailer.Transporter} Instância reutilizável do transporter SMTP.
 */
function obterTransporter(): nodemailer.Transporter {
  if (!transporterInstancia) {
    transporterInstancia = nodemailer.createTransport({
      service: "gmail",
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      rateDelta: 1000,
      rateLimit: 3,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: obterRemetente(),
        pass: process.env.SMTP_PASS || "",
      },
    });
  }
  return transporterInstancia;
}

/**
 * Normaliza e valida um endereço de e-mail para envio SMTP.
 *
 * @param {string} email - Endereço de e-mail bruto.
 * @returns {string | null} E-mail limpo em minúsculas ou `null` se inválido.
 */
function limparEValidarEmail(email?: string | null): string | null {
  const limpo = String(email || "").trim().toLowerCase();
  if (!limpo || !EMAIL_REGEX.test(limpo)) {
    return null;
  }
  return limpo;
}

/**
 * Escapa caracteres especiais de HTML para prevenir quebra de layout ou injeção no template.
 *
 * @param {string} texto - Texto bruto a ser interpolado no HTML.
 * @returns {string} Texto seguro para renderização em HTML.
 */
function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Identifica se um erro SMTP/rede é transitório e elegível para nova tentativa.
 *
 * @param {any} erro - Erro lançado pelo Nodemailer.
 * @returns {boolean} `true` se o erro for temporário (timeout, reset ou rate-limit SMTP 4xx).
 */
function ehErroTransitorio(erro: any): boolean {
  const code = String(erro?.code || "").toUpperCase();
  const responseCode = Number(erro?.responseCode || 0);
  return CODIGOS_ERRO_TRANSITORIOS.has(code) || CODIGOS_SMTP_TRANSITORIOS.has(responseCode);
}

/**
 * Aguarda um intervalo assíncrono em milissegundos para backoff entre tentativas SMTP.
 *
 * @param {number} ms - Tempo de espera em milissegundos.
 * @returns {Promise<void>}
 */
function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TemplateEmailParams {
  nome: string;
  tituloCabecalho: string;
  mensagem: string;
  textoStatus: string;
  corStatus: string;
  bgStatus: string;
  bordaStatus: string;
  bilhetesHtml: string;
  remetente: string;
}

/**
 * Constrói o template HTML institucional para e-mails transacionais de compra e confirmação de rifas.
 * Evita propriedades CSS incompatíveis com clientes de e-mail tradicionais e excesso de caixa alta.
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
  <title>${escaparHtml(params.tituloCabecalho)}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
    
    <!-- Cabeçalho Institucional -->
    <div style="background-color: #0B2F24; color: #ffffff; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.3px;">Comissão de Formatura 2026</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #cbd5e1;">Universidade Federal de Itajubá • UNIFEI</p>
    </div>

    <!-- Conteúdo Principal -->
    <div style="padding: 28px 24px;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 17px; font-weight: 700;">Olá, ${escaparHtml(params.nome)}.</h2>
      <p style="color: #334155; line-height: 1.6; font-size: 15px; margin: 10px 0 20px 0;">${escaparHtml(params.mensagem)}</p>
      
      <!-- Card de Status do Pedido -->
      <div style="margin: 20px 0; padding: 12px 16px; border-left: 4px solid ${params.corStatus}; background-color: ${params.bgStatus}; border-radius: 0 8px 8px 0; border-top: 1px solid ${params.bordaStatus}; border-right: 1px solid ${params.bordaStatus}; border-bottom: 1px solid ${params.bordaStatus};">
        <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.4px;">Status do pedido</p>
        <p style="margin: 3px 0 0 0; font-size: 14px; font-weight: 700; color: ${params.corStatus};">${escaparHtml(params.textoStatus)}</p>
      </div>

      <!-- Seção de Bilhetes -->
      <h3 style="color: #0f172a; font-size: 13px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 24px 0 14px 0;">
        Bilhete(s) vinculados ao pedido:
      </h3>
      <div style="margin-bottom: 8px;">
        ${params.bilhetesHtml}
      </div>
    </div>

    <!-- Rodapé Corporativo -->
    <div style="background-color: #f8fafc; color: #64748b; padding: 20px 24px; text-align: center; font-size: 12px; border-top: 1px solid #e2e8f0; line-height: 1.5;">
      <p style="margin: 0; font-weight: 600; color: #334155;">Comissão de Formatura 2026</p>
      <p style="margin: 3px 0 0 0;">Mensagem automática enviada pelo Sistema de Gestão de Rifas.</p>
      <p style="margin: 3px 0 0 0;">Dúvidas ou atendimento: <a href="mailto:${escaparHtml(params.remetente)}" style="color: #0B2F24; text-decoration: underline; font-weight: 600;">${escaparHtml(params.remetente)}</a></p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Constrói a versão em texto puro (`text/plain`) equivalente ao e-mail HTML,
 * essencial para entregabilidade (evita penalização por filtros anti-spam de e-mails HTML-only).
 *
 * @param {object} params - Dados do destinatário, status e bilhetes.
 * @returns {string} Conteúdo formatado em texto puro.
 */
function criarTextoPlanoEmail(params: {
  nome: string;
  mensagem: string;
  textoStatus: string;
  numerosRifas: string[];
  remetente: string;
}): string {
  const listaRifas = params.numerosRifas.map((num) => `Nº ${num}`).join(", ");
  return [
    "Comissão de Formatura 2026 - UNIFEI",
    "",
    `Olá, ${params.nome}.`,
    "",
    params.mensagem,
    "",
    `Status do pedido: ${params.textoStatus}`,
    `Bilhete(s): ${listaRifas}`,
    "",
    "---",
    "Mensagem automática enviada pelo Sistema de Gestão de Rifas.",
    `Dúvidas ou atendimento: ${params.remetente}`,
  ].join("\n");
}

/**
 * Executa o disparo SMTP com retentativas automáticas em caso de falhas transitórias de rede ou rate-limit.
 *
 * @param {nodemailer.SendMailOptions} mailOptions - Opções completas da mensagem.
 * @param {string} status - Status do pedido para rastreabilidade em logs.
 * @returns {Promise<boolean>} `true` se enviado com sucesso, `false` se falhou após as tentativas.
 */
async function enviarComRetry(
  mailOptions: nodemailer.SendMailOptions,
  status: string,
): Promise<boolean> {
  const transporter = obterTransporter();

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_ENVIO; tentativa++) {
    try {
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error: any) {
      const podeTentarNovamente =
        tentativa < MAX_TENTATIVAS_ENVIO && ehErroTransitorio(error);

      if (podeTentarNovamente) {
        await aguardar(ATRASO_BASE_RETRY_MS * tentativa);
        continue;
      }

      console.error("[EmailService] Falha ao enviar e-mail:", {
        para: mailOptions.to,
        status,
        tentativa,
        code: error?.code,
        responseCode: error?.responseCode,
        mensagem: error?.message,
      });
      return false;
    }
  }

  return false;
}

/**
 * Dispara e-mail transacional institucional (recibo de reserva ou comprovante oficial aprovado),
 * incluindo versão texto puro (`text`), `replyTo`, sanitização e retry em falhas transitórias.
 *
 * @param {string} emailDestino - Endereço eletrônico do comprador.
 * @param {string} nomeComprador - Nome do comprador cadastrado.
 * @param {string[]} numerosRifas - Lista de números das rifas vinculadas.
 * @param {"pendente" | "aprovado"} status - Situação do pedido ('pendente' para reserva em análise, 'aprovado' para pagamento confirmado).
 * @returns {Promise<boolean>} Verdadeiro se o e-mail foi despachado com sucesso.
 * @sideEffects Envio assíncrono de e-mail via servidor SMTP configurado.
 */
export const enviarEmailRecibo = async (
  emailDestino: string,
  nomeComprador: string,
  numerosRifas: string[],
  status: "pendente" | "aprovado",
): Promise<boolean> => {
  const emailLimpo = limparEValidarEmail(emailDestino);
  if (!emailLimpo || !Array.isArray(numerosRifas) || numerosRifas.length === 0) {
    return false;
  }

  if (!process.env.SMTP_PASS) {
    console.warn("[EmailService] SMTP_PASS não configurado no ambiente.");
  }

  const rifasLimpas = numerosRifas
    .map((num) => String(num || "").trim())
    .filter(Boolean);

  if (rifasLimpas.length === 0) {
    return false;
  }

  const primeiroNome =
    String(nomeComprador || "Comprador").trim().split(/\s+/)[0] || "Comprador";
  const remetente = obterRemetente();

  if (status === "pendente") {
    const assunto = "Recebemos seu pedido de rifas — Comissão de Formatura 2026";
    const mensagem =
      "Recebemos seu pedido. Seus bilhetes foram reservados e aguardam validação da Tesouraria. Você receberá a confirmação definitiva assim que o pagamento for aprovado.";
    const textoStatus = "Em análise pela Tesouraria";

    const bilhetesHtml = rifasLimpas
      .map(
        (num) => `
        <span style="display: inline-block; margin: 4px 4px 4px 0; background-color: #f8fafc; color: #0f172a; padding: 7px 14px; border-radius: 6px; font-weight: 700; font-size: 15px; border: 1px solid #cbd5e1; font-family: monospace;">
          Nº ${escaparHtml(num)}
        </span>
      `,
      )
      .join("");

    const html = criarTemplateEmail({
      nome: primeiroNome,
      tituloCabecalho: "Reserva de Rifas Registrada",
      mensagem,
      textoStatus,
      corStatus: "#b45309",
      bgStatus: "#fef3c7",
      bordaStatus: "#fde68a",
      bilhetesHtml,
      remetente,
    });

    const text = criarTextoPlanoEmail({
      nome: primeiroNome,
      mensagem,
      textoStatus,
      numerosRifas: rifasLimpas,
      remetente,
    });

    return enviarComRetry(
      {
        from: `"Comissão de Formatura 2026" <${remetente}>`,
        replyTo: remetente,
        to: emailLimpo,
        subject: assunto,
        text,
        html,
      },
      status,
    );
  }

  if (status === "aprovado") {
    const assunto = "Seus bilhetes de rifa foram confirmados — Comissão 2026";
    const mensagem =
      "Seu pagamento foi confirmado com sucesso. Seus bilhetes já estão ativos para o sorteio. Guarde este e-mail como comprovante.";
    const textoStatus = "Pagamento confirmado • Bilhetes ativos";

    const bilhetesHtml = rifasLimpas
      .map(
        (num) => `
        <span style="display: inline-block; margin: 4px 4px 4px 0; background-color: #ecfdf5; color: #065f46; padding: 9px 18px; border-radius: 8px; font-weight: 800; font-size: 17px; border: 2px solid #059669; font-family: monospace; letter-spacing: 0.5px;">
          Nº ${escaparHtml(num)}
        </span>
      `,
      )
      .join("");

    const html = criarTemplateEmail({
      nome: primeiroNome,
      tituloCabecalho: "Comprovante de Participação",
      mensagem,
      textoStatus,
      corStatus: "#047857",
      bgStatus: "#ecfdf5",
      bordaStatus: "#a7f3d0",
      bilhetesHtml,
      remetente,
    });

    const text = criarTextoPlanoEmail({
      nome: primeiroNome,
      mensagem,
      textoStatus,
      numerosRifas: rifasLimpas,
      remetente,
    });

    return enviarComRetry(
      {
        from: `"Comissão de Formatura 2026" <${remetente}>`,
        replyTo: remetente,
        to: emailLimpo,
        subject: assunto,
        text,
        html,
      },
      status,
    );
  }

  return false;
};
