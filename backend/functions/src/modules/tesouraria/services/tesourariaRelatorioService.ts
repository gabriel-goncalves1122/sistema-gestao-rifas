// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/services/tesourariaRelatorioService.ts
// ============================================================================

import {
  obterSuperAdmins,
  CARGOS_TESOURARIA_OU_ADMIN,
  CARGOS_SECRETARIA_OU_ADMIN,
} from "../../../shared/middlewares/authMiddleware";
import { Bilhete, Usuario } from "../../types/models";
import {
  AderidoRelatorioTesouraria,
  BilheteComNumero,
  DadosAtualizacaoCompradorCompra,
  RelatorioTesourariaResponse,
  TransacaoTesouraria,
} from "../types/tesourariaTypes";
import { calcularValorLiquido } from "../helpers/origemPagamentoHelper";
import { chaveCompra } from "../helpers/pixTransacoesHelper";
import {
  AcumuladorVendasAderido,
  agruparHistoricoTesouraria,
  classificarOrigemBilhete,
  criarAcumuladorVendasAderido,
  montarTransacoesDoAderido,
} from "../helpers/tesourariaRelatorioHelper";
import {
  criarMapaVendedores,
  ehUsuarioAderidoRelatorio,
  MapaVendedores,
  resolverVendedorDoBilhete,
} from "../helpers/vendedorLookupHelper";
import { TesourariaRelatorioRepository } from "../repositories/tesourariaRelatorioRepository";

const VALOR_RIFA = 10;

interface TotaisGlobaisRelatorio {
  rifasPagasPix: number;
  rifasPagasComprovante: number;
  valorPixBruto: number;
  valorPixLiquido: number;
  valorComprovante: number;
  rifasPendentesPix: number;
  rifasPendentesComprovante: number;
}

export class TesourariaRelatorioService {
  /**
   * Gera o relatório financeiro consolidado da Tesouraria e de Desempenho.
   * Vincula bilhetes aos aderidos de forma resiliente (via `vendedor_id` e fallback de `vendedor_cpf` normalizado),
   * separando métricas de Pix (`MERCADOPAGO_API` com taxa de 1% vs. `EMV_OFFLINE` integral) e comprovantes manuais.
   *
   * @returns {Promise<RelatorioTesourariaResponse>} Resumo geral e lista de desempenho por aderido.
   */
  static async obterRelatorioTesouraria(): Promise<RelatorioTesourariaResponse> {
    const superAdmins = obterSuperAdmins();
    const cargosAdmin = new Set([
      ...CARGOS_TESOURARIA_OU_ADMIN,
      ...CARGOS_SECRETARIA_OU_ADMIN,
    ]);

    const { usuariosDocs, bilhetesDocs } =
      await TesourariaRelatorioRepository.carregarUsuariosEBilhetesRelatorio();
    const mapaVendedores = criarMapaVendedores(usuariosDocs);

    const { vendasPorDocId, totaisGlobais } = this.contabilizarBilhetes(
      bilhetesDocs,
      mapaVendedores,
    );

    const aderidos = this.construirAderidosRelatorio({
      usuariosDocs,
      mapaVendedores,
      vendasPorDocId,
      superAdmins,
      cargosAdmin,
    });

    return {
      resumoGeral: this.montarResumoGeral(totaisGlobais, aderidos.length),
      aderidos,
    };
  }

  /**
   * Obtém o histórico detalhado e unificado de todas as compras (Pix e Comprovantes),
   * agrupando bilhetes da mesma negociação, saneando datas ausentes e enriquecendo dados do vendedor.
   *
   * @returns {Promise<TransacaoTesouraria[]>} Lista de compras ordenada pela data mais recente.
   */
  static async obterHistoricoDetalhado(): Promise<TransacaoTesouraria[]> {
    const { bilhetesDocs, mapaVendedores } =
      await TesourariaRelatorioRepository.carregarHistoricoComVendedores();

    return agruparHistoricoTesouraria(bilhetesDocs, mapaVendedores);
  }

