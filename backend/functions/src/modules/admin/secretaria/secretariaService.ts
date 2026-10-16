// ============================================================================
// ARQUIVO: backend/functions/src/modules/admin/secretaria/secretariaService.ts
// ============================================================================
import { db, auth } from "../../../shared/config/firebaseAdmin";
import { AppError } from "../../../shared/classes/AppError";
import { Bilhete, Usuario } from "../../types/models";

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
import {
  EstadoContadorAderidos,
  normalizarEstadoContadorAderidos,
  reconstruirEstadoContadorAderidosLegado,
} from "./helpers/contadorAderidosHelper";
import { gerarIdIndiceEmailSecretaria } from "./helpers/emailIndexHelper";

const META_VENDAS_POR_MODALIDADE: Record<ModalidadeAdesao, number> = {
  completo: 1200,
  meio: 600,
};

const BILHETES_POR_MODALIDADE: Record<ModalidadeAdesao, number> = {
  completo: 120,
  meio: 60,
};

const COLECAO_INDICES_EMAIL = "indices_usuarios_email";

/**
 * Carrega e reconstrói o estado dos contadores analisando a coleção inteira de usuários e bilhetes.
 * Utilizado como fallback para bases de dados legadas onde o documento `contadores/aderidos` ainda não existe.
 *
 * @returns {Promise<EstadoContadorAderidos>} Última posição de aderido e último bilhete computados.
 * @sideEffects Leitura em lote de todas as coleções `usuarios` e `bilhetes`.
 */
async function carregarFallbackContadorLegado(): Promise<EstadoContadorAderidos> {
  const [usuariosSnapshot, bilhetesSnapshot] = await Promise.all([
    db.collection("usuarios").get(),
    db.collection("bilhetes").get(),
  ]);

  return reconstruirEstadoContadorAderidosLegado(
    usuariosSnapshot.docs || [],
    bilhetesSnapshot.docs || [],
  );
}

