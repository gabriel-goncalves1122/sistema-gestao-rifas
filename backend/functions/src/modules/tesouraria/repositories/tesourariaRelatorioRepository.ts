// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/repositories/tesourariaRelatorioRepository.ts
// ============================================================================

import * as admin from "firebase-admin";

import { Bilhete, Usuario } from "../../types/models";
import {
  aplicarSelectSeguro,
  CAMPOS_PROJECAO_BILHETE_TESOURARIA,
} from "../helpers/pixTransacoesHelper";
import {
  extrairDocsSnapshot,
  MapaVendedores,
  cpfEhValido,
  criarMapaVendedores,
} from "../helpers/vendedorLookupHelper";
import { DadosAtualizacaoCompradorCompra } from "../types/tesourariaTypes";

/**
 * Repositório Firestore dedicado às consultas de relatório/histórico da Tesouraria
 * e à atualização transacional de dados cadastrais do comprador e seus bilhetes.
 */
export class TesourariaRelatorioRepository {
  /**
   * Carrega simultaneamente a coleção de usuários e todos os bilhetes ativos em venda/pagos.
   */
  static async carregarUsuariosEBilhetesRelatorio() {
    const db = admin.firestore();
    const bilhetesQuery = aplicarSelectSeguro(
      db.collection("bilhetes").where("status", "in", ["pago", "pendente", "reservado"]),
      CAMPOS_PROJECAO_BILHETE_TESOURARIA,
    );

    const [usuariosSnap, bilhetesSnap] = await Promise.all([
      db.collection("usuarios").get(),
      bilhetesQuery.get(),
    ]);

    return {
      usuariosDocs: extrairDocsSnapshot<Partial<Usuario>>(usuariosSnap),
      bilhetesDocs: extrairDocsSnapshot<Bilhete>(bilhetesSnap),
    };
  }

  /**
   * Carrega todos os bilhetes negociados (inclusive recusados) e, apenas quando necessário,
   * o mapa de vendedores para enriquecimento de CPF e nome ausentes.
   */
  static async carregarHistoricoComVendedores() {
    const db = admin.firestore();
    const bilhetesQuery = aplicarSelectSeguro(
      db
        .collection("bilhetes")
        .where("status", "in", ["pago", "pendente", "reservado", "recusado"])
        .limit(5000),
      CAMPOS_PROJECAO_BILHETE_TESOURARIA,
    );

    const bilhetesSnap = await bilhetesQuery.get();
    const bilhetesDocs = extrairDocsSnapshot<Bilhete>(bilhetesSnap);

    const precisaEnriquecerVendedor = bilhetesDocs.some((doc) => {
      const data = doc.data() as Bilhete;
      return Boolean(
        data.vendedor_id && (!cpfEhValido(data.vendedor_cpf) || !data.vendedor_nome),
      );
    });

    let mapaVendedores: MapaVendedores | null = null;
    if (precisaEnriquecerVendedor) {
      const usuariosSnap = await db.collection("usuarios").get();
      const usuariosDocs = extrairDocsSnapshot<Partial<Usuario>>(usuariosSnap);
      if (usuariosDocs.length > 0) {
        mapaVendedores = criarMapaVendedores(usuariosDocs);
      }
    }

    return { bilhetesDocs, mapaVendedores };
  }

  /**
   * Atualiza os dados do comprador na coleção `compradores` (fonte de verdade)
   * e propaga para todos os bilhetes vinculados dentro de uma transação ACID (`runTransaction`),
   * executando todas as leituras antes das escritas para prevenir TOCTOU.
   *
   * @param {string} compradorId - ID do documento em `compradores`.
   * @param {DadosAtualizacaoCompradorCompra} dados - Novos dados cadastrais.
   * @returns {Promise<Record<string, unknown>>} Resumo da operação transacional.
   * @throws {Error} `"COMPRA_NAO_ENCONTRADA"` se nenhum bilhete estiver associado a `compradorId`.
   * @transactional Executa em `db.runTransaction`.
   */
  static async atualizarCompradorAtomicamente(
    compradorId: string,
    dados: DadosAtualizacaoCompradorCompra,
  ) {
    const db = admin.firestore();

    return db.runTransaction(async (transaction) => {
      const bilhetesQuery = db
        .collection("bilhetes")
        .where("comprador_id", "==", compradorId);
      const bilhetesSnap = await transaction.get(bilhetesQuery);

      if (bilhetesSnap.empty) {
        throw new Error("COMPRA_NAO_ENCONTRADA");
      }

      const compradorRef = db.collection("compradores").doc(compradorId);
      const compradorSnap = await transaction.get(compradorRef);

      const bilheteAtualizado = {
        comprador_nome: dados.nome,
        comprador_email: dados.email || null,
        comprador_telefone: dados.telefone || null,
      };

      const compradorDocAtualizado = {
        nome: dados.nome,
        email: dados.email || null,
        telefone: dados.telefone || null,
      };

      const pixOrderIds = new Set<string>();
      bilhetesSnap.docs.forEach((doc) => {
        const bilhete =
          (typeof (doc as any).data === "function" ? (doc as any).data() : (doc as any).data) || {};
        if (bilhete.pix_order_id) {
          pixOrderIds.add(String(bilhete.pix_order_id));
        }
        transaction.update(doc.ref, bilheteAtualizado);
      });

      if (compradorSnap.exists) {
        transaction.update(compradorRef, compradorDocAtualizado);
      }

      pixOrderIds.forEach((orderId) => {
        const pagRef = db.collection("pagamentos_pix").doc(orderId);
        transaction.set(
          pagRef,
          {
            comprador_nome: dados.nome,
            comprador_email: dados.email || null,
            comprador_telefone: dados.telefone || null,
          },
          { merge: true },
        );
      });

      return {
        comprador_id: compradorId,
        ...compradorDocAtualizado,
        rifasAtualizadas: bilhetesSnap.size,
        compradorDocumentoAtualizado: compradorSnap.exists,
      };
    });
  }
}
