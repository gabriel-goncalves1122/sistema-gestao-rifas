/**
 * Serviço de conciliação automática de extratos bancários (InfinitePay) com bilhetes de rifas.
 *
 * @module conciliacaoExtratoService
 */
import { enviarEmailRecibo } from "../../rifas/emailService";
import { parsearExtratoBancario } from "../utils/extratoBancarioParser";
import { executarMatchingExtratoPendencias } from "../helpers/conciliacaoExtratoMatcherHelper";
import { ConciliacaoExtratoRepository } from "../repositories/conciliacaoExtratoRepository";
import {
  ItemAprovacaoLoteInput,
  ResultadoAnaliseExtratoDTO,
  ResultadoAprovacaoLoteDTO,
} from "../types/conciliacaoExtratoTypes";

export class ConciliacaoExtratoService {
  /**
   * Analisa o extrato bancário submetido e cruza contra as pendências do sistema.
   *
   * @param {string} conteudoArquivo - Conteúdo textual do extrato CSV ou OFX.
   * @param {string} [nomeArquivo] - Nome do arquivo enviado.
   * @returns {Promise<ResultadoAnaliseExtratoDTO>} Relatório de matches e divergências.
   */
  static async analisarExtrato(
    conteudoArquivo: string,
    nomeArquivo?: string,
  ): Promise<ResultadoAnaliseExtratoDTO> {
    const linhasExtrato = parsearExtratoBancario(conteudoArquivo, nomeArquivo);
    const pendencias = await ConciliacaoExtratoRepository.buscarPendenciasCandidatas();

    return executarMatchingExtratoPendencias(linhasExtrato, pendencias);
  }

  /**
   * Executa a aprovação atômica em lote de todas as transações conciliadas e selecionadas.
   *
   * @param {ItemAprovacaoLoteInput[]} itens - Itens aprovados pela tesouraria.
   * @param {string} uidTesouraria - UID do usuário que executou a aprovação.
   * @param {string} [emailTesouraria] - E-mail do usuário tesoureiro.
   * @returns {Promise<ResultadoAprovacaoLoteDTO>} Resultado do processamento do lote.
   * @transactional Delega cada lote de até 40 itens para transação ACID em `ConciliacaoExtratoRepository`.
   * @sideEffects Dispara recibos por e-mail de forma assíncrona fora das transações.
   */
  static async aprovarLoteConciliacao(
    itens: ItemAprovacaoLoteInput[],
    uidTesouraria: string,
    emailTesouraria?: string,
  ): Promise<ResultadoAprovacaoLoteDTO> {
    if (!itens || itens.length === 0) {
      return {
        sucesso: true,
        aprovadosCount: 0,
        totalRifasAprovadas: 0,
        valorTotalAprovado: 0,
        falhasCount: 0,
        mensagem: "Nenhum item selecionado para aprovação.",
      };
    }

    const agora = new Date().toISOString();
    const validadorIdentificacao = emailTesouraria || uidTesouraria;

    let totalRifasAprovadas = 0;
    let valorTotalAprovado = 0;
    let aprovadosCount = 0;
    let falhasCount = 0;
    const emailsParaEnviar: Array<{ email: string; nome: string; rifas: string[] }> = [];

    const CHUNK_SIZE = 40;
    for (let i = 0; i < itens.length; i += CHUNK_SIZE) {
      const chunk = itens.slice(i, i + CHUNK_SIZE);
      const resultadoChunk = await ConciliacaoExtratoRepository.aprovarChunkConciliacao(
        chunk,
        validadorIdentificacao,
        agora,
      );

      aprovadosCount += resultadoChunk.aprovadosCount;
      totalRifasAprovadas += resultadoChunk.totalRifasAprovadas;
      valorTotalAprovado += resultadoChunk.valorTotalAprovado;
      falhasCount += resultadoChunk.falhasCount;
      emailsParaEnviar.push(...resultadoChunk.emailsParaEnviar);
    }

    emailsParaEnviar.forEach(({ email, nome, rifas }) => {
      enviarEmailRecibo(email, nome, rifas, "aprovado").catch((err) => {
        console.warn(`[ConciliacaoExtrato] Falha ao enviar e-mail para ${email}:`, err);
      });
    });

    return {
      sucesso: true,
      aprovadosCount,
      totalRifasAprovadas,
      valorTotalAprovado: Number(valorTotalAprovado.toFixed(2)),
      falhasCount,
      mensagem: `${aprovadosCount} venda(s) aprovada(s) com sucesso via conciliação (${totalRifasAprovadas} rifas)!`,
    };
  }
}