export const secretariaService = {
  /**
   * Lista todos os registros de aderidos cadastrados no sistema.
   *
   * @returns {Promise<AderidoSecretaria[]>} Lista de aderidos com campos brutos e id do documento injetado.
   * @sideEffects Leitura na coleção `usuarios`.
   */
  async listarAderidos(): Promise<AderidoSecretaria[]> {
    const querySnapshot = await db.collection("usuarios").get();
    
    // Retornamos os dados brutos injetando o ID.
    // O frontend possui o `normalizarAderidoSecretaria` que lidará com campos legados (Nome vs nome, status vs status_cadastro, etc).
    // O frontend também já se encarrega de realizar a ordenação na tabela.
    const docs = querySnapshot.docs || [];
    return docs.map((doc: any) => {
      return {
        ...doc.data(),
        id: doc.id,
      } as unknown as AderidoSecretaria;
    });
  },

  /**
   * Cadastra um novo aderido atomicamente, reservando a posição sequencial, alocando a faixa
   * contígua de bilhetes de rifas e criando a garantia de e-mail único.
   *
   * @param {DadosNovoAderido} dadosNovos - Payload com nome, e-mail, telefone, modalidade e cargo.
   * @returns {Promise<{ idAderido: string; modalidade: ModalidadeAdesao; bilhetesGerados: number; faixaRifas: { inicio: string; fim: string } }>}
   *          Dados do aderido criado e faixa de rifas reservada.
   * @throws {AppError} Se o e-mail já estiver cadastrado, a posição já existir ou os bilhetes estiverem ocupados.
   * @transactional Executa leitura e gravação atômica via `db.runTransaction` garantindo consistência TOCTOU.
   * @sideEffects Criação de docs em `usuarios`, `indices_usuarios_email`, múltiplos `bilhetes` e atualização em `contadores/aderidos`.
   */
  async adicionarAderido(dadosNovos: DadosNovoAderido) {
    const dados = normalizarDadosNovoAderido(dadosNovos);

    const bilhetesPorPessoa = BILHETES_POR_MODALIDADE[dados.modalidade_adesao];
    const metaVendas = META_VENDAS_POR_MODALIDADE[dados.modalidade_adesao];

    // TOCTOU limit: Firestore doesn't support queries inside runTransaction
    const emailSnapshot = await db
      .collection("usuarios")
      .where("email", "==", dados.email)
      .limit(1)
      .get();

    if (!emailSnapshot.empty) {
      throw new AppError("EMAIL_DUPLICADO", "Este e-mail já foi autorizado anteriormente.", 400);
    }

    const contadorRef = db.collection("contadores").doc("aderidos");
    const contadorPrecheck = await contadorRef.get();
    const dadosContadorPrecheck = contadorPrecheck.exists
      ? contadorPrecheck.data()
      : undefined;
    const contadorPrecheckNormalizado = normalizarEstadoContadorAderidos(
      dadosContadorPrecheck,
    );
    const contadorPrecisaFallback =
      !contadorPrecheck.exists ||
      !contadorPrecheckNormalizado.ultimaPosicao ||
      !contadorPrecheckNormalizado.ultimoBilhete;

    // Compatibilidade legada: bases antigas podem não ter o contador,
    // mas já possuem usuários/bilhetes suficientes para reconstruir a próxima faixa.
    const contadorLegadoFallback = contadorPrecisaFallback
      ? await carregarFallbackContadorLegado()
      : undefined;
    const indiceEmailId = gerarIdIndiceEmailSecretaria(dados.email);
    
    let idAderido = "";
    let numeroInicio = "";
    let numeroFim = "";

    await db.runTransaction(async (transaction) => {
      const contadorExistente = await transaction.get(contadorRef);
      const dadosContador = contadorExistente.exists
        ? contadorExistente.data()
        : undefined;
      const { ultimaPosicao, ultimoBilhete } = normalizarEstadoContadorAderidos(
        dadosContador,
        contadorLegadoFallback,
      );

      const proximaPosicao = ultimaPosicao + 1;
      const proximoNumeroBilhete = ultimoBilhete + 1;

      idAderido = `ADERIDO_${String(proximaPosicao).padStart(3, "0")}`;
      const userRef = db.collection("usuarios").doc(idAderido);
      const indiceEmailRef = db
        .collection(COLECAO_INDICES_EMAIL)
        .doc(indiceEmailId);

      numeroInicio = String(proximoNumeroBilhete).padStart(5, "0");
      numeroFim = String(proximoNumeroBilhete + bilhetesPorPessoa - 1).padStart(5, "0");

      const bilheteRefs = Array.from({ length: bilhetesPorPessoa }, (_, index) => {
        const numeroString = String(proximoNumeroBilhete + index).padStart(5, "0");
        return db.collection("bilhetes").doc(numeroString);
      });

      const [indiceEmailSnap, usuarioSnap, ...bilheteSnaps] =
        await Promise.all([
          transaction.get(indiceEmailRef),
          transaction.get(userRef),
          ...bilheteRefs.map((bilheteRef) => transaction.get(bilheteRef)),
        ]);

      if (indiceEmailSnap.exists) {
        throw new AppError(
          "EMAIL_DUPLICADO",
          "Este e-mail já foi autorizado anteriormente.",
          400,
        );
      }

      if (usuarioSnap.exists) {
        throw new AppError(
          "ID_ADERIDO_JA_EXISTE",
          "Não foi possível reservar a próxima posição de aderido.",
          409,
        );
      }

      const bilheteOcupado = bilheteSnaps.find((bilheteSnap) => bilheteSnap.exists);

      if (bilheteOcupado) {
        throw new AppError(
          "FAIXA_RIFAS_INDISPONIVEL",
          "A faixa de rifas calculada já possui bilhetes cadastrados.",
          409,
        );
      }

      const novoUsuario: Usuario & {
        posicao_adesao: number;
        curso?: string;
        data_nascimento?: string;
        modalidade_adesao: ModalidadeAdesao;
        status_cadastro: "pendente";
      } = {
        id: idAderido,
        id_aderido: idAderido,
        posicao_adesao: proximaPosicao,

        uid: null,
        cpf: "",
        email: dados.email,
        nome: dados.nome,
        curso: dados.curso,
        data_nascimento: dados.data_nascimento,
        telefone: dados.telefone,

        role: dados.cargo,
        modalidade_adesao: dados.modalidade_adesao,

        faixa_rifas: {
          inicio: numeroInicio,
          fim: numeroFim,
        },

        meta_vendas: metaVendas,
        total_arrecadado: 0,
        rifas_vendidas: 0,

        status: "pendente",
        status_cadastro: "pendente",

        criado_em: new Date().toISOString(),
      };

      transaction.set(userRef, novoUsuario);
      transaction.set(indiceEmailRef, {
        email: dados.email,
        usuario_id: idAderido,
        criado_em: novoUsuario.criado_em,
      });

      let b = proximoNumeroBilhete;
      const fim = proximoNumeroBilhete + bilhetesPorPessoa;

      for (; b < fim; b++) {
        const numeroString = String(b).padStart(5, "0");
        const bilheteRef = db.collection("bilhetes").doc(numeroString);

        transaction.set(bilheteRef, {
          numero: numeroString,
          status: "disponivel",

          vendedor_cpf: "",
          vendedor_id: idAderido,
          vendedor_nome: dados.nome,

          comprador_id: null,
          data_reserva: null,
          data_pagamento: null,
          comprovante_url: null,
        } as Bilhete);
      }

      transaction.set(contadorRef, {
        ultima_posicao: proximaPosicao,
        ultimo_bilhete: fim - 1,
      }, { merge: true });
    });

    return {
      idAderido,
      modalidade: dados.modalidade_adesao,
      bilhetesGerados: bilhetesPorPessoa,
      faixaRifas: {
        inicio: numeroInicio,
        fim: numeroFim,
      },
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
   * @transactional Validação de concorrência e atualização via `db.runTransaction`.
   * @sideEffects Atualização no documento `usuarios/{id}` e propagação de custom claims no Firebase Auth Admin.
   */
  async atualizarAderido(idAderido: string, dados: DadosAtualizacaoAderido) {
    const aderidoRef = db.collection("usuarios").doc(idAderido);
    const camposAtualizacao = montarCamposAtualizacaoAderido(dados);
    let uidAderido: string | null = null;
    let novoCargo: string | undefined = dados.cargo;

    await db.runTransaction(async (transaction) => {
      const aderidoSnap = await transaction.get(aderidoRef);

      if (!aderidoSnap.exists) {
        throw new AppError("NAO_ENCONTRADO", "Aderido não encontrado.", 404);
      }

      const aderidoAtual = aderidoSnap.data();
      uidAderido = aderidoAtual?.uid;

      if (
        aderidoAtual?.status_cadastro === "ativo" &&
        dados.status_cadastro === "pendente"
      ) {
        throw new AppError(
          "TRANSICAO_STATUS_INVALIDA",
          "Não é permitido alterar um aderido ativo para pendente.",
          400
        );
      }

      transaction.update(aderidoRef, camposAtualizacao);
    });

    // Se o cargo foi alterado e o usuário já vinculou Firebase Auth, atualiza custom claims
    if (novoCargo && uidAderido) {
      try {
        await auth.setCustomUserClaims(uidAderido, { cargo: novoCargo });
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