  /**
   * Atualiza os dados cadastrais do comprador na coleção `compradores` (fonte de verdade)
   * e propaga as alterações para todos os bilhetes vinculados em transação ACID.
   *
   * @param {string} compradorId - Identificador único do documento do comprador.
   * @param {DadosAtualizacaoCompradorCompra} dados - Novos dados cadastrais (`nome`, `email`, `telefone`).
   * @returns {Promise<Record<string, unknown>>} Resumo da atualização contendo contagem de rifas afetadas.
   * @throws {Error} `"COMPRA_NAO_ENCONTRADA"` quando nenhum bilhete referencia `compradorId`.
   * @transactional Delegado para `TesourariaRelatorioRepository.atualizarCompradorAtomicamente`.
   */
  static async atualizarCompradorCompra(
    compradorId: string,
    dados: DadosAtualizacaoCompradorCompra,
  ) {
    return TesourariaRelatorioRepository.atualizarCompradorAtomicamente(compradorId, dados);
  }

  /**
   * Contabiliza os totais globais e por aderido iterando uma única vez sobre os bilhetes projetados.
   */
  private static contabilizarBilhetes(
    bilhetesDocs: Array<{ id: string; data: () => Bilhete }>,
    mapaVendedores: MapaVendedores,
  ): {
    vendasPorDocId: Map<string, AcumuladorVendasAderido>;
    totaisGlobais: TotaisGlobaisRelatorio;
  } {
    const vendasPorDocId = new Map<string, AcumuladorVendasAderido>();
    const obterAcumulador = (docId: string): AcumuladorVendasAderido => {
      const atual = vendasPorDocId.get(docId);
      if (atual) return atual;
      const novo = criarAcumuladorVendasAderido();
      vendasPorDocId.set(docId, novo);
      return novo;
    };

    const totais: TotaisGlobaisRelatorio = {
      rifasPagasPix: 0,
      rifasPagasComprovante: 0,
      valorPixBruto: 0,
      valorPixLiquido: 0,
      valorComprovante: 0,
      rifasPendentesPix: 0,
      rifasPendentesComprovante: 0,
    };

    bilhetesDocs.forEach((doc, idx) => {
      const data = doc.data() as Bilhete;
      const status = data.status || "pago";
      const { provedor, ehPix } = classificarOrigemBilhete(data);
      const valorBilhete = data.valor_pago || data.valor_bruto || VALOR_RIFA;
      const valorBilheteLiquido = calcularValorLiquido(valorBilhete, provedor);
      const vendedor = resolverVendedorDoBilhete(data, mapaVendedores);

      if (vendedor) {
        const acc = obterAcumulador(vendedor.docId);
        const bilheteComNumero: BilheteComNumero = { ...data, numero: doc.id || `bilhete-${idx}` };
        const chave = chaveCompra(bilheteComNumero);
        const grupoAtual = acc.gruposCompra.get(chave) || [];
        grupoAtual.push(bilheteComNumero);
        acc.gruposCompra.set(chave, grupoAtual);
      }

      if (status === "pago") {
        if (ehPix) {
          totais.rifasPagasPix += 1;
          totais.valorPixBruto += valorBilhete;
          totais.valorPixLiquido += valorBilheteLiquido;
        } else {
          totais.rifasPagasComprovante += 1;
          totais.valorComprovante += valorBilhete;
        }

        if (vendedor) {
          const acc = obterAcumulador(vendedor.docId);
          if (ehPix) {
            acc.rifasPagasPix += 1;
            acc.valorBrutoPix += valorBilhete;
            acc.valorLiquidoPix += valorBilheteLiquido;
          } else {
            acc.rifasPagasComprovante += 1;
            acc.valorBrutoComprovante += valorBilhete;
          }
        }
      } else if (status === "pendente" || status === "reservado") {
        if (ehPix) {
          totais.rifasPendentesPix += 1;
        } else {
          totais.rifasPendentesComprovante += 1;
        }

        if (vendedor) {
          obterAcumulador(vendedor.docId).rifasPendentes += 1;
        }
      }
    });

    return { vendasPorDocId, totaisGlobais: totais };
  }

