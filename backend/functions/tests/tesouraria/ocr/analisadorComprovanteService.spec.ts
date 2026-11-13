// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/ocr/analisadorComprovanteService.spec.ts
// ============================================================================

import {
  AnaliseOcrFirestore,
  IOcrAnaliseRepository,
  PagamentoParaAnaliseOcr,
} from "../../../src/modules/tesouraria/ocr/contracts/ocrContracts";
import { ExtratorDocumentoFactory } from "../../../src/modules/tesouraria/ocr/extractors/extratorDocumentoFactory";
import { TesseractWorkerSingleton } from "../../../src/modules/tesouraria/ocr/extractors/tesseractWorkerSingleton";
import { OcrAnaliseRepository } from "../../../src/modules/tesouraria/ocr/repositories/ocrAnaliseRepository";
import { AnalisadorComprovanteService } from "../../../src/modules/tesouraria/ocr/services/analisadorComprovanteService";
import { CorrelacionadorPixService } from "../../../src/modules/tesouraria/ocr/services/correlacionadorPixService";

describe("AnalisadorComprovanteService e OcrAnaliseRepository", () => {
  const criarAnaliseExistente = (hash: string): AnaliseOcrFirestore => ({
    status_execucao: "CONCLUIDO",
    veredicto: "CORRELACAO_FORTE",
    score: 95,
    txid_bate: true,
    valor_bate: true,
    recebedor_bate: true,
    e2e_unico: true,
    banco_detectado: "NUBANK",
    txid_lido: "RIFAAB12CD34EF",
    e2e_id_detectado: "E18236120202611121705ABC12345678",
    valor_lido_centavos: 2000,
    data_transacao_iso: "2026-11-12T14:05:00-03:00",
    recebedor_detectado: "COMISSAO FORMATURA UNIFEI",
    cnpj_recebedor_detectado: "54789437000185",
    alertas: [],
    motivos: ["TXID RIFA correspondente"],
    hash_comprovante: hash,
    tempo_ms: 42,
    analisado_em: "2026-11-12T17:06:00.000Z",
    erro_mensagem: null,
  });

  const criarPagamentoBase = (
    analiseAtual: AnaliseOcrFirestore | null = null,
  ): PagamentoParaAnaliseOcr => ({
    pagamentoId: "pag_001",
    referenceId: "RIFAAB12CD34EF",
    pixOrderId: "RIFAAB12CD34EF",
    valorBrutoReais: 20,
    statusPagamentoBanco: "IN_ANALYSIS",
    comprovanteUrl: "gs://rifasaderidos2026.firebasestorage.app/comprovantes/comp.pdf",
    hashComprovante: "hash_abc_123",
    dataCriacaoIso: "2026-11-12T17:00:00.000Z",
    numerosRifas: ["0001", "0002"],
    analiseOcrAtual: analiseAtual,
  });

  const criarRepoMock = (
    pagamento: PagamentoParaAnaliseOcr | null,
  ): jest.Mocked<IOcrAnaliseRepository> => ({
    buscarPagamentoPorId: jest.fn().mockResolvedValue(pagamento),
    resolverPagamentoIdPorTransacao: jest
      .fn()
      .mockResolvedValue(pagamento?.pagamentoId ?? null),
    baixarComprovanteStorage: jest
      .fn()
      .mockResolvedValue(Buffer.from("%PDF-1.4\n...", "ascii")),
    existeOutroPagamentoComE2e: jest.fn().mockResolvedValue(false),
    salvarAnaliseOcr: jest.fn().mockResolvedValue(undefined),
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("deve pular reprocessamento quando o mesmo hash já foi analisado e forcar=false", async () => {
    const analiseCache = criarAnaliseExistente("hash_abc_123");
    const repo = criarRepoMock(criarPagamentoBase(analiseCache));
    const service = new AnalisadorComprovanteService(
      repo,
      new CorrelacionadorPixService(),
      {} as TesseractWorkerSingleton,
    );

    const resultado = await service.executarPorPagamentoId("pag_001");

    expect(resultado?.veredicto).toBe("CORRELACAO_FORTE");
    expect(repo.baixarComprovanteStorage).not.toHaveBeenCalled();
    expect(repo.salvarAnaliseOcr).not.toHaveBeenCalled();
  });

  it("deve reprocessar quando forcar=true mesmo com hash idêntico", async () => {
    const analiseCache = criarAnaliseExistente("hash_abc_123");
    const repo = criarRepoMock(criarPagamentoBase(analiseCache));

    jest.spyOn(ExtratorDocumentoFactory, "criarPorBuffer").mockReturnValue({
      tipoArquivo: "PDF",
      strategy: {
        suporta: () => true,
        extrairTexto: jest.fn().mockResolvedValue({
          tipoArquivo: "PDF",
          modoExtracao: "PDF_NATIVO",
          textoBruto: `
            Nu Pagamentos S.A. - Comprovante Pix
            Valor: R$ 20,00
            Data: 12/11/2026 14:05:00
            CNPJ: 54.789.437/0001-85
            ID: RIFAAB12CD34EF
            E18236120202611121705ABC12345678
          `,
          confiancaMediaOcr: null,
          pdfEscaneado: false,
        }),
      },
    });

    const service = new AnalisadorComprovanteService(
      repo,
      new CorrelacionadorPixService(),
      {} as TesseractWorkerSingleton,
    );

    const resultado = await service.executarPorPagamentoId("pag_001", {
      forcar: true,
    });

    expect(repo.baixarComprovanteStorage).toHaveBeenCalledTimes(1);
    expect(repo.salvarAnaliseOcr).toHaveBeenCalledTimes(1);
    expect(resultado?.statusExecucao).toBe("CONCLUIDO");
    expect(resultado?.veredicto).toBe("CORRELACAO_FORTE");
  });

  it("deve persistir status ERRO de forma resiliente quando o download do Storage falhar", async () => {
    const repo = criarRepoMock(criarPagamentoBase(null));
    repo.baixarComprovanteStorage.mockRejectedValue(new Error("STORAGE_TIMEOUT"));

    const service = new AnalisadorComprovanteService(
      repo,
      new CorrelacionadorPixService(),
      {} as TesseractWorkerSingleton,
    );

    const resultado = await service.executarPorPagamentoId("pag_001");

    expect(resultado?.statusExecucao).toBe("ERRO");
    expect(resultado?.erroMensagem).toContain("STORAGE_TIMEOUT");
    expect(repo.salvarAnaliseOcr).toHaveBeenCalledWith(
      "pag_001",
      expect.objectContaining({ status_execucao: "ERRO", veredicto: null }),
      "gs://rifasaderidos2026.firebasestorage.app/comprovantes/comp.pdf",
    );
  });

  it("deve lançar TRANSACAO_NAO_ENCONTRADA em reanalisarPorTransacaoId quando não localizar pagamento", async () => {
    const repo = criarRepoMock(null);
    const service = new AnalisadorComprovanteService(
      repo,
      new CorrelacionadorPixService(),
      {} as TesseractWorkerSingleton,
    );

    await expect(service.reanalisarPorTransacaoId("inexistente")).rejects.toThrow(
      "TRANSACAO_NAO_ENCONTRADA",
    );
  });

  it("OcrAnaliseRepository.salvarAnaliseOcr deve respeitar Guarda de Posse (pix_reference_id) dentro de runTransaction", async () => {
    const txUpdate = jest.fn();
    const bilhete0001Ref = { id: "0001", path: "bilhetes/0001" };
    const bilhete0002Ref = { id: "0002", path: "bilhetes/0002" };
    const pagamentoRef = { id: "pag_001", path: "pagamentos_pix/pag_001" };

    const txGet = jest.fn(async (ref: { id: string }) => {
      if (ref.id === "pag_001") {
        return {
          exists: true,
          data: () => ({
            reference_id: "RIFA_ATUAL",
            comprovante_url: "gs://bucket/comp.pdf",
            numeros_rifas: ["0001", "0002"],
          }),
        };
      }
      if (ref.id === "0001") {
        return { exists: true, data: () => ({ pix_reference_id: "RIFA_ATUAL" }) };
      }
      // Bilhete 0002 pertence a outro checkout (TOCTOU) -> não deve ser sobrescrito
      return { exists: true, data: () => ({ pix_reference_id: "OUTRO_PIX" }) };
    });

    const dbMock = {
      collection: jest.fn((nome: string) => ({
        doc: jest.fn((id: string) => {
          if (nome === "pagamentos_pix") return pagamentoRef;
          return id === "0001" ? bilhete0001Ref : bilhete0002Ref;
        }),
      })),
      runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<void>) =>
        fn({ get: txGet, update: txUpdate }),
      ),
    } as unknown as FirebaseFirestore.Firestore;

    const repo = new OcrAnaliseRepository(dbMock, {} as never);
    const analise = criarAnaliseExistente("hash_1");

    await repo.salvarAnaliseOcr("pag_001", analise, "gs://bucket/comp.pdf");

    expect(txUpdate).toHaveBeenCalledTimes(2);
    expect(txUpdate).toHaveBeenCalledWith(pagamentoRef, { analise_ocr: analise });
    expect(txUpdate).toHaveBeenCalledWith(bilhete0001Ref, { analise_ocr: analise });
    expect(txUpdate).not.toHaveBeenCalledWith(bilhete0002Ref, expect.anything());
  });

  it("deve processar venda direta via executarPorBilheteDireto quando não houver pagamentos_pix", async () => {
    const repo = criarRepoMock(null);
    repo.buscarCompraDiretaPorBilhete = jest.fn().mockResolvedValue({
      identificador: "0042",
      compradorId: "comp_42",
      comprovanteUrl: "gs://bucket/comprovantes/direto.pdf",
      valorTotalReais: 20,
      dataCriacaoIso: "2026-11-12T17:00:00.000Z",
      numerosRifas: ["0042", "0043"],
      analiseOcrAtual: null,
    });
    repo.salvarAnaliseOcrCompraDireta = jest.fn().mockResolvedValue(undefined);

    jest.spyOn(ExtratorDocumentoFactory, "criarPorBuffer").mockReturnValue({
      tipoArquivo: "PDF",
      strategy: {
        suporta: () => true,
        extrairTexto: jest.fn().mockResolvedValue({
          tipoArquivo: "PDF",
          modoExtracao: "PDF_NATIVO",
          textoBruto: `
            Nu Pagamentos S.A. - Comprovante Pix
            Valor: R$ 20,00
            Data: 12/11/2026 14:05:00
            CNPJ: 54.789.437/0001-85
            8805 COMISSAO FORMATURA UNIFEI
            E18236120202611121705ABC12345678
          `,
          confiancaMediaOcr: null,
          pdfEscaneado: false,
        }),
      },
    });

    const service = new AnalisadorComprovanteService(
      repo,
      new CorrelacionadorPixService(),
      {} as TesseractWorkerSingleton,
    );

    const resultado = await service.reanalisarPorTransacaoId("0042");

    expect(resultado.statusExecucao).toBe("CONCLUIDO");
    expect(resultado.valorBate).toBe(true);
    expect(repo.salvarAnaliseOcrCompraDireta).toHaveBeenCalledWith(
      ["0042", "0043"],
      "gs://bucket/comprovantes/direto.pdf",
      expect.objectContaining({
        status_execucao: "CONCLUIDO",
        hash_comprovante: expect.any(String),
      }),
    );
  });

  it("OcrAnaliseRepository.adquirirLockComprovanteDireto deve deduplicar chamadas simultâneas", async () => {
    let lockCriado = false;
    const lockRef = { id: "hash_url" };
    const dbMock = {
      collection: jest.fn(() => ({ doc: jest.fn(() => lockRef) })),
      runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<boolean>) =>
        fn({
          get: async () =>
            lockCriado
              ? { exists: true, data: () => ({ criado_em_ms: Date.now() }) }
              : { exists: false },
          set: () => {
            lockCriado = true;
          },
        }),
      ),
    } as unknown as FirebaseFirestore.Firestore;

    const repo = new OcrAnaliseRepository(dbMock, {} as never);

    const primeira = await repo.adquirirLockComprovanteDireto("hash_url");
    const segunda = await repo.adquirirLockComprovanteDireto("hash_url");

    expect(primeira).toBe(true);
    expect(segunda).toBe(false);
  });
});
