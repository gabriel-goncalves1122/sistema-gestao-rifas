import { fetchAPI } from "@/shared/services/api";

import { TransacaoTesouraria } from "../types/auditoriaCompras";

export interface DadosAtualizacaoCompradorAuditoria {
  nome: string;
  email?: string | null;
  telefone?: string | null;
}

export interface ResultadoReenvioEmailComprovanteAuditoria {
  compradorId: string;
  email: string;
  rifas: string[];
  status: "aprovado";
}

function normalizarListaHistorico(valor: unknown): TransacaoTesouraria[] {
  if (Array.isArray(valor)) return valor as TransacaoTesouraria[];

  if (!valor || typeof valor !== "object") return [];

  return Object.values(valor).filter(
    (item): item is TransacaoTesouraria =>
      Boolean(item) && typeof item === "object",
  );
}

function normalizarHistorico(resposta: unknown): TransacaoTesouraria[] {
  if (!resposta || typeof resposta !== "object") return [];

  if (Array.isArray(resposta)) {
    return normalizarListaHistorico(resposta);
  }

  if ("historico" in resposta) {
    return normalizarListaHistorico(
      (resposta as { historico?: unknown }).historico,
    );
  }

  return normalizarListaHistorico(resposta);
}

export const auditoriaComprasService = {
  async buscarHistoricoDetalhado() {
    const resposta = await fetchAPI("/tesouraria/historico");

    return normalizarHistorico(resposta);
  },

  async atualizarComprador(
    compradorId: string,
    dados: DadosAtualizacaoCompradorAuditoria,
  ) {
    return fetchAPI(
      `/tesouraria/historico/compras/${encodeURIComponent(compradorId)}`,
      "PATCH",
      dados,
    );
  },

  async reenviarEmailComprovante(compradorId: string) {
    return fetchAPI(
      `/tesouraria/historico/compras/${encodeURIComponent(
        compradorId,
      )}/reenviar-email-comprovante`,
      "POST",
    ) as Promise<{
      sucesso: true;
      mensagem: string;
      envio: ResultadoReenvioEmailComprovanteAuditoria;
    }>;
  },

  async aceitarCompra(chave: string) {
    return fetchAPI(
      `/tesouraria/historico/compras/${encodeURIComponent(chave)}/aceitar`,
      "POST",
    );
  },

  async negarCompra(chave: string, motivo: string) {
    return fetchAPI(
      `/tesouraria/historico/compras/${encodeURIComponent(chave)}/negar`,
      "POST",
      { motivo },
    );
  },
};
