// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/services/pixValidacaoService.ts
// ============================================================================
import * as admin from "firebase-admin";

import { enviarEmailRecibo } from "../../rifas/emailService";

interface ValidarPixParams {
  transacaoId: string;
  uidTesouraria: string;
  emailTesouraria?: string;
  motivo?: string;
}

export class PixValidacaoService {
  static async aceitarTransacao(params: ValidarPixParams) {
    const db = admin.firestore();
    // transacaoId no PIX é geralmente pix-[pix_order_id] ou [pix_order_id]
    const pixOrderId = params.transacaoId.replace("pix-", "");

    if (!pixOrderId) {
      throw new Error("TRANSACAO_SEM_REFERENCIA");
    }

    const validadoEm = new Date().toISOString();
    const validadoPor = params.emailTesouraria || params.uidTesouraria;
    
    let numerosRifasResult: string[] = [];
    let compradorEmailResult: string | null = null;
    let compradorNomeResult: string = "Comprador";


    await db.runTransaction(async (transaction) => {
      const querySnap = await transaction.get(
        db.collection("pagamentos_pix").where("pix_order_id", "==", pixOrderId).limit(1)
      );

      if (querySnap.empty) {
        throw new Error("PAGAMENTO_NOT_FOUND");
      }

      const pagRef = querySnap.docs[0].ref;
      const pagamento = querySnap.docs[0].data() as any;

      if (pagamento.status_validacao === "aceita") {
        throw new Error("PIX_ALREADY_VALIDATED");
      }

      const numerosRifas = pagamento.numeros_rifas || [];

      if (numerosRifas.length === 0) {
        throw new Error("TRANSACAO_SEM_RIFAS");
      }

      const bilhetesRefs = numerosRifas.map((numero: string) =>
        db.collection("bilhetes").doc(numero)
      );
      
      const bilhetesSnaps = await transaction.getAll(...bilhetesRefs);
      
      // Validação opcional: garantir que os bilhetes existam
      const bilhetesInexistentes = bilhetesSnaps.filter(snap => !snap.exists);
      if (bilhetesInexistentes.length > 0) {
        throw new Error("UM_OU_MAIS_BILHETES_NAO_ENCONTRADOS");
      }

      let bilhetesAtualizados = 0;
      bilhetesSnaps.forEach((snap) => {
        const bilhete = snap.data();
        
        if (pagamento.reference_id && (bilhete as any)?.pix_reference_id !== pagamento.reference_id) {
          return; // Bilhete já foi liberado ou pertence a outra transação
        }

        bilhetesAtualizados++;

        transaction.set(
          snap.ref,
          {
            status: "pago",
            status_validacao: "aceita",
            validado_em: validadoEm,
            validado_por: validadoPor,
            motivo_recusa: null,
            data_pagamento: pagamento.data_pagamento || validadoEm,
          },
          { merge: true },
        );
      });

      if (bilhetesSnaps.length > 0 && bilhetesAtualizados === 0) {
        throw new Error("TODOS_BILHETES_PERDIDOS");
      }

      transaction.set(
        pagRef,
        {
          status_validacao: "aceita",
          validado_em: validadoEm,
          validado_por: validadoPor,
          motivo_negacao: null,
        },
        { merge: true },
      );
      
      numerosRifasResult = numerosRifas;
      compradorEmailResult = pagamento.comprador_email || null;
      compradorNomeResult = pagamento.comprador_nome || "Comprador";
      
    });

    const emailEnviado = compradorEmailResult
      ? await enviarEmailRecibo(
          compradorEmailResult,
          compradorNomeResult,
          numerosRifasResult,
          "aprovado",
        )
      : false;

    return {
      sucesso: true,
      statusValidacao: "aceita" as const,
      transacaoId: params.transacaoId,
      rifas: numerosRifasResult,
      emailEnviado,
    };
  }

  static async negarTransacao(params: ValidarPixParams) {
    const motivo = String(params.motivo || "").trim();

    if (!motivo) {
      throw new Error("MOTIVO_REQUIRED");
    }

    const db = admin.firestore();
    const pixOrderId = params.transacaoId.replace("pix-", "");

    if (!pixOrderId) {
      throw new Error("TRANSACAO_SEM_REFERENCIA");
    }

    const validadoEm = new Date().toISOString();
    const validadoPor = params.emailTesouraria || params.uidTesouraria;
    
    let numerosRifasResult: string[] = [];

    await db.runTransaction(async (transaction) => {
      const querySnap = await transaction.get(
        db.collection("pagamentos_pix").where("pix_order_id", "==", pixOrderId).limit(1)
      );

      if (querySnap.empty) {
        throw new Error("PAGAMENTO_NOT_FOUND");
      }

      const pagRef = querySnap.docs[0].ref;
      const pagamento = querySnap.docs[0].data() as any;

      if (pagamento.status_validacao === "aceita") {
        throw new Error("PIX_ALREADY_VALIDATED");
      }

      const numerosRifas = pagamento.numeros_rifas || [];

      if (numerosRifas.length === 0) {
        throw new Error("TRANSACAO_SEM_RIFAS");
      }

      const bilhetesRefs = numerosRifas.map((numero: string) =>
        db.collection("bilhetes").doc(numero)
      );
      
      const bilhetesSnaps = await transaction.getAll(...bilhetesRefs);
      
      const bilhetesInexistentes = bilhetesSnaps.filter(snap => !snap.exists);
      if (bilhetesInexistentes.length > 0) {
        throw new Error("UM_OU_MAIS_BILHETES_NAO_ENCONTRADOS");
      }

      let bilhetesAtualizados = 0;
      bilhetesSnaps.forEach((snap) => {
        const bilhete = snap.data();
        
        if (pagamento.reference_id && (bilhete as any)?.pix_reference_id !== pagamento.reference_id) {
          return; // Bilhete já foi liberado ou pertence a outra transação
        }

        bilhetesAtualizados++;

        transaction.set(
          snap.ref,
          {
            status: "recusado",
            status_validacao: "negada",
            validado_em: validadoEm,
            validado_por: validadoPor,
            motivo_recusa: motivo,
          },
          { merge: true },
        );
      });

      if (bilhetesSnaps.length > 0 && bilhetesAtualizados === 0) {
        throw new Error("TODOS_BILHETES_PERDIDOS");
      }

      transaction.set(
        pagRef,
        {
          status_validacao: "negada",
          validado_em: validadoEm,
          validado_por: validadoPor,
          motivo_negacao: motivo,
        },
        { merge: true },
      );

      if (pagamento.vendedor_id) {
        const notificacaoRef = db.collection("notificacoes").doc();
        transaction.set(notificacaoRef, {
          vendedor_id: pagamento.vendedor_id,
          tipo: "correcao_dados",
          titulo: "Venda recusada",
          mensagem: motivo || "Revise os dados do comprador e envie novamente.",
          rifas: numerosRifas,
          lida: false,
          data_criacao: validadoEm,
        });
      }
      
      numerosRifasResult = numerosRifas;
    });

    return {
      sucesso: true,
      statusValidacao: "negada" as const,
      transacaoId: params.transacaoId,
      rifas: numerosRifasResult,
      motivo,
    };
  }
}


