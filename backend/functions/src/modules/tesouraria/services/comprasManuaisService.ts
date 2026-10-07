// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/services/comprasManuaisService.ts
// ============================================================================
import * as admin from "firebase-admin";

import { enviarEmailRecibo } from "../../rifas/emailService";
import { PixValidacaoService } from "./pixValidacaoService";


export class ComprasManuaisService {
  static async aceitarCompra(params: {
    chave: string;
    uidTesouraria: string;
    emailTesouraria?: string;
  }) {
    // Se a chave for de uma transação Pix, redireciona para o serviço do Pix
    if (params.chave.startsWith("pix-")) {
      const transacaoId = params.chave;
      return PixValidacaoService.aceitarTransacao({
        transacaoId,
        uidTesouraria: params.uidTesouraria,
        emailTesouraria: params.emailTesouraria,
      });
    }

    const db = admin.firestore();
    let query: admin.firestore.Query = db.collection("bilhetes");

    if (params.chave.startsWith("comprovante-")) {
      query = query.where("comprovante_url", "==", params.chave.replace("comprovante-", ""));
    } else if (params.chave.startsWith("comprador-")) {
      query = query.where("comprador_id", "==", params.chave.replace("comprador-", ""));
    } else if (params.chave.startsWith("pixref-")) {
      query = query.where("pix_reference_id", "==", params.chave.replace("pixref-", ""));
    } else if (params.chave.startsWith("manual|")) {
      const partes = params.chave.split("|");
      if (partes.length === 4) {
        if (partes[1] !== "sem-comprador") query = query.where("comprador_nome", "==", partes[1]);
        if (partes[2] !== "sem-data") query = query.where("data_reserva", "==", partes[2]);
        query = query.where("status", "==", partes[3]);
      } else {
        throw new Error("CANNOT_PARSE_MANUAL_KEY");
      }
    } else {
      throw new Error("CHAVE_INVALIDA");
    }

    return await db.runTransaction(async (transaction) => {
      const bilhetesSnap = await transaction.get(query);

      if (bilhetesSnap.empty) {
        throw new Error("COMPRA_NOT_FOUND");
      }

      let aceitos = 0;
      const numerosRifas: string[] = [];
      let compradorEmail = "";
      let compradorNome = "";

      bilhetesSnap.forEach((snap) => {
        const bilhete = snap.data();
        if (bilhete.status === "pendente" || bilhete.status === "reservado") {
          transaction.set(
            snap.ref,
            {
              status: "pago",
              status_validacao: "aceita",
              data_pagamento: new Date().toISOString(),
              validado_por: params.emailTesouraria || params.uidTesouraria,
              validado_em: new Date().toISOString(),
            },
            { merge: true },
          );

          aceitos++;
          numerosRifas.push(snap.id);
          compradorEmail = compradorEmail || bilhete.comprador_email;
          compradorNome = compradorNome || bilhete.comprador_nome;
        } else if (bilhete.status === "pago") {
          aceitos++;
          numerosRifas.push(snap.id);
        }
      });

      if (aceitos === 0) {
        throw new Error("TRANSACAO_SEM_RIFAS_PENDENTES");
      }

      const emailEnviado = compradorEmail
        ? await enviarEmailRecibo(
            compradorEmail,
            compradorNome || "Comprador",
            numerosRifas,
            "aprovado",
          )
        : false;

      return {
        sucesso: true,
        statusValidacao: "aceita" as const,
        rifas: numerosRifas,
        atualizados: aceitos,
        emailEnviado,
      };
    });
  }

  static async negarCompra(params: {
    chave: string;
    uidTesouraria: string;
    emailTesouraria?: string;
    motivo: string;
  }) {
    if (!params.motivo) {
      throw new Error("MOTIVO_REQUIRED");
    }

    // Se for Pix, redireciona
    if (params.chave.startsWith("pix-")) {
      const transacaoId = params.chave;
      return PixValidacaoService.negarTransacao({
        transacaoId,
        uidTesouraria: params.uidTesouraria,
        emailTesouraria: params.emailTesouraria,
        motivo: params.motivo,
      });
    }

    const db = admin.firestore();
    let query: admin.firestore.Query = db.collection("bilhetes");

    if (params.chave.startsWith("comprovante-")) {
      query = query.where("comprovante_url", "==", params.chave.replace("comprovante-", ""));
    } else if (params.chave.startsWith("comprador-")) {
      query = query.where("comprador_id", "==", params.chave.replace("comprador-", ""));
    } else if (params.chave.startsWith("pixref-")) {
      query = query.where("pix_reference_id", "==", params.chave.replace("pixref-", ""));
    } else if (params.chave.startsWith("manual|")) {
      const partes = params.chave.split("|");
      if (partes.length === 4) {
        if (partes[1] !== "sem-comprador") query = query.where("comprador_nome", "==", partes[1]);
        if (partes[2] !== "sem-data") query = query.where("data_reserva", "==", partes[2]);
        query = query.where("status", "==", partes[3]);
      } else {
        throw new Error("CANNOT_PARSE_MANUAL_KEY");
      }
    } else {
      throw new Error("CHAVE_INVALIDA");
    }

    return await db.runTransaction(async (transaction) => {
      const bilhetesSnap = await transaction.get(query);

      if (bilhetesSnap.empty) {
        throw new Error("COMPRA_NOT_FOUND");
      }

      let recusados = 0;
      const numerosRifas: string[] = [];
      const rifasPorVendedor = new Map<string, string[]>();

      const validadoEm = new Date().toISOString();

      bilhetesSnap.forEach((snap) => {
        const bilhete = snap.data();
        if (bilhete.status === "pendente" || bilhete.status === "reservado" || bilhete.status === "pago") {
          transaction.set(
            snap.ref,
            {
              status: "recusado",
              status_validacao: "negada",
              motivo_recusa: params.motivo,
              validado_por: params.emailTesouraria || params.uidTesouraria,
              validado_em: validadoEm,
            },
            { merge: true },
          );

          recusados++;
          numerosRifas.push(snap.id);

          if (bilhete.vendedor_id) {
            const vendedorRifas = rifasPorVendedor.get(bilhete.vendedor_id) || [];
            vendedorRifas.push(snap.id);
            rifasPorVendedor.set(bilhete.vendedor_id, vendedorRifas);
          }
        }
      });

      if (recusados === 0) {
        throw new Error("TRANSACAO_SEM_RIFAS_VALIDAS");
      }

      // Envia notificação para cada vendedor que teve rifas negadas
      rifasPorVendedor.forEach((rifas, vendedorId) => {
        const notificacaoRef = db.collection("notificacoes").doc();
        transaction.set(notificacaoRef, {
          vendedor_id: vendedorId,
          tipo: "correcao_dados",
          titulo: "Comprovante Manual Recusado",
          mensagem: params.motivo || "Revise os dados do comprovante e tente novamente.",
          rifas,
          lida: false,
          data_criacao: validadoEm,
        });
      });

      return {
        sucesso: true,
        statusValidacao: "negada" as const,
        rifas: numerosRifas,
        atualizados: recusados,
      };
    });
  }
}
