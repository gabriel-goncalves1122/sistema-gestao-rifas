// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/services/aderidoRifasService.ts
// ============================================================================
import * as admin from "firebase-admin";

import { Bilhete, Comprador } from "../../types/models";
import { ordenarRifasPorNumero } from "../helpers/ordenarRifasHelper";
import { buscarUsuarioPorEmail } from "../helpers/usuarioRifasHelper";
import { isReservaBilheteExpirada } from "../../tesouraria/helpers/checkoutPixHelper";
import {
  ItemVendaRelatorioAderidoDTO,
  RelatorioVendasAderidoDTO,
} from "../types/rifasTypes";

const VALOR_PADRAO_RIFA = 10;

/**
 * Normaliza em memória um bilhete cuja reserva Pix expirou sem confirmação bancária,
 * devolvendo a aparência de `"disponivel"` para listagem e relatórios do aderido.
 *
 * @param {Bilhete} bilhete - Documento do bilhete carregado do Firestore.
 * @returns {Bilhete} Bilhete normalizado ou o próprio bilhete original se não expirado.
 */
function normalizarBilheteExpiradoParaDisponivel(bilhete: Bilhete): Bilhete {
  if (!isReservaBilheteExpirada(bilhete)) {
    return bilhete;
  }

  return {
    ...bilhete,
    status: "disponivel",
    comprador_id: null,
    comprador_nome: undefined,
    comprador_email: null,
    comprador_telefone: undefined,
    data_reserva: undefined,
    data_expiracao: null,
    pix_order_id: null,
    pix_qr_code_id: null,
    pix_reference_id: null,
    status_pagamento_banco: null,
    status_validacao: null,
    sessao_checkout_id: null,
  };
}

export class AderidoRifasService {
  /**
   * Consulta e retorna a lista de todos os bilhetes de rifa alocados para o vendedor aderido logado.
   * Realiza a ordenação natural numérica dos bilhetes antes de retornar.
   *
   * @param {string} emailLogado - Email do aderido autenticado na requisição.
   * @returns {Promise<Bilhete[]>} Lista ordenada de bilhetes com seus respectivos status e dados de comprador.
   */
  static async buscarPorAderido(emailLogado: string): Promise<Bilhete[]> {
    const db = admin.firestore();

    const usuario = await buscarUsuarioPorEmail(emailLogado);
    const idAderido = usuario.data.id_aderido || usuario.id;

    const bilhetesSnapshot = await db
      .collection("bilhetes")
      .where("vendedor_id", "==", idAderido)
      .get();

    const bilhetes = bilhetesSnapshot.docs.map((doc) =>
      normalizarBilheteExpiradoParaDisponivel(doc.data() as Bilhete),
    );

    return ordenarRifasPorNumero(bilhetes);
  }

