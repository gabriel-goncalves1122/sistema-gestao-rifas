// ============================================================================
// ARQUIVO: backend/functions/src/modules/admin/secretaria/repositories/secretariaRepository.ts
// ============================================================================

import { db } from "../../../../shared/config/firebaseAdmin";
import { AppError } from "../../../../shared/classes/AppError";
import { Bilhete, Usuario } from "../../../types/models";
import { DadosAtualizacaoAderido, ModalidadeAdesao } from "../secretariaTypes";
import {
  EstadoContadorAderidos,
  normalizarEstadoContadorAderidos,
  reconstruirEstadoContadorAderidosLegado,
} from "../helpers/contadorAderidosHelper";
import { gerarIdIndiceEmailSecretaria } from "../helpers/emailIndexHelper";

const COLECAO_INDICES_EMAIL = "indices_usuarios_email";

/**
 * Repositório Firestore dedicado às operações de aderidos, índices de e-mail,
 * contador sequencial e alocação atômica de faixas de bilhetes na Secretaria.
 */
export const secretariaRepository = {
  /**
   * Lista todos os documentos da coleção `usuarios`.
   */
  async listarUsuariosDocs() {
    const querySnapshot = await db.collection("usuarios").get();
    return querySnapshot.docs || [];
  },

  /**
   * Verifica previamente se já existe usuário cadastrado com o e-mail informado.
   */
  async emailJaExiste(email: string): Promise<boolean> {
    const snapshot = await db
      .collection("usuarios")
      .where("email", "==", email)
      .limit(1)
      .get();

    return !snapshot.empty;
  },

  /**
   * Carrega o estado prévio do contador de aderidos e, caso ausente ou incompleto,
   * reconstrói o estado legado lendo `usuarios` e `bilhetes`.
   */
  async carregarContadorComFallbackLegado(): Promise<EstadoContadorAderidos | undefined> {
    const contadorRef = db.collection("contadores").doc("aderidos");
    const contadorPrecheck = await contadorRef.get();
    const dadosPrecheck = contadorPrecheck.exists ? contadorPrecheck.data() : undefined;
    const normalizado = normalizarEstadoContadorAderidos(dadosPrecheck);

    const precisaFallback =
      !contadorPrecheck.exists || !normalizado.ultimaPosicao || !normalizado.ultimoBilhete;

    if (!precisaFallback) {
      return undefined;
    }

    const [usuariosSnapshot, bilhetesSnapshot] = await Promise.all([
      db.collection("usuarios").get(),
      db.collection("bilhetes").get(),
    ]);

    return reconstruirEstadoContadorAderidosLegado(
      usuariosSnapshot.docs || [],
      bilhetesSnapshot.docs || [],
    );
  },

  /**
   * Executa a transação ACID de criação de aderido, índice de e-mail, faixa de bilhetes e contador.
   *
   * @transactional Realiza todas as leituras prévias antes das escritas em `db.runTransaction`.
   */
  async criarAderidoAtomicamente(params: {
    dados: {
      email: string;
      nome: string;
      curso?: string;
      data_nascimento?: string;
      telefone?: string;
      cargo: Usuario["cargo"];
      modalidade_adesao: ModalidadeAdesao;
    };
    bilhetesPorPessoa: number;
    metaVendas: number;
    contadorLegadoFallback?: EstadoContadorAderidos;
  }): Promise<{
    idAderido: string;
    numeroInicio: string;
    numeroFim: string;
  }> {
    const { dados, bilhetesPorPessoa, metaVendas, contadorLegadoFallback } = params;
    const contadorRef = db.collection("contadores").doc("aderidos");
    const indiceEmailId = gerarIdIndiceEmailSecretaria(dados.email);

    let idAderido = "";
    let numeroInicio = "";
    let numeroFim = "";

    await db.runTransaction(async (transaction) => {
      const contadorExistente = await transaction.get(contadorRef);
      const dadosContador = contadorExistente.exists ? contadorExistente.data() : undefined;
      const { ultimaPosicao, ultimoBilhete } = normalizarEstadoContadorAderidos(
        dadosContador,
        contadorLegadoFallback,
      );

      const proximaPosicao = ultimaPosicao + 1;
      const proximoNumeroBilhete = ultimoBilhete + 1;

      idAderido = `ADERIDO_${String(proximaPosicao).padStart(3, "0")}`;
      const userRef = db.collection("usuarios").doc(idAderido);
      const indiceEmailRef = db.collection(COLECAO_INDICES_EMAIL).doc(indiceEmailId);

      numeroInicio = String(proximoNumeroBilhete).padStart(5, "0");
      numeroFim = String(proximoNumeroBilhete + bilhetesPorPessoa - 1).padStart(5, "0");

      const bilheteRefs = Array.from({ length: bilhetesPorPessoa }, (_, index) =>
        db.collection("bilhetes").doc(String(proximoNumeroBilhete + index).padStart(5, "0")),
      );

      const [indiceEmailSnap, usuarioSnap, ...bilheteSnaps] = await Promise.all([
        transaction.get(indiceEmailRef),
        transaction.get(userRef),
        ...bilheteRefs.map((ref) => transaction.get(ref)),
      ]);

      if (indiceEmailSnap.exists) {
        throw new AppError("EMAIL_DUPLICADO", "Este e-mail já foi autorizado anteriormente.", 400);
      }

      if (usuarioSnap.exists) {
        throw new AppError(
          "ID_ADERIDO_JA_EXISTE",
          "Não foi possível reservar a próxima posição de aderido.",
          409,
        );
      }

      if (bilheteSnaps.some((snap) => snap.exists)) {
        throw new AppError(
          "FAIXA_RIFAS_INDISPONIVEL",
          "A faixa de rifas calculada já possui bilhetes cadastrados.",
          409,
        );
      }

      const agora = new Date().toISOString();
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
        cargo: dados.cargo,
        modalidade_adesao: dados.modalidade_adesao,
        faixa_rifas: { inicio: numeroInicio, fim: numeroFim },
        meta_vendas: metaVendas,
        total_arrecadado: 0,
        rifas_vendidas: 0,
        status: "pendente",
        status_cadastro: "pendente",
        criado_em: agora,
      };

      transaction.set(userRef, novoUsuario);
      transaction.set(indiceEmailRef, {
        email: dados.email,
        usuario_id: idAderido,
        criado_em: agora,
      });

      const fim = proximoNumeroBilhete + bilhetesPorPessoa;
      for (let b = proximoNumeroBilhete; b < fim; b++) {
        const numeroString = String(b).padStart(5, "0");
        transaction.set(db.collection("bilhetes").doc(numeroString), {
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

      transaction.set(
        contadorRef,
        { ultima_posicao: proximaPosicao, ultimo_bilhete: fim - 1 },
        { merge: true },
      );
    });

    return { idAderido, numeroInicio, numeroFim };
  },

  /**
   * Executa a atualização transacional de um aderido, validando transição de status e
   * sincronizando o índice único de e-mail caso o endereço tenha sido alterado.
   *
   * @transactional Executa em `db.runTransaction`.
   */
  async atualizarAderidoAtomicamente(params: {
    idAderido: string;
    dados: DadosAtualizacaoAderido;
    camposAtualizacao: Record<string, unknown>;
  }): Promise<{ uidAderido: string | null }> {
    const { idAderido, dados, camposAtualizacao } = params;
    const aderidoRef = db.collection("usuarios").doc(idAderido);
    let uidAderido: string | null = null;

    await db.runTransaction(async (transaction) => {
      const aderidoSnap = await transaction.get(aderidoRef);
      if (!aderidoSnap.exists) {
        throw new AppError("NAO_ENCONTRADO", "Aderido não encontrado.", 404);
      }

      const aderidoAtual = aderidoSnap.data();
      uidAderido = aderidoAtual?.uid ?? null;

      if (aderidoAtual?.status_cadastro === "ativo" && dados.status_cadastro === "pendente") {
        throw new AppError(
          "TRANSICAO_STATUS_INVALIDA",
          "Não é permitido alterar um aderido ativo para pendente.",
          400,
        );
      }

      let novoIndiceRef: FirebaseFirestore.DocumentReference | null = null;
      let antigoIndiceRef: FirebaseFirestore.DocumentReference | null = null;
      const novoEmail =
        typeof camposAtualizacao.email === "string" ? camposAtualizacao.email : undefined;

      if (novoEmail && novoEmail !== aderidoAtual?.email) {
        novoIndiceRef = db
          .collection(COLECAO_INDICES_EMAIL)
          .doc(gerarIdIndiceEmailSecretaria(novoEmail));
        const novoIndiceSnap = await transaction.get(novoIndiceRef);

        if (novoIndiceSnap.exists) {
          const donoIndice = novoIndiceSnap.data()?.usuario_id;
          if (donoIndice && donoIndice !== idAderido) {
            throw new AppError(
              "EMAIL_DUPLICADO",
              "Este e-mail já pertence a outro aderido.",
              400,
            );
          }
        }

        if (aderidoAtual?.email) {
          antigoIndiceRef = db
            .collection(COLECAO_INDICES_EMAIL)
            .doc(gerarIdIndiceEmailSecretaria(aderidoAtual.email));
        }
      }

      if (novoIndiceRef && novoEmail) {
        transaction.set(novoIndiceRef, {
          email: novoEmail,
          usuario_id: idAderido,
          criado_em: new Date().toISOString(),
        });
        if (antigoIndiceRef) {
          transaction.delete(antigoIndiceRef);
        }
      }

      transaction.update(aderidoRef, camposAtualizacao);
    });

    return { uidAderido };
  },
};
