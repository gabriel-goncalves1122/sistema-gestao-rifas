// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/services/analisadorComprovanteService.ts
// ============================================================================

import { createHash } from "node:crypto";

import {
  AnaliseOcrDTO,
  AnaliseOcrFirestore,
  IAnalisadorComprovanteHandler,
  IOcrAnaliseRepository,
  converterAnaliseOcrParaDto,
} from "../contracts/ocrContracts";
import { ExtratorDocumentoFactory } from "../extractors/extratorDocumentoFactory";
import { TesseractWorkerSingleton } from "../extractors/tesseractWorkerSingleton";
import { criarCadeiaAnaliseComprovantePadrao } from "../handlers/cadeiaAnaliseComprovanteFactory";
import { criarContextoAnaliseInicial } from "../handlers/normalizacaoOcrUtils";
import { OcrAnaliseRepository } from "../repositories/ocrAnaliseRepository";
import { CorrelacionadorPixService } from "./correlacionadorPixService";

const CNPJ_RECEBEDOR_PADRAO = "54789437000185";
const ALIASES_RECEBEDOR_PADRAO = [
  "8805",
  "COMISSAO FORMATURA UNIFEI",
  "COMISSAO DE FORMATURA UNIFEI 2026",
  "CLOUDWALK IP LTDA",
];

/**
 * Orquestrador OO principal do pipeline de análise de comprovantes Pix:
 * 1) Carrega o pagamento via `IOcrAnaliseRepository` e checa idempotência por hash;
 * 2) Baixa o comprovante do Storage e escolhe a estratégia via `ExtratorDocumentoFactory`;
 * 3) Executa a `Chain of Responsibility` de extração dos campos Pix;
 * 4) Valida unicidade do E2E ID e calcula correlação via `CorrelacionadorPixService`;
 * 5) Persiste `analise_ocr` via transação sem alterar o status financeiro.
 */
export class AnalisadorComprovanteService {
  constructor(
    private readonly repository: IOcrAnaliseRepository = new OcrAnaliseRepository(),
    private readonly correlacionador: CorrelacionadorPixService = new CorrelacionadorPixService(),
    private readonly workerSingleton: TesseractWorkerSingleton = TesseractWorkerSingleton.obterInstancia(),
    private readonly criarCadeia: () => IAnalisadorComprovanteHandler = criarCadeiaAnaliseComprovantePadrao,
  ) {}