  /**
   * Gera o relatório consolidado de vendas de rifas para o aderido logado.
   * Totaliza métricas do lote e lista detalhadamente todos os bilhetes vendidos (pagos e em análise).
   * Consulta a coleção 'compradores' como fonte da verdade cadastral para os dados dos compradores.
   *
   * @param {string} emailLogado - Email do aderido autenticado na requisição.
   * @returns {Promise<RelatorioVendasAderidoDTO>} Objeto contendo resumo estatístico e lista detalhada de itens vendidos.
   * @throws {Error} Lança "USER_NOT_FOUND" se o aderido não for localizado no banco de dados.
   */
  static async obterRelatorioVendas(
    emailLogado: string,
  ): Promise<RelatorioVendasAderidoDTO> {
    const db = admin.firestore();

    const usuario = await buscarUsuarioPorEmail(emailLogado);
    const idAderido = usuario.data.id_aderido || usuario.id;
    const nomeAderido = usuario.data.nome || "Aderido";

    const bilhetesSnapshot = await db
      .collection("bilhetes")
      .where("vendedor_id", "==", idAderido)
      .get();

    const bilhetes = bilhetesSnapshot.docs.map((doc) =>
      normalizarBilheteExpiradoParaDisponivel(doc.data() as Bilhete),
    );

    let rifasPagas = 0;
    let valorPagoConfirmado = 0;
    let rifasEmAnalise = 0;
    let valorEmAnalise = 0;
    let rifasDisponiveis = 0;

    const bilhetesVendidos: Bilhete[] = [];

    for (const bilhete of bilhetes) {
      if (bilhete.status === "disponivel") {
        rifasDisponiveis += 1;
      } else if (bilhete.status === "pago") {
        const valor =
          bilhete.valor_pago || bilhete.valor_bruto || VALOR_PADRAO_RIFA;
        rifasPagas += 1;
        valorPagoConfirmado += valor;
        bilhetesVendidos.push(bilhete);
      } else if (bilhete.status === "pendente") {
        const valor =
          bilhete.valor_pago || bilhete.valor_bruto || VALOR_PADRAO_RIFA;
        rifasEmAnalise += 1;
        valorEmAnalise += valor;
        bilhetesVendidos.push(bilhete);
      }
    }

    const totalRifasLote = bilhetes.length;
    const totalVendidas = rifasPagas + rifasEmAnalise;
    const valorTotalNegociado = valorPagoConfirmado + valorEmAnalise;

    // Buscar compradores como fonte da verdade cadastral
    const compradoresIds = Array.from(
      new Set(
        bilhetesVendidos
          .map((b) => b.comprador_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const compradoresMap = new Map<string, Comprador>();
    if (compradoresIds.length > 0) {
      const compradoresSnaps = await Promise.all(
        compradoresIds.map((id) => db.collection("compradores").doc(id).get()),
      );
      for (const snap of compradoresSnaps) {
        if (snap.exists) {
          compradoresMap.set(snap.id, snap.data() as Comprador);
        }
      }
    }

    // Ordenar os bilhetes vendidos numericamente
    bilhetesVendidos.sort((a, b) => {
      const numA = parseInt(a.numero, 10) || 0;
      const numB = parseInt(b.numero, 10) || 0;
      return numA - numB;
    });

    const itens: ItemVendaRelatorioAderidoDTO[] = bilhetesVendidos.map(
      (bilhete) => {
        const compradorDoc = bilhete.comprador_id
          ? compradoresMap.get(bilhete.comprador_id)
          : undefined;

        const compradorNome =
          compradorDoc?.nome || bilhete.comprador_nome || "Nome não informado";
        const compradorTelefone =
          compradorDoc?.telefone || bilhete.comprador_telefone || "";
        const compradorEmail =
          compradorDoc?.email || bilhete.comprador_email || "";

        const canal: "pix" | "comprovante" | "outro" = bilhete.pix_order_id
          ? "pix"
          : bilhete.comprovante_url
            ? "comprovante"
            : "outro";

        const status: "pago" | "pendente" =
          bilhete.status === "pago" ? "pago" : "pendente";
        const statusFormatado: "Pago" | "Em análise" =
          status === "pago" ? "Pago" : "Em análise";

        const valor =
          bilhete.valor_pago || bilhete.valor_bruto || VALOR_PADRAO_RIFA;
        const numeroRifa = parseInt(bilhete.numero, 10) || 0;
        const data = bilhete.data_pagamento || bilhete.data_reserva || null;

        return {
          numeroRifa,
          compradorNome,
          compradorTelefone,
          compradorEmail,
          status,
          statusFormatado,
          valor,
          canal,
          data,
          orderId: bilhete.pix_order_id || null,
        };
      },
    );

    return {
      aderido: {
        nome: nomeAderido,
        email: emailLogado,
      },
      geradoEm: new Date().toISOString(),
      resumo: {
        totalRifasLote,
        totalVendidas,
        rifasPagas,
        valorPagoConfirmado,
        rifasEmAnalise,
        valorEmAnalise,
        rifasDisponiveis,
        valorTotalNegociado,
      },
      itens,
    };
  }
}
