import * as admin from "firebase-admin";

import {
  obterSuperAdmins,
  CARGOS_TESOURARIA_OU_ADMIN,
  CARGOS_SECRETARIA_OU_ADMIN,
} from "../../../shared/middlewares/authMiddleware";
import { Bilhete, Usuario } from "../../types/models";
import { BilheteComNumero, DadosAtualizacaoCompradorCompra, TransacaoTesouraria } from "../types/tesourariaTypes";
import { chaveCompra } from "../helpers/pixTransacoesHelper";

export class TesourariaRelatorioService {
  static async obterRelatorioTesouraria() {
    const db = admin.firestore();
    const superAdmins = obterSuperAdmins();
    const cargosAdmin = new Set([...CARGOS_TESOURARIA_OU_ADMIN, ...CARGOS_SECRETARIA_OU_ADMIN]);

    const usuariosSnap = await db.collection("usuarios").get();

    const bilhetesSnap = await db
      .collection("bilhetes")
      .where("status", "==", "pago")
      .get();

    const vendasPorCpf: Record<string, number> = {};

    bilhetesSnap.forEach((doc) => {
      const data = doc.data() as Bilhete;

      if (data.vendedor_cpf) {
        vendasPorCpf[data.vendedor_cpf] =
          (vendasPorCpf[data.vendedor_cpf] || 0) + 1;
      }
    });

    let totalArrecadadoGlobal = 0;
    let rifasPagasGlobal = 0;

    const aderidos = usuariosSnap.docs
      .filter((doc) => {
        const data = doc.data();
        const role = data.role || data.cargo;
        const email = data.email?.trim().toLowerCase() || "";
        
        if (superAdmins.includes(email)) return false;
        if (role && cargosAdmin.has(role)) return false;

        return (role || "aderido") === "aderido";
      })
      .map((doc) => {
        const user = doc.data() as Usuario;
        const cpfUsuario = user.cpf || "-";
        const rifasVendidas = user.cpf ? vendasPorCpf[user.cpf] || 0 : 0;
        const arrecadado = rifasVendidas * 10;

        totalArrecadadoGlobal += arrecadado;
        rifasPagasGlobal += rifasVendidas;

        return {
          id: doc.id,
          nome: user.nome || "Aderido Sem Nome",
          cpf: cpfUsuario,
          arrecadado,
          meta: user.meta_vendas || (user.modalidade_adesao === "meio" ? 600 : 1200),
          rifasVendidas,
        };
      });

    return {
      resumoGeral: {
        totalArrecadado: totalArrecadadoGlobal,
        rifasPagas: rifasPagasGlobal,
        aderidosAtivos: aderidos.length,
      },
      aderidos,
    };
  }

  static async obterHistoricoDetalhado(): Promise<TransacaoTesouraria[]> {
    const db = admin.firestore();

    const bilhetesSnap = await db
      .collection("bilhetes")
      .where("status", "in", ["pago", "pendente", "reservado"])
      .limit(5000)
      .get();

    // Map para agrupar as compras por comprador
    const agrupado: Record<string, TransacaoTesouraria> = {};

    bilhetesSnap.docs.forEach((doc) => {
      const data = doc.data() as Bilhete;
      const numero = doc.id;

      const bilheteComNumero: BilheteComNumero = {
        ...data,
        numero,
      };

      // Cria a chave unificada de agrupamento
      const chave = chaveCompra(bilheteComNumero);

      if (!agrupado[chave]) {
        agrupado[chave] = {
          id: chave,
          dataReserva: data.data_reserva || null,
          dataPagamento: data.data_pagamento || null,
          vendedorId: data.vendedor_id,
          vendedorNome: data.vendedor_nome || "Desconhecido",
          vendedorCpf: data.vendedor_cpf || "-",
          compradorId: data.comprador_id || null,
          compradorNome: data.comprador_nome || "Desconhecido",
          compradorEmail: data.comprador_email || "",
          compradorTelefone: data.comprador_telefone || "",
          status: data.status,
          comprovanteUrl: data.comprovante_url || null,
          bilhetes: [numero],
          valorTotal: data.valor_bruto || 10,
        };
      } else {
        if (!agrupado[chave].bilhetes.includes(numero)) {
          agrupado[chave].bilhetes.push(numero);
          agrupado[chave].valorTotal += 10;
        }
        agrupado[chave].comprovanteUrl =
          agrupado[chave].comprovanteUrl || data.comprovante_url || null;
      }
    });

    const historico = Object.values(agrupado);

    historico.sort((a, b) => {
      const dataA = new Date(a.dataReserva || 0).getTime() || 0;
      const dataB = new Date(b.dataReserva || 0).getTime() || 0;

      return dataB - dataA;
    });

    return historico;
  }

  static async atualizarCompradorCompra(
    compradorId: string,
    dados: DadosAtualizacaoCompradorCompra,
  ) {
    const db = admin.firestore();
    const bilhetesSnap = await db
      .collection("bilhetes")
      .where("comprador_id", "==", compradorId)
      .get();

    if (bilhetesSnap.empty) {
      throw new Error("COMPRA_NAO_ENCONTRADA");
    }

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

    const batch = db.batch();

    bilhetesSnap.docs.forEach((doc) => {
      batch.update(doc.ref, bilheteAtualizado);
    });

    const compradorRef = db.collection("compradores").doc(compradorId);
    const compradorSnap = await compradorRef.get();

    if (compradorSnap.exists) {
      batch.update(compradorRef, compradorDocAtualizado);
    }

    await batch.commit();

    return {
      comprador_id: compradorId,
      ...compradorDocAtualizado,
      rifasAtualizadas: bilhetesSnap.size,
      compradorDocumentoAtualizado: compradorSnap.exists,
    };
  }
}
