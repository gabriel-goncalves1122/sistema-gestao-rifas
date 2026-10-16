import { EmailComprovanteService } from "./services/emailComprovanteService";
import { PixTransacoesService } from "./services/pixTransacoesService";
import { PixValidacaoService } from "./services/pixValidacaoService";
import { TesourariaRelatorioService } from "./services/tesourariaRelatorioService";

export class TesourariaService {
  /**
   * Obtém o relatório financeiro consolidado da tesouraria, com totais arrecadados,
   * bilhetes pagos, pendentes e taxas bancárias.
   *
   * @returns {Promise<any>} Dados consolidados do relatório financeiro.
   */
  static async obterRelatorioTesouraria() {
    return TesourariaRelatorioService.obterRelatorioTesouraria();
  }

  /**
   * Recupera o histórico detalhado de todas as compras de rifas registradas no sistema.
   *
   * @returns {Promise<any[]>} Lista detalhada das compras com dados do comprador e vendedor.
   */
  static async obterHistoricoDetalhado() {
    return TesourariaRelatorioService.obterHistoricoDetalhado();
  }

  /**
   * Atualiza os dados cadastrais (nome, email, telefone) de um comprador.
   * Prioriza a coleção 'compradores' como fonte da verdade e propaga as alterações
   * para os documentos de 'bilhetes' desnormalizados via transação Firestore.
   *
   * @param {string} compradorId - Identificador único do comprador.
   * @param {Object} dados - Novos dados cadastrais informados.
   * @param {string} dados.nome - Nome completo.
   * @param {string | null} [dados.email] - Endereço de email.
   * @param {string | null} [dados.telefone] - Telefone com DDD.
   * @returns {Promise<{ sucesso: boolean; compradorId: string }>} Objeto indicando o sucesso da operação.
   * @transactional Propaga alterações em compradores e bilhetes de forma atômica.
   */
  static async atualizarCompradorCompra(
    compradorId: string,
    dados: {
      nome: string;
      email?: string | null;
      telefone?: string | null;
    },
  ) {
    return TesourariaRelatorioService.atualizarCompradorCompra(
      compradorId,
      dados,
    );
  }

  /**
   * Dispara o reenvio manual do email com recibo e bilhetes confirmados para o comprador.
   *
   * @param {string} compradorId - Identificador do comprador da transação aprovada.
   * @returns {Promise<ResultadoReenvioEmailComprovante>} Confirmação de envio com dados da compra.
   * @throws {Error} Se a compra não existir ou não estiver com status 'pago'.
   */
  static async reenviarEmailComprovante(compradorId: string) {
    return EmailComprovanteService.reenviarEmailComprovante(compradorId);
  }

  /**
   * Busca e consolida todas as transações Pix ativas e finalizadas para visualização na tesouraria.
   *
   * @returns {Promise<PixTransacao[]>} Lista de transações agrupadas.
   */
  static async buscarPixTransacoes() {
    return PixTransacoesService.buscarTransacoes();
  }

  /**
   * Computa o resumo estatístico das transações Pix (total pago, pendente, recusado, ticket médio).
   *
   * @returns {Promise<PixTransacoesResumo>} Métricas financeiras e contagens.
   */
  static async obterPixTransacoesResumo() {
    return PixTransacoesService.obterResumo();
  }

  /**
   * Executa a sincronização ativa de status entre cobranças abertas no sistema e o gateway Mercado Pago.
   *
   * @returns {Promise<{ atualizados: number }>} Quantidade de pagamentos sincronizados.
   * @sideEffects Atualiza o Firestore com os status confirmados pelo provedor.
   */
  static async sincronizarPixTransacoes() {
    return PixTransacoesService.sincronizar();
  }

  /**
   * Valida e aceita manualmente uma transação Pix pendente ou em análise.
   *
   * @param {Object} params - Identificadores e credenciais do tesoureiro autenticado.
   * @param {string} params.transacaoId - ID da transação a aprovar.
   * @param {string} params.uidTesouraria - UID do usuário que executou a aprovação.
   * @param {string} [params.emailTesouraria] - Email do tesoureiro para registro de auditoria.
   * @returns {Promise<{ sucesso: boolean; mensagem: string }>}
   * @transactional Atualiza os bilhetes atômica e simultaneamente.
   */
  static async aceitarPixTransacao(params: {
    transacaoId: string;
    uidTesouraria: string;
    emailTesouraria?: string;
  }) {
    return PixValidacaoService.aceitarTransacao(params);
  }

  /**
   * Nega e cancela manualmente uma transação Pix, liberando os bilhetes correspondentes.
   *
   * @param {Object} params - Parâmetros da recusa.
   * @param {string} params.transacaoId - ID da transação a negar.
   * @param {string} params.uidTesouraria - UID do usuário tesoureiro.
   * @param {string} [params.emailTesouraria] - Email do tesoureiro.
   * @param {string} [params.motivo] - Justificativa opcional da recusa.
   * @returns {Promise<{ sucesso: boolean; mensagem: string }>}
   * @transactional Libera bilhetes de forma atômica no Firestore.
   */
  static async negarPixTransacao(params: {
    transacaoId: string;
    uidTesouraria: string;
    emailTesouraria?: string;
    motivo?: string;
  }) {
    return PixValidacaoService.negarTransacao(params);
  }
}
