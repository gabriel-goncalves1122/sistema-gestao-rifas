import * as admin from "firebase-admin";

import { CheckoutStrategyFactory } from "../checkout/checkoutStrategyFactory";
import { CheckoutPixRepository } from "../checkout/repositories/checkoutPixRepository";
import { Bilhete, PagamentoPix, Usuario } from "../../types/models";
import {
  BilheteComNumero,
  PixTransacao,
  PixTransacoesResumo,
  ResultadoSincronizacaoPix,
  ResumoComprovantesTesouraria,
} from "../../tesouraria/types/tesourariaTypes";
import { resolverProvedorRegistro } from "../helpers/origemPagamentoHelper";
import {
  aplicarSelectSeguro,
  calcularResumoComprovantes,
  calcularResumoPixTransacoes,
  CAMPOS_PROJECAO_BILHETE_TESOURARIA,
  chaveCompra,
  montarPixTransacao,
  valorDataSeguro,
} from "../helpers/pixTransacoesHelper";
import { isReservaBilheteExpirada } from "../helpers/checkoutPixHelper";
import {
  cpfEhValido,
  criarMapaVendedores,
  extrairDocsSnapshot,
  MapaVendedores,
} from "../helpers/vendedorLookupHelper";

export class PixTransacoesService {
  /**
   * Carrega e separa em passagem única os bilhetes de transações Pix automatizadas
   * e os bilhetes de compras manuais por comprovante, enriquecendo vendedores quando necessário.
   *
   * @returns {Promise<{ transacoes: PixTransacao[]; resumoComprovantes: ResumoComprovantesTesouraria }>}
   *          Transações Pix ordenadas e resumo consolidado das vendas por comprovante.
   */
  private static async carregarDadosTransacoes(): Promise<{
    transacoes: PixTransacao[];
    resumoComprovantes: ResumoComprovantesTesouraria;
  }> {
    const db = admin.firestore();
    const bilhetesQuery = aplicarSelectSeguro(
      db
        .collection("bilhetes")
        .where("status", "in", ["pago", "pendente", "recusado", "reservado"])
        .limit(20000),
      CAMPOS_PROJECAO_BILHETE_TESOURARIA,
    );
    const bilhetesSnap = await bilhetesQuery.get();

    const gruposTransacoes = new Map<string, BilheteComNumero[]>();
    const bilhetesManuais: BilheteComNumero[] = [];
    let precisaEnriquecerVendedor = false;

    extrairDocsSnapshot<Bilhete>(bilhetesSnap).forEach((doc) => {
      const data = doc.data() as Bilhete;
      if (isReservaBilheteExpirada(data)) {
        return;
      }

      const bilhete: BilheteComNumero = {
        ...data,
        numero: doc.id,
      };

      if (resolverProvedorRegistro(data) === "COMPROVANTE_PURO") {
        bilhetesManuais.push(bilhete);
      }

      if (data.vendedor_id && !cpfEhValido(data.vendedor_cpf)) {
        precisaEnriquecerVendedor = true;
      }

      const chave = chaveCompra(bilhete);
      const grupoAtual = gruposTransacoes.get(chave) || [];

      grupoAtual.push(bilhete);
      gruposTransacoes.set(chave, grupoAtual);
    });

    let mapaVendedores: MapaVendedores | null = null;
    if (precisaEnriquecerVendedor) {
      const usuariosSnap = await db.collection("usuarios").get();
      const usuariosDocs = extrairDocsSnapshot<Partial<Usuario>>(usuariosSnap);
      if (usuariosDocs.length > 0) {
        mapaVendedores = criarMapaVendedores(usuariosDocs);
      }
    }

    const transacoes = Array.from(gruposTransacoes.values())
      .map((grupo) => montarPixTransacao(grupo, mapaVendedores))
      .sort(
        (a, b) =>
          valorDataSeguro(b.dataPagamento || b.dataCriacao) -
          valorDataSeguro(a.dataPagamento || a.dataCriacao),
      );

    const resumoComprovantes = calcularResumoComprovantes(bilhetesManuais);

    return { transacoes, resumoComprovantes };
  }

  /**
   * Busca e agrupa todas as transações Pix automatizadas para a fila e visão geral da Tesouraria.
   *
   * @returns {Promise<PixTransacao[]>} Lista de transações Pix ordenadas por data mais recente.
   */
  static async buscarTransacoes(): Promise<PixTransacao[]> {
    const { transacoes } = await this.carregarDadosTransacoes();
    return transacoes;
  }

  /**
   * Obtém o resumo financeiro unificado da Tesouraria contendo os indicadores de Pix,
   * de rifas negociadas por comprovante manual e do Total Geral consolidado.
   *
   * @returns {Promise<PixTransacoesResumo>} Objeto de resumo financeiro da Tesouraria.
   */
  static async obterResumo(): Promise<PixTransacoesResumo> {
    const { transacoes, resumoComprovantes } = await this.carregarDadosTransacoes();
    return calcularResumoPixTransacoes(transacoes, resumoComprovantes);
  }


  /**
   * Percorre as cobranças Pix em aberto no Firestore e sincroniza seus estados
   * polimorficamente via `CheckoutStrategyFactory` (Mercado Pago consulta o gateway;
   * Pix Normal/EMV Offline retorna sem chamadas externas).
   *
   * @returns {Promise<ResultadoSincronizacaoPix>} Resumo com total de cobranças atualizadas.
   */
  static async sincronizar(): Promise<ResultadoSincronizacaoPix> {
    const db = admin.firestore();
    const pagamentosSnap = await db
      .collection("pagamentos_pix")
      .where("status_pagamento_banco", "in", ["WAITING", "IN_ANALYSIS", "pending"])
      .get();

    if (pagamentosSnap.empty) {
      return {
        sucesso: true,
        sincronizado: false,
        atualizados: 0,
        mensagem: "Nenhuma cobrança Pix aberta para sincronizar.",
      };
    }

    let atualizados = 0;
    const repository = new CheckoutPixRepository(db);

    for (const doc of pagamentosSnap.docs) {
      const dados = doc.data() as PagamentoPix;
      const orderId = String(dados.pix_order_id || dados.id || doc.id);

      if (!orderId) continue;

      try {
        const strategy = CheckoutStrategyFactory.obterPorPagamento(dados, repository);
        const sincronizado = await strategy.sincronizarCheckout({
          ...dados,
          id: dados.id || doc.id,
          pix_order_id: dados.pix_order_id || orderId,
        });

        if (sincronizado) {
          atualizados += 1;
        }
      } catch (err) {
        console.warn(`[PixTransacoesService] Falha ao sincronizar pedido ${orderId}:`, err);
      }
    }

    return {
      sucesso: true,
      sincronizado: atualizados > 0,
      atualizados,
      mensagem: "Sincronização Pix concluída.",
    };
  }
}