  /**
   * Analisa o comprovante de um documento em `pagamentos_pix`.
   *
   * @param {string} pagamentoId - Identificador do pagamento no Firestore.
   * @param {{ forcar?: boolean }} [opcoes] - Se `forcar: true`, ignora cache de mesmo hash.
   * @returns {Promise<AnaliseOcrDTO | null>} DTO da análise ou `null` quando não elegível.
   * @sideEffects Faz download no Firebase Storage e grava `analise_ocr` no Firestore.
   */
  async executarPorPagamentoId(
    pagamentoId: string,
    opcoes: { forcar?: boolean } = {},
  ): Promise<AnaliseOcrDTO | null> {
    const inicioMs = performance.now();
    const pagamento = await this.repository.buscarPagamentoPorId(pagamentoId);

    if (!pagamento || !pagamento.comprovanteUrl) {
      return null;
    }

    if (
      !opcoes.forcar &&
      pagamento.analiseOcrAtual?.status_execucao === "CONCLUIDO" &&
      pagamento.hashComprovante &&
      pagamento.analiseOcrAtual.hash_comprovante === pagamento.hashComprovante
    ) {
      return converterAnaliseOcrParaDto(pagamento.analiseOcrAtual);
    }

    try {
      const buffer = await this.repository.baixarComprovanteStorage(
        pagamento.comprovanteUrl,
      );
      const hashCalculado =
        pagamento.hashComprovante ||
        createHash("sha256").update(buffer).digest("hex");
      const { tipoArquivo, strategy } = ExtratorDocumentoFactory.criarPorBuffer(
        buffer,
        this.workerSingleton,
      );
      const extracao = await strategy.extrairTexto(buffer, tipoArquivo);

      const contexto = criarContextoAnaliseInicial(extracao.textoBruto);
      this.criarCadeia().executar(contexto);

      const e2eDuplicado = contexto.e2eId
        ? await this.repository.existeOutroPagamentoComE2e(
            contexto.e2eId,
            pagamento.pagamentoId,
          )
        : false;

      const txidEsperado = this.derivarTxidEsperado(
        pagamento.pixOrderId,
        pagamento.referenceId,
        pagamento.pagamentoId,
      );

      const correlacao = this.correlacionador.correlacionar(
        contexto,
        {
          pagamentoId: pagamento.pagamentoId,
          txidEsperado,
          valorCentavos: Math.round(pagamento.valorBrutoReais * 100),
          recebedorEsperado: process.env.PIX_NOME_BENEFICIARIO || "8805",
          recebedorAliases: this.obterAliasesRecebedor(),
          cnpjRecebedorEsperado:
            process.env.PIX_CNPJ_RECEBEDOR || CNPJ_RECEBEDOR_PADRAO,
          dataCriacaoIso: pagamento.dataCriacaoIso,
        },
        e2eDuplicado,
      );

      const analiseFirestore: AnaliseOcrFirestore = {
        status_execucao: "CONCLUIDO",
        veredicto: correlacao.veredicto,
        score: correlacao.score,
        txid_bate: correlacao.txidBate,
        valor_bate: correlacao.valorBate,
        recebedor_bate: correlacao.recebedorBate,
        e2e_unico: correlacao.e2eUnico,
        banco_detectado: contexto.bancoDetectado,
        txid_lido: contexto.txidLido,
        e2e_id_detectado: contexto.e2eId,
        valor_lido_centavos: contexto.valorCentavos,
        data_transacao_iso: contexto.dataTransacaoIso,
        recebedor_detectado: contexto.recebedorDetectado,
        cnpj_recebedor_detectado: contexto.cnpjRecebedorDetectado,
        alertas: correlacao.alertas,
        motivos: correlacao.motivos,
        hash_comprovante: hashCalculado,
        tempo_ms: Math.round(performance.now() - inicioMs),
        analisado_em: new Date().toISOString(),
        erro_mensagem: null,
      };

      await this.repository.salvarAnaliseOcr(
        pagamento.pagamentoId,
        analiseFirestore,
        pagamento.comprovanteUrl,
      );

      return converterAnaliseOcrParaDto(analiseFirestore);
    } catch (error) {
      const mensagemErro =
        error instanceof Error ? error.message : "FALHA_DESCONHECIDA_OCR";

      const analiseErro: AnaliseOcrFirestore = {
        status_execucao: "ERRO",
        veredicto: null,
        score: null,
        txid_bate: null,
        valor_bate: null,
        recebedor_bate: null,
        e2e_unico: null,
        banco_detectado: null,
        txid_lido: null,
        e2e_id_detectado: null,
        valor_lido_centavos: null,
        data_transacao_iso: null,
        recebedor_detectado: null,
        cnpj_recebedor_detectado: null,
        alertas: [],
        motivos: ["Falha ao executar análise OCR do comprovante."],
        hash_comprovante: pagamento.hashComprovante,
        tempo_ms: Math.round(performance.now() - inicioMs),
        analisado_em: new Date().toISOString(),
        erro_mensagem: mensagemErro,
      };

      await this.repository
        .salvarAnaliseOcr(
          pagamento.pagamentoId,
          analiseErro,
          pagamento.comprovanteUrl,
        )
        .catch(() => {});

      return converterAnaliseOcrParaDto(analiseErro);
    }
  }

