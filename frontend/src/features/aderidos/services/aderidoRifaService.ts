import { fetchAPI } from "@/shared/services/api";
import { RelatorioVendasAderido } from "../types/painelAderido";

interface DadosCompradorRifa {
  nome: string;
  telefone: string;
  email: string;
}

interface DadosCorrigirDadosRifas extends DadosCompradorRifa {
  numerosRifas: string[];
}

interface ResultadoMinhasRifas {
  bilhetes?: unknown[];
}

export const aderidoRifaService = {
  /**
   * Busca a lista de todos os bilhetes de rifa alocados para o aderido logado.
   *
   * @returns {Promise<unknown[]>} Array de bilhetes do vendedor.
   */
  async buscarMinhasRifas() {
    const resultado = (await fetchAPI(
      "/rifas/minhas-rifas",
    )) as ResultadoMinhasRifas;

    return resultado.bilhetes || [];
  },

  /**
   * Envia correções cadastrais (nome, telefone, email) para bilhetes recusados ou pendentes.
   *
   * @param {DadosCorrigirDadosRifas} dados - Números das rifas e dados atualizados do comprador.
   * @returns {Promise<boolean>} Retorna true caso a operação seja concluída.
   */
  async corrigirDadosRifasRecusadas({
    numerosRifas,
    nome,
    telefone,
    email,
  }: DadosCorrigirDadosRifas) {
    await fetchAPI("/rifas/corrigir-dados", "POST", {
      numerosRifas,
      nome,
      telefone,
      email,
    });

    return true;
  },

  /**
   * Obtém o relatório consolidado de vendas de rifas do aderido autenticado.
   *
   * @returns {Promise<RelatorioVendasAderido>} Dados completos de estatísticas e bilhetes vendidos.
   */
  async obterMeuRelatorioVendas(): Promise<RelatorioVendasAderido> {
    return (await fetchAPI("/rifas/meu-relatorio")) as RelatorioVendasAderido;
  },
};
