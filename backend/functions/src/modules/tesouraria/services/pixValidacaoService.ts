// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/services/pixValidacaoService.ts
// ============================================================================
import * as admin from "firebase-admin";

import { enviarEmailRecibo } from "../../rifas/emailService";
import { ComprasManuaisService } from "./comprasManuaisService";
import {
  ItemLoteValidacaoTransacao,
  ResultadoLoteValidacaoTransacoes,
} from "../types/tesourariaTypes";

interface ValidarPixParams {
  transacaoId: string;
  chaveAcao?: string;
  uidTesouraria: string;
  emailTesouraria?: string;
  motivo?: string;
}

export interface ResultadoAceitePix {
  sucesso: boolean;
  statusValidacao: "aceita";
  transacaoId: string;
  rifas: string[];
  emailEnviado?: boolean;
}

export interface ResultadoNegacaoPix {
  sucesso: boolean;
  statusValidacao: "negada";
  transacaoId: string;
  rifas: string[];
  motivo?: string;
}

function ehChaveManual(chave: string): boolean {
  return (
    chave.startsWith("comprovante-") ||
    chave.startsWith("comprador-") ||
    chave.startsWith("pixref-") ||
    chave.startsWith("manual|")
  );
}

export class PixValidacaoService {
  static async aceitarTransacao(params: ValidarPixParams): Promise<ResultadoAceitePix> {
    const chaveEfetiva = String(params.chaveAcao || params.transacaoId || "").trim();

    if (ehChaveManual(chaveEfetiva)) {
      const resultadoManual = await ComprasManuaisService.aceitarCompra({
        chave: chaveEfetiva,
        uidTesouraria: params.uidTesouraria,
        emailTesouraria: params.emailTesouraria,
      });

      return {
        sucesso: true,
        statusValidacao: "aceita" as const,
        transacaoId: params.transacaoId,
        rifas: resultadoManual.rifas,
        emailEnviado: resultadoManual.emailEnviado,
      };
    }

    const db = admin.firestore();
    const pixOrderId = chaveEfetiva.replace(/^pix-/, "");

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
        // Fallback: tentar atualizar diretamente nos bilhetes com pix_order_id
        const bilhetesQuery = await transaction.get(
          db.collection("bilhetes").where("pix_order_id", "==", pixOrderId).limit(100)
        );

        if (bilhetesQuery.empty) {
          throw new Error("PAGAMENTO_NOT_FOUND");
        }

        bilhetesQuery.forEach((doc) => {
          const d = doc.data();
          numerosRifasResult.push(doc.id);
          compradorEmailResult = compradorEmailResult || d.comprador_email || null;
          compradorNomeResult = compradorNomeResult !== "Comprador" ? compradorNomeResult : (d.comprador_nome || "Comprador");
          transaction.set(
            doc.ref,
            {
              status: "pago",
              status_validacao: "aceita",
              validado_em: validadoEm,
              validado_por: validadoPor,
              motivo_recusa: null,
              data_pagamento: d.data_pagamento || validadoEm,
            },
            { merge: true },
          );
        });

        return;
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
          return;
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

  static async negarTransacao(params: ValidarPixParams): Promise<ResultadoNegacaoPix> {
    const motivo = String(params.motivo || "").trim();

    if (!motivo) {
      throw new Error("MOTIVO_REQUIRED");
    }

    const chaveEfetiva = String(params.chaveAcao || params.transacaoId || "").trim();

    if (ehChaveManual(chaveEfetiva)) {
      const resultadoManual = await ComprasManuaisService.negarCompra({
        chave: chaveEfetiva,
        uidTesouraria: params.uidTesouraria,
        emailTesouraria: params.emailTesouraria,
        motivo,
      });

      return {
        sucesso: true,
        statusValidacao: "negada" as const,
        transacaoId: params.transacaoId,
        rifas: resultadoManual.rifas,
        motivo,
      };
    }

    const db = admin.firestore();
    const pixOrderId = chaveEfetiva.replace(/^pix-/, "");

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
        // Fallback: tentar atualizar diretamente nos bilhetes com pix_order_id
        const bilhetesQuery = await transaction.get(
          db.collection("bilhetes").where("pix_order_id", "==", pixOrderId).limit(100)
        );

        if (bilhetesQuery.empty) {
          throw new Error("PAGAMENTO_NOT_FOUND");
        }

        bilhetesQuery.forEach((doc) => {
          numerosRifasResult.push(doc.id);
          transaction.set(
            doc.ref,
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

        return;
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
          return;
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

  static async aceitarTransacoesEmLote(params: {
    itens: ItemLoteValidacaoTransacao[];
    uidTesouraria: string;
    emailTesouraria?: string;
  }): Promise<ResultadoLoteValidacaoTransacoes> {
    let processadas = 0;
    let ignoradas = 0;
    const erros: Array<{ id: string; erro: string }> = [];

    for (const item of params.itens) {
      try {
        await this.aceitarTransacao({
          transacaoId: item.id,
          chaveAcao: item.chaveAcao,
          uidTesouraria: params.uidTesouraria,
          emailTesouraria: params.emailTesouraria,
        });
        processadas++;
      } catch (err: any) {
        if (err.message === "PIX_ALREADY_VALIDATED" || err.message === "TRANSACAO_JA_FINALIZADA") {
          ignoradas++;
        } else {
          erros.push({ id: item.id, erro: err.message || "Erro ao aprovar" });
        }
      }
    }

    return {
      sucesso: erros.length === 0,
      processadas,
      ignoradas,
      erros,
    };
  }

  static async negarTransacoesEmLote(params: {
    itens: ItemLoteValidacaoTransacao[];
    uidTesouraria: string;
    emailTesouraria?: string;
    motivo: string;
  }): Promise<ResultadoLoteValidacaoTransacoes> {
    const motivo = String(params.motivo || "").trim();
    if (!motivo) {
      throw new Error("MOTIVO_REQUIRED");
    }

    let processadas = 0;
    let ignoradas = 0;
    const erros: Array<{ id: string; erro: string }> = [];

    for (const item of params.itens) {
      try {
        await this.negarTransacao({
          transacaoId: item.id,
          chaveAcao: item.chaveAcao,
          uidTesouraria: params.uidTesouraria,
          emailTesouraria: params.emailTesouraria,
          motivo,
        });
        processadas++;
      } catch (err: any) {
        if (err.message === "PIX_ALREADY_VALIDATED") {
          ignoradas++;
        } else {
          erros.push({ id: item.id, erro: err.message || "Erro ao recusar" });
        }
      }
    }

    return {
      sucesso: erros.length === 0,
      processadas,
      ignoradas,
      erros,
    };
  }
}