  /**
   * Analisa o comprovante de uma venda direta gravada em `bilhetes` (sem `pagamentos_pix`)
   * e propaga `analise_ocr` para todos os bilhetes que compartilham a mesma `comprovante_url`.
   *
   * @param {string} identificador - Número do bilhete ou `comprador_id`.
   * @param {{ forcar?: boolean }} [opcoes] - Se `forcar: true`, ignora cache já concluído.
   * @returns {Promise<AnaliseOcrDTO | null>} DTO da análise ou `null` quando não elegível.
   */
  async executarPorBilheteDireto(
    identificador: string,
    opcoes: { forcar?: boolean } = {},
  ): Promise<AnaliseOcrDTO | null> {
    if (
      !this.repository.buscarCompraDiretaPorBilhete ||
      !this.repository.salvarAnaliseOcrCompraDireta
    ) {
      return null;
    }

    const inicioMs = performance.now();
    const compra = await this.repository.buscarCompraDiretaPorBilhete(identificador);
    if (!compra || !compra.comprovanteUrl) {
      return null;
    }

    if (!opcoes.forcar && compra.analiseOcrAtual?.status_execucao === "CONCLUIDO") {
      return converterAnaliseOcrParaDto(compra.analiseOcrAtual);
    }

    try {
      const buffer = await this.repository.baixarComprovanteStorage(
        compra.comprovanteUrl,
      );
      const hashCalculado = createHash("sha256").update(buffer).digest("hex");
      const { tipoArquivo, strategy } = ExtratorDocumentoFactory.criarPorBuffer(
        buffer,
        this.workerSingleton,
      );
      const extracao = await strategy.extrairTexto(buffer, tipoArquivo);

      const contexto = criarContextoAnaliseInicial(extracao.textoBruto);
      this.criarCadeia().executar(contexto);

      const e2eDuplicado = contexto.e2eId
        ? await this.repository.existeOutroPagamentoComE2e(
            contexto.e2eId,
            compra.identificador,
          )
        : false;

      const correlacao = this.correlacionador.correlacionar(
        contexto,
        {
          pagamentoId: compra.identificador,
          txidEsperado: "",
          valorCentavos: Math.round(compra.valorTotalReais * 100),
          recebedorEsperado: process.env.PIX_NOME_BENEFICIARIO || "8805",
          recebedorAliases: this.obterAliasesRecebedor(),
          cnpjRecebedorEsperado:
            process.env.PIX_CNPJ_RECEBEDOR || CNPJ_RECEBEDOR_PADRAO,
          dataCriacaoIso: compra.dataCriacaoIso,
        },
        e2eDuplicado,
      );

      const analiseFirestore: AnaliseOcrFirestore = {
        status_execucao: "CONCLUIDO",
        veredicto: correlacao.veredicto,
        score: correlacao.score,
        txid_bate: correlacao.txidBate,
        valor_bate: correlacao.valorBate,
        recebedor_bate: correlacao.recebedorBate,
        e2e_unico: correlacao.e2eUnico,
        banco_detectado: contexto.bancoDetectado,
        txid_lido: contexto.txidLido,
        e2e_id_detectado: contexto.e2eId,
        valor_lido_centavos: contexto.valorCentavos,
        data_transacao_iso: contexto.dataTransacaoIso,
        recebedor_detectado: contexto.recebedorDetectado,
        cnpj_recebedor_detectado: contexto.cnpjRecebedorDetectado,
        alertas: correlacao.alertas,
        motivos: correlacao.motivos,
        hash_comprovante: hashCalculado,
        tempo_ms: Math.round(performance.now() - inicioMs),
        analisado_em: new Date().toISOString(),
        erro_mensagem: null,
      };

      await this.repository.salvarAnaliseOcrCompraDireta(
        compra.numerosRifas,
        compra.comprovanteUrl,
        analiseFirestore,
      );

      return converterAnaliseOcrParaDto(analiseFirestore);
    } catch (error) {
      const mensagemErro =
        error instanceof Error ? error.message : "FALHA_DESCONHECIDA_OCR";

      const analiseErro: AnaliseOcrFirestore = {
        status_execucao: "ERRO",
        veredicto: null,
        score: null,
        txid_bate: null,
        valor_bate: null,
        recebedor_bate: null,
        e2e_unico: null,
        banco_detectado: null,
        txid_lido: null,
        e2e_id_detectado: null,
        valor_lido_centavos: null,
        data_transacao_iso: null,
        recebedor_detectado: null,
        cnpj_recebedor_detectado: null,
        alertas: [],
        motivos: ["Falha ao executar análise OCR do comprovante."],
        hash_comprovante: null,
        tempo_ms: Math.round(performance.now() - inicioMs),
        analisado_em: new Date().toISOString(),
        erro_mensagem: mensagemErro,
      };

      await this.repository
        .salvarAnaliseOcrCompraDireta(
          compra.numerosRifas,
          compra.comprovanteUrl,
          analiseErro,
        )
        .catch(() => {});

      return converterAnaliseOcrParaDto(analiseErro);
    }
  }

  /**
   * Resolve o pagamento associado a uma transação da Tesouraria e força a reanálise OCR.
   * Suporta tanto `pagamentos_pix` quanto compras diretas em `bilhetes` sem `pagamentos_pix`.
   *
   * @param {string} transacaoId - Identificador recebido pela API da Tesouraria.
   * @returns {Promise<AnaliseOcrDTO>} Resultado atualizado da análise.
   * @throws {Error} `"TRANSACAO_NAO_ENCONTRADA"` ou `"COMPROVANTE_AUSENTE"`.
   */
  async reanalisarPorTransacaoId(transacaoId: string): Promise<AnaliseOcrDTO> {
    const pagamentoId = await this.repository.resolverPagamentoIdPorTransacao(transacaoId);
    if (pagamentoId) {
      const resultado = await this.executarPorPagamentoId(pagamentoId, { forcar: true });
      if (!resultado) {
        throw new Error("COMPROVANTE_AUSENTE");
      }
      return resultado;
    }

    const resultadoDireto = await this.executarPorBilheteDireto(transacaoId, {
      forcar: true,
    });
    if (!resultadoDireto) {
      throw new Error("TRANSACAO_NAO_ENCONTRADA");
    }

    return resultadoDireto;
  }

  private derivarTxidEsperado(
    pixOrderId: string | null,
    referenceId: string,
    pagamentoId: string,
  ): string {
    if (pixOrderId && /^RIFA[A-Z0-9]+$/i.test(pixOrderId.trim())) {
      return pixOrderId.trim().toUpperCase();
    }

    const base = (referenceId || pagamentoId).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const sufixo = base.slice(-10) || base;
    return `RIFA${sufixo}`.substring(0, 25);
  }

  private obterAliasesRecebedor(): string[] {
    const extras = (process.env.PIX_RECEBEDORES_ALIASES || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return Array.from(new Set([...ALIASES_RECEBEDOR_PADRAO, ...extras]));
  }
}