  /**
   * Mapeia os usuários elegíveis como aderidos no relatório consolidado.
   */
  private static construirAderidosRelatorio(params: {
    usuariosDocs: Array<{ id: string; data: () => Partial<Usuario> }>;
    mapaVendedores: MapaVendedores;
    vendasPorDocId: Map<string, AcumuladorVendasAderido>;
    superAdmins: string[];
    cargosAdmin: Set<string>;
  }): AderidoRelatorioTesouraria[] {
    const { usuariosDocs, mapaVendedores, vendasPorDocId, superAdmins, cargosAdmin } = params;

    return usuariosDocs
      .filter((doc) => {
        const usuario = (doc.data() || {}) as Partial<Usuario>;
        const acc = vendasPorDocId.get(doc.id);
        const possuiVendasVinculadas = Boolean(
          acc && (acc.rifasPagasPix > 0 || acc.rifasPagasComprovante > 0 || acc.rifasPendentes > 0),
        );

        return ehUsuarioAderidoRelatorio({
          docId: doc.id,
          usuario,
          superAdmins,
          cargosAdmin,
          possuiVendasVinculadas,
        });
      })
      .map((doc) => {
        const vendedor = mapaVendedores.porId.get(doc.id);
        const acc = vendasPorDocId.get(doc.id) || criarAcumuladorVendasAderido();

        const rifasVendidas = acc.rifasPagasPix + acc.rifasPagasComprovante;
        const arrecadado = acc.valorBrutoPix + acc.valorBrutoComprovante;
        const valorPixLiquido = Number(acc.valorLiquidoPix.toFixed(2));
        const arrecadadoLiquido = Number(
          (valorPixLiquido + acc.valorBrutoComprovante).toFixed(2),
        );
        const transacoes = montarTransacoesDoAderido(acc.gruposCompra);
        const comprasCount = transacoes.filter((t) => t.statusPagamento === "PAID").length;

        return {
          id: doc.id,
          nome: vendedor?.nome || "Aderido Sem Nome",
          cpf: vendedor?.cpf || "-",
          ...(vendedor?.curso ? { curso: vendedor.curso } : {}),
          ...(vendedor?.modalidadeAdesao ? { modalidadeAdesao: vendedor.modalidadeAdesao } : {}),
          ...(vendedor?.cargo ? { cargo: vendedor.cargo } : {}),
          arrecadado,
          arrecadadoLiquido,
          valorPix: acc.valorBrutoPix,
          valorPixLiquido,
          valorComprovante: acc.valorBrutoComprovante,
          comprasCount,
          meta: vendedor?.metaVendas || 1200,
          rifasVendidas,
          rifasVendidasPix: acc.rifasPagasPix,
          rifasVendidasComprovante: acc.rifasPagasComprovante,
          rifasPendentes: acc.rifasPendentes,
          transacoes,
        };
      });
  }

  /**
   * Consolida o objeto `resumoGeral` do relatório financeiro da Tesouraria.
   */
  private static montarResumoGeral(
    totais: TotaisGlobaisRelatorio,
    aderidosAtivos: number,
  ): RelatorioTesourariaResponse["resumoGeral"] {
    const totalArrecadado = totais.valorPixBruto + totais.valorComprovante;
    const valorArrecadadoPixLiquido = Number(totais.valorPixLiquido.toFixed(2));
    const totalArrecadadoLiquido = Number(
      (valorArrecadadoPixLiquido + totais.valorComprovante).toFixed(2),
    );

    return {
      totalArrecadado,
      totalArrecadadoLiquido,
      rifasPagas: totais.rifasPagasPix + totais.rifasPagasComprovante,
      rifasPagasPix: totais.rifasPagasPix,
      rifasPagasComprovante: totais.rifasPagasComprovante,
      valorArrecadadoPixBruto: totais.valorPixBruto,
      valorArrecadadoPixLiquido,
      valorArrecadadoComprovante: totais.valorComprovante,
      rifasPendentes: totais.rifasPendentesPix + totais.rifasPendentesComprovante,
      rifasPendentesPix: totais.rifasPendentesPix,
      rifasPendentesComprovante: totais.rifasPendentesComprovante,
      aderidosAtivos,
    };
  }
}
