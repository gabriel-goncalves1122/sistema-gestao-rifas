// ============================================================================
// ARQUIVO: backend/functions/src/modules/admin/secretaria/secretariaService.ts
// ============================================================================
import { auth } from "../../../shared/config/firebaseAdmin";
import { AppError } from "../../../shared/classes/AppError";

import {
  AderidoSecretaria,
  DadosAtualizacaoAderido,
  DadosNovoAderido,
  ModalidadeAdesao,
} from "./secretariaTypes";
import {
  montarCamposAtualizacaoAderido,
  normalizarDadosNovoAderido,
} from "./secretariaMapper";
import { secretariaRepository } from "./repositories/secretariaRepository";

const META_VENDAS_POR_MODALIDADE: Record<ModalidadeAdesao, number> = {
  completo: 1200,
  meio: 600,
};

const BILHETES_POR_MODALIDADE: Record<ModalidadeAdesao, number> = {
  completo: 120,
  meio: 60,
};

export const secretariaService = {
  /**
   * Lista todos os registros de aderidos cadastrados no sistema.
   *
   * @returns {Promise<AderidoSecretaria[]>} Lista de aderidos com campos brutos e id do documento injetado.
   * @sideEffects Leitura na coleção `usuarios` via `secretariaRepository`.
   */
  async listarAderidos(): Promise<AderidoSecretaria[]> {
    const docs = await secretariaRepository.listarUsuariosDocs();

    // O frontend possui `normalizarAderidoSecretaria` que trata campos legados (Nome vs nome, status vs status_cadastro).
    return docs.map(
      (doc: any) =>
        ({
          ...doc.data(),
          id: doc.id,
        }) as unknown as AderidoSecretaria,
    );
  },

  /**
   * Cadastra um novo aderido atomicamente, reservando a posição sequencial, alocando a faixa
   * contígua de bilhetes de rifas e criando a garantia de e-mail único.
   *
   * @param {DadosNovoAderido} dadosNovos - Payload com nome, e-mail, telefone, modalidade e cargo.
   * @returns {Promise<{ idAderido: string; modalidade: ModalidadeAdesao; bilhetesGerados: number; faixaRifas: { inicio: string; fim: string } }>}
   *          Dados do aderido criado e faixa de rifas reservada.
   * @throws {AppError} Se o e-mail já estiver cadastrado, a posição já existir ou os bilhetes estiverem ocupados.
   * @transactional Delega criação atômica para `secretariaRepository.criarAderidoAtomicamente`.
   */
  async adicionarAderido(dadosNovos: DadosNovoAderido) {
    const dados = normalizarDadosNovoAderido(dadosNovos);
    const bilhetesPorPessoa = BILHETES_POR_MODALIDADE[dados.modalidade_adesao];
    const metaVendas = META_VENDAS_POR_MODALIDADE[dados.modalidade_adesao];

    if (await secretariaRepository.emailJaExiste(dados.email)) {
      throw new AppError("EMAIL_DUPLICADO", "Este e-mail já foi autorizado anteriormente.", 400);
    }

    const contadorLegadoFallback = await secretariaRepository.carregarContadorComFallbackLegado();
    const { idAderido, numeroInicio, numeroFim } =
      await secretariaRepository.criarAderidoAtomicamente({
        dados,
        bilhetesPorPessoa,
        metaVendas,
        contadorLegadoFallback,
      });

    return {
      idAderido,
      modalidade: dados.modalidade_adesao,
      bilhetesGerados: bilhetesPorPessoa,
      faixaRifas: { inicio: numeroInicio, fim: numeroFim },
    };
  },

  /**
   * Atualiza parcialmente os dados cadastrais de um aderido existente e sincroniza eventuais
   * custom claims no Firebase Auth caso o cargo tenha sido alterado.
   *
   * @param {string} idAderido - Identificador único do aderido (ex: "ADERIDO_001").
   * @param {DadosAtualizacaoAderido} dados - Campos modificados pelo administrador.
   * @returns {Promise<{ idAderido: string; camposAtualizados: string[] }>} Confirmação com lista dos campos alterados.
   * @throws {AppError} Se o aderido não for encontrado ou se houver tentativa inválida de reverter ativo para pendente.
   * @transactional Delega validação e mutação atômica para `secretariaRepository.atualizarAderidoAtomicamente`.
   * @sideEffects Propagação de custom claims no Firebase Auth Admin após commit.
   */
  async atualizarAderido(idAderido: string, dados: DadosAtualizacaoAderido) {
    const camposAtualizacao = montarCamposAtualizacaoAderido(dados);
    const { uidAderido } = await secretariaRepository.atualizarAderidoAtomicamente({
      idAderido,
      dados,
      camposAtualizacao,
    });

    if (dados.cargo && uidAderido) {
      try {
        await auth.setCustomUserClaims(uidAderido, {
          cargo: dados.cargo,
          role: dados.cargo,
          roleAtualizado: true,
        });
      } catch (error) {
        console.error("[SecretariaService] Erro ao atualizar custom claims:", error);
      }
    }

    return {
      idAderido,
      camposAtualizados: Object.keys(camposAtualizacao),
    };
  },
};
