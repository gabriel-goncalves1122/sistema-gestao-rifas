import * as admin from "firebase-admin";

import { Bilhete } from "../../types/models";
import { NotificacoesService } from "../../notificacoes/notificacoesService";
export class NotificarCorrecaoDadosService {
  static async notificar(compradorId: string, mensagem: string): Promise<void> {
    const db = admin.firestore();

    await db.runTransaction(async (transaction) => {
      const bilhetesSnap = await transaction.get(
        db.collection("bilhetes").where("comprador_id", "==", compradorId),
      );

      if (bilhetesSnap.empty) {
        throw new Error("COMPRA_NAO_ENCONTRADA");
      }

      const bilhetes = bilhetesSnap.docs.map((doc) => ({
        numero: doc.id,
        dados: doc.data() as Bilhete,
        ref: doc.ref,
      }));

      // Verifica se todos estão pagos (opcional dependendo da regra, mas geralmente sim)
      const todosPagos = bilhetes.every(
        ({ dados }) => (dados.status || "").toLowerCase().trim() === "pago",
      );

      if (!todosPagos) {
        throw new Error("COMPRA_NAO_PAGA");
      }

      const vendedorId = bilhetes.find(({ dados }) => dados.vendedor_id)?.dados
        .vendedor_id;

      if (!vendedorId) {
        throw new Error("VENDA_SEM_VENDEDOR");
      }

      const rifas = bilhetes
        .map(({ numero, dados }) => String(dados.numero || numero))
        .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

      // 1. Atualizar todos os bilhetes para correcao_pendente = true e registrar motivo
      bilhetes.forEach(({ ref }) => {
        transaction.update(ref, {
          correcao_pendente: true,
          motivo_recusa: mensagem,
        });
      });

      // 2. Criar a notificação
      NotificacoesService.criarNotificacaoCorrecaoDados(
        transaction,
        vendedorId,
        mensagem,
        rifas,
      );
    });
  }
}
