// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/rifasService.ts
// ============================================================================
import { Bilhete } from "../types/models";

import { DadosCorrecaoRifas, DadosVenda } from "./types/rifasTypes";
import { DadosCorrecaoDadosRifas } from "./types/rifasTypes";

import { AderidoRifasService } from "./services/aderidoRifasService";
import { VendaRifasService } from "./services/vendaRifasService";
import { CorrecaoRifasService } from "./services/correcaoRifasService";
import { RelatorioRifasService } from "./services/relatorioRifasService";
import { CorrecaoDadosRifasService } from "./services/correcaoDadosRifasService";

export class RifasService {
  /**
   * Busca e retorna todos os bilhetes de rifa atribuídos ao vendedor aderido logado.
   *
   * @param {string} emailLogado - Email do aderido autenticado na sessão.
   * @returns {Promise<Bilhete[]>} Lista completa de bilhetes associados ao vendedor.
   */
  static async buscarPorAderido(emailLogado: string): Promise<Bilhete[]> {
    return AderidoRifasService.buscarPorAderido(emailLogado);
  }

  /**
   * Processa uma venda manual de rifas com envio de comprovante bancário legada.
   *
   * @param {string} uid - UID do usuário autenticado no Firebase Auth.
   * @param {string} emailLogado - Email do aderido vendedor.
   * @param {DadosVenda} dadosVenda - Dados da venda, comprador e comprovante.
   * @returns {Promise<void>}
   * @transactional Valida disponibilidade e reserva os bilhetes atômica e transacionalmente.
   */
  static async processarVenda(
    uid: string,
    emailLogado: string,
    dadosVenda: DadosVenda,
  ): Promise<void> {
    return VendaRifasService.processarVenda(uid, emailLogado, dadosVenda);
  }

  /**
   * Permite ao aderido reenviar um novo comprovante para um conjunto de rifas recusadas pela tesouraria.
   *
   * @param {string} emailLogado - Email do aderido.
   * @param {string[]} numerosRifas - Lista de números das rifas recusadas.
   * @param {DadosCorrecaoRifas} dadosAtualizados - Novo comprovante e dados para reanálise.
   * @returns {Promise<boolean>} `true` se corrigido com sucesso.
   * @transactional Atualiza os bilhetes para status 'pendente'.
   */
  static async corrigirRifasRecusadas(
    emailLogado: string,
    numerosRifas: string[],
    dadosAtualizados: DadosCorrecaoRifas,
  ): Promise<boolean> {
    return CorrecaoRifasService.corrigirRifasRecusadas(
      emailLogado,
      numerosRifas,
      dadosAtualizados,
    );
  }

  /**
   * Permite a correção cadastral (nome, telefone, email) de bilhetes recusados ou com a flag `correcao_pendente`.
   * Preserva o status financeiro de 'pago' caso o bilhete estivesse pago com pendência puramente cadastral.
   *
   * @param {string} emailLogado - Email do aderido vendedor.
   * @param {string[]} numerosRifas - Lista de números dos bilhetes a corrigir.
   * @param {DadosCorrecaoDadosRifas} dadosAtualizados - Novos dados do comprador.
   * @returns {Promise<boolean>} `true` se ao menos um bilhete foi atualizado com sucesso.
   * @transactional Atualiza 'compradores' como fonte de verdade e reflete nos bilhetes.
   */
  static async corrigirDadosRifasRecusadas(
    emailLogado: string,
    numerosRifas: string[],
    dadosAtualizados: DadosCorrecaoDadosRifas,
  ): Promise<boolean> {
    return CorrecaoDadosRifasService.corrigirDadosRifasRecusadas(
      emailLogado,
      numerosRifas,
      dadosAtualizados,
    );
  }

  /**
   * Alias de compatibilidade para recuperação do relatório financeiro da tesouraria.
   *
   * @returns {Promise<any>} Relatório financeiro consolidado.
   */
  static async obterRelatorioTesouraria() {
    return RelatorioRifasService.obterRelatorioTesouraria();
  }

  /**
   * Alias de compatibilidade para histórico detalhado de compras.
   *
   * @returns {Promise<any[]>} Histórico de compras.
   */
  static async obterHistoricoDetalhado() {
    return RelatorioRifasService.obterHistoricoDetalhado();
  }
}
