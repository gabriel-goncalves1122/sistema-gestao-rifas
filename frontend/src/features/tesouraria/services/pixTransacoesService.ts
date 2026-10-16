import { fetchAPI } from "@/shared/services/api";

import {
  PixTransacoesResumo,
  PixTransacao,
  StatusValidacaoPix,
} from "../types/pixTransacoes";
import { RESUMO_PIX_TRANSACOES_VAZIO } from "../utils/pixTransacoesUtils";

const STATUS_VALIDACAO_PIX: StatusValidacaoPix[] = ["aceita", "negada"];

function valorNumericoSeguro(valor: unknown) {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

function normalizarStatusValidacaoPix(valor: unknown) {
  return STATUS_VALIDACAO_PIX.find((status) => status === valor);
}

function normalizarTransacao(transacao: unknown): PixTransacao | null {
  if (!transacao || typeof transacao !== "object") return null;

  const transacaoPix = transacao as PixTransacao & {
    status_validacao?: unknown;
  };
  const {
    status_validacao,
    statusValidacao: statusValidacaoOriginal,
    ...transacaoSemCampoLegado
  } = transacaoPix;
  const statusValidacao = normalizarStatusValidacaoPix(
    statusValidacaoOriginal || status_validacao,
  );

  return statusValidacao
    ? { ...transacaoSemCampoLegado, statusValidacao }
    : transacaoSemCampoLegado;
}

function normalizarTransacoes(resposta: unknown): PixTransacao[] {
  if (!resposta || typeof resposta !== "object") return [];

  const { transacoes } = resposta as { transacoes?: unknown };

  return Array.isArray(transacoes)
    ? transacoes.flatMap((transacao) => {
        const transacaoNormalizada = normalizarTransacao(transacao);

        return transacaoNormalizada ? [transacaoNormalizada] : [];
      })
    : [];
}

function normalizarResumo(resposta: unknown): PixTransacoesResumo {
  if (!resposta || typeof resposta !== "object") {
    return RESUMO_PIX_TRANSACOES_VAZIO;
  }

  const { resumo } = resposta as { resumo?: Partial<PixTransacoesResumo> };

  if (!resumo || typeof resumo !== "object") {
    return RESUMO_PIX_TRANSACOES_VAZIO;
  }

  const resultado: PixTransacoesResumo = { ...RESUMO_PIX_TRANSACOES_VAZIO };
  (Object.keys(RESUMO_PIX_TRANSACOES_VAZIO) as Array<keyof PixTransacoesResumo>).forEach(
    (campo) => {
      resultado[campo] = valorNumericoSeguro(resumo[campo]);
    },
  );

  return resultado;
}

export const pixTransacoesService = {
  async buscarTransacoes() {
    const resposta = await fetchAPI("/tesouraria/transacoes-bancarias");

    return normalizarTransacoes(resposta);
  },

  async buscarResumo() {
    const resposta = await fetchAPI("/tesouraria/transacoes-bancarias/resumo");

    return normalizarResumo(resposta);
  },

  async sincronizarBanco() {
    return fetchAPI("/tesouraria/transacoes-bancarias/sincronizar", "POST");
  },

  async aceitarTransacao(transacaoId: string) {
    return fetchAPI(
      `/tesouraria/transacoes-bancarias/${transacaoId}/aceitar`,
      "POST",
    );
  },

  async negarTransacao(transacaoId: string, motivo: string) {
    return fetchAPI(
      `/tesouraria/transacoes-bancarias/${transacaoId}/negar`,
      "POST",
      { motivo },
    );
  },
};
