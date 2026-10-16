// ============================================================================
// SERVICE: checkoutPixService
//
// Responsavel por criar cobrancas Pix via backend do sistema.
//
// O frontend NUNCA chama provedores financeiros diretamente.
// Toda a comunicacao com provedores externos (PagBank, etc.)
// e feita exclusivamente pelo backend das Firebase Functions.
//
// Contrato:
//   POST /tesouraria/checkout/pix
//   Body: { nome, telefone, email, numerosRifas }
//   Resposta: { id, status, qrCodeImagemUrl, qrCodeBase64, copiaECola, expiraEm }
// ============================================================================
import { fetchAPI } from "@/shared/services/api";

import {
  CheckoutPixCobranca,
  CheckoutPixStatus,
  CriarCobrancaPixParams,
} from "../types/checkoutPix";
import {
  sanitizarDadosCliente,
  sanitizarDocumento,
} from "@/shared/utils/sanitizadores";

let requisicaoEmAndamento = false;

/**
 * Garante que o valor informado seja tratado como string, retornando vazio caso contrário.
 *
 * @param {unknown} valor - Valor bruto.
 * @returns {string} String garantida.
 */
function normalizarTexto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

/**
 * Normaliza o status da cobrança Pix para os valores canônicos aceitos pelo frontend.
 *
 * @param {unknown} status - Status bruto retornado pela API.
 * @returns {CheckoutPixStatus} Status canônico ('aguardando_pagamento' | 'pago' | 'expirado' | 'cancelado').
 */
function normalizarStatusCheckoutPix(status: unknown): CheckoutPixStatus {
  if (
    status === "aguardando_pagamento" ||
    status === "pago" ||
    status === "expirado" ||
    status === "cancelado"
  ) {
    return status;
  }

  return "aguardando_pagamento";
}

/**
 * Valida a resposta do backend e constrói o objeto tipado `CheckoutPixCobranca`.
 *
 * @param {unknown} resposta - Resposta JSON da API.
 * @returns {CheckoutPixCobranca} Objeto tipado da cobrança com QR code e código copia-e-cola.
 * @throws {Error} Dispara "Resposta Pix invalida." ou "Pagamento via Pix incompleto." se campos essenciais faltarem.
 */
function normalizarCobrancaPix(resposta: unknown): CheckoutPixCobranca {
  if (!resposta || typeof resposta !== "object") {
    throw new Error("Resposta Pix invalida.");
  }

  const dados = resposta as Partial<CheckoutPixCobranca>;
  const id = normalizarTexto(dados.id);
  const copiaECola = normalizarTexto(dados.copiaECola);

  if (!id || !copiaECola) {
    throw new Error("Pagamento via Pix incompleto.");
  }

  return {
    id,
    status: normalizarStatusCheckoutPix(dados.status),
    qrCodeImagemUrl: dados.qrCodeImagemUrl || null,
    qrCodeBase64: dados.qrCodeBase64 || null,
    copiaECola,
    expiraEm: dados.expiraEm || null,
  };
}

export const checkoutPixService = {
  /**
   * Envia requisição ao backend para gerar uma nova cobrança Pix com QR Code e chave copia-e-cola.
   * Utiliza mutex booleano em memória para prevenir chamadas simultâneas duplicadas.
   *
   * @param {CriarCobrancaPixParams} params - Dados da compra, comprador, rifas e sessão.
   * @returns {Promise<CheckoutPixCobranca>} Dados normalizados da cobrança gerada.
   * @throws {Error} Se houver requisição já em andamento ou se faltar dados obrigatórios.
   * @sideEffects Realiza requisição HTTP POST para `/tesouraria/checkout/pix`.
   */
  async criarCobrancaPix(params: CriarCobrancaPixParams): Promise<CheckoutPixCobranca> {
    if (requisicaoEmAndamento) {
      throw new Error(
        "Ja existe uma cobranca sendo gerada. Aguarde a conclusao.",
      );
    }

    const sanitizados = sanitizarDadosCliente({
      nome: params.nome,
      telefone: params.telefone,
      email: params.email || "",
    });
    const documento = sanitizarDocumento(params.documento);

    const numerosRifas = params.numerosRifas.filter(Boolean);

    if (!sanitizados.nome) throw new Error("Nome do comprador e obrigatorio.");
    if (!sanitizados.telefone) throw new Error("Telefone do comprador e obrigatorio.");
    if (!numerosRifas.length) {
      throw new Error("Selecione ao menos uma rifa para gerar o pagamento.");
    }

    requisicaoEmAndamento = true;

    try {
      const resposta = await fetchAPI("/tesouraria/checkout/pix", "POST", {
        nome: sanitizados.nome,
        telefone: sanitizados.telefone,
        email: sanitizados.email,
        documento,
        numerosRifas,
        sessaoCheckoutId: params.sessaoCheckoutId,
      });

      const cobranca = normalizarCobrancaPix(resposta);
      cobranca.numerosRifas = numerosRifas;
      return cobranca;
    } finally {
      requisicaoEmAndamento = false;
    }
  },

  /**
   * Envia requisição para cancelamento da cobrança Pix ativa no backend, com opção de liberar ou reter bilhetes.
   *
   * @param {string} id - Identificador único da cobrança Pix.
   * @param {boolean} [reterReserva=false] - Se `true`, não libera os bilhetes para a grelha geral, retendo a posse temporária.
   * @returns {Promise<void>}
   * @sideEffects Realiza requisição HTTP POST para `/tesouraria/checkout/pix/:id/cancelar`.
   */
  async cancelarCobrancaPix(id: string, reterReserva: boolean = false): Promise<void> {
    await fetchAPI(`/tesouraria/checkout/pix/${id}/cancelar`, "POST", { reterReserva });
  },
};
