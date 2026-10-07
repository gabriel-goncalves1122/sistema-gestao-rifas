import * as admin from "firebase-admin";

import { MercadoPagoPixClient } from "../../../shared/services/mercadoPagoPixClient";
import { CheckoutPixWebhookService } from "./checkoutPixWebhookService";
import { Bilhete } from "../../types/models";
import {
  BilheteComNumero,
  PixTransacao,
  PixTransacoesResumo,
  ResultadoSincronizacaoPix,
} from "../../tesouraria/types/tesourariaTypes";
import {
  calcularResumoPixTransacoes,
  chaveCompra,
  montarPixTransacao,
  valorDataSeguro,
} from "../helpers/pixTransacoesHelper";

export class PixTransacoesService {
  static async buscarTransacoes(): Promise<PixTransacao[]> {
    const db = admin.firestore();
    const bilhetesSnap = await db
      .collection("bilhetes")
      .where("status", "in", ["pago", "pendente", "recusado", "reservado"])
      .limit(5000)
      .get();

    const grupos = new Map<string, BilheteComNumero[]>();

    bilhetesSnap.docs.forEach((doc) => {
      const data = doc.data() as Bilhete;

      if (!data.pix_order_id) return;

      const bilhete = {
        ...data,
        numero: doc.id,
      };
      const chave = chaveCompra(bilhete);
      const grupoAtual = grupos.get(chave) || [];

      grupoAtual.push(bilhete);
      grupos.set(chave, grupoAtual);
    });

    return Array.from(grupos.values())
      .map(montarPixTransacao)
      .sort(
        (a, b) =>
          valorDataSeguro(b.dataPagamento || b.dataCriacao) -
          valorDataSeguro(a.dataPagamento || a.dataCriacao),
      );
  }

  static async obterResumo(): Promise<PixTransacoesResumo> {
    return calcularResumoPixTransacoes(await this.buscarTransacoes());
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
