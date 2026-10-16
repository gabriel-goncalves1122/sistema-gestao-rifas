import * as admin from "firebase-admin";

import { MercadoPagoPixClient } from "../../../shared/services/mercadoPagoPixClient";
import { CheckoutPixWebhookService } from "./checkoutPixWebhookService";
import { Bilhete, Usuario } from "../../types/models";
import {
  BilheteComNumero,
  PixTransacao,
  PixTransacoesResumo,
  ResultadoSincronizacaoPix,
  ResumoComprovantesTesouraria,
} from "../../tesouraria/types/tesourariaTypes";
import {
  calcularResumoComprovantes,
  calcularResumoPixTransacoes,
  chaveCompra,
  montarPixTransacao,
  valorDataSeguro,
} from "../helpers/pixTransacoesHelper";
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
    const bilhetesSnap = await db
      .collection("bilhetes")
      .where("status", "in", ["pago", "pendente", "recusado", "reservado"])
      .limit(5000)
      .get();

    const gruposPix = new Map<string, BilheteComNumero[]>();
    const bilhetesManuais: BilheteComNumero[] = [];
    let precisaEnriquecerVendedor = false;

    extrairDocsSnapshot<Bilhete>(bilhetesSnap).forEach((doc) => {
      const data = doc.data() as Bilhete;
      const bilhete: BilheteComNumero = {
        ...data,
        numero: doc.id,
      };

      if (!data.pix_order_id) {
        bilhetesManuais.push(bilhete);
        return;
      }

      if (data.vendedor_id && !cpfEhValido(data.vendedor_cpf)) {
        precisaEnriquecerVendedor = true;
      }

      const chave = chaveCompra(bilhete);
      const grupoAtual = gruposPix.get(chave) || [];

      grupoAtual.push(bilhete);
      gruposPix.set(chave, grupoAtual);
    });

    let mapaVendedores: MapaVendedores | null = null;
    if (precisaEnriquecerVendedor) {
      const usuariosSnap = await db.collection("usuarios").get();
      const usuariosDocs = extrairDocsSnapshot<Partial<Usuario>>(usuariosSnap);
      if (usuariosDocs.length > 0) {
        mapaVendedores = criarMapaVendedores(usuariosDocs);
      }
    }

    const transacoes = Array.from(gruposPix.values())
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

    for (const doc of pagamentosSnap.docs) {
      const dados = doc.data();
      const orderId = String(dados.pix_order_id || dados.id || doc.id);

      if (!orderId) continue;

      const pedido = await MercadoPagoPixClient.consultarPedido(orderId);

      await CheckoutPixWebhookService.processarPayloadConfiavel(pedido);
      atualizados += 1;
    }

    return {
      sucesso: true,
      sincronizado: atualizados > 0,
      atualizados,
      mensagem: "Sincronização Pix concluída.",
    };
  }
}
