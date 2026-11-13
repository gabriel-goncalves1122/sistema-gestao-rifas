// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/repositories/ocrAnaliseRepository.ts
// ============================================================================

import * as admin from "firebase-admin";

import {
  AnaliseOcrFirestore,
  CompraDiretaParaAnaliseOcr,
  IOcrAnaliseRepository,
  PagamentoParaAnaliseOcr,
} from "../contracts/ocrContracts";

const VALOR_RIFA_PADRAO_REAIS = 10;

/**
 * Repositório OO responsável pelo acesso ao Firestore (`pagamentos_pix` / `bilhetes`)
 * e download de comprovantes no Firebase Storage para o motor de análise OCR.
 */
export class OcrAnaliseRepository implements IOcrAnaliseRepository {
  constructor(
    private readonly db: admin.firestore.Firestore = admin.firestore(),
    private readonly storage: admin.storage.Storage = admin.storage(),
  ) {}

  /**
   * Busca um documento de `pagamentos_pix` pelo ID e normaliza seus metadados para análise.
   *
   * @param {string} pagamentoId - Identificador do documento em `pagamentos_pix`.
   * @returns {Promise<PagamentoParaAnaliseOcr | null>} Dados do pagamento ou `null` se não existir.
   */
  async buscarPagamentoPorId(
    pagamentoId: string,
  ): Promise<PagamentoParaAnaliseOcr | null> {
    const snap = await this.db.collection("pagamentos_pix").doc(pagamentoId).get();
    if (!snap.exists) {
      return null;
    }

    const dados = snap.data() || {};
    return {
      pagamentoId: snap.id,
      referenceId: String(dados.reference_id || snap.id),
      pixOrderId: typeof dados.pix_order_id === "string" ? dados.pix_order_id : null,
      valorBrutoReais: Number(dados.valor_bruto ?? dados.valor_pago ?? 0),
      statusPagamentoBanco: String(dados.status_pagamento_banco || ""),
      comprovanteUrl:
        typeof dados.comprovante_url === "string" ? dados.comprovante_url : null,
      hashComprovante:
        typeof dados.hash_comprovante === "string" ? dados.hash_comprovante : null,
      dataCriacaoIso: String(dados.data_criacao || ""),
      numerosRifas: Array.isArray(dados.numeros_rifas)
        ? dados.numeros_rifas.map(String)
        : [],
      analiseOcrAtual: (dados.analise_ocr as AnaliseOcrFirestore | null) ?? null,
    };
  }

  /**
   * Resolve o ID real em `pagamentos_pix` a partir de um `transacaoId` recebido pela API
   * (aceita ID do documento, `reference_id`, `pix_order_id` ou número de bilhete).
   *
   * @param {string} transacaoId - Identificador vindo da rota da Tesouraria.
   * @returns {Promise<string | null>} ID do documento em `pagamentos_pix` ou `null`.
   */
  async resolverPagamentoIdPorTransacao(transacaoId: string): Promise<string | null> {
    const limpo = (transacaoId || "").trim();
    if (!limpo) return null;

    const direto = await this.db.collection("pagamentos_pix").doc(limpo).get();
    if (direto.exists) {
      return direto.id;
    }

    const porReference = await this.db
      .collection("pagamentos_pix")
      .where("reference_id", "==", limpo)
      .limit(1)
      .get();
    if (!porReference.empty) {
      return porReference.docs[0].id;
    }

    const porOrderId = await this.db
      .collection("pagamentos_pix")
      .where("pix_order_id", "==", limpo)
      .limit(1)
      .get();
    if (!porOrderId.empty) {
      return porOrderId.docs[0].id;
    }

    const bilheteSnap = await this.db.collection("bilhetes").doc(limpo).get();
    if (bilheteSnap.exists) {
      const dadosBilhete = bilheteSnap.data() || {};
      if (typeof dadosBilhete.pagamento_id === "string" && dadosBilhete.pagamento_id) {
        return dadosBilhete.pagamento_id;
      }
      if (
        typeof dadosBilhete.pix_reference_id === "string" &&
        dadosBilhete.pix_reference_id
      ) {
        const refSnap = await this.db
          .collection("pagamentos_pix")
          .where("reference_id", "==", dadosBilhete.pix_reference_id)
          .limit(1)
          .get();
        if (!refSnap.empty) {
          return refSnap.docs[0].id;
        }
      }
    }

    return null;
  }

  /**
   * Baixa os bytes de um comprovante armazenado no Firebase Storage (1 único roundtrip GCS),
   * aceitando caminho relativo (`comprovantes/...`) ou URLs HTTPS/GS.
   * Em ambiente de emulador local, faz fallback para `fetch` HTTPS caso a URL seja pública.
   *
   * @param {string} caminhoOuUrl - Valor salvo em `comprovante_url`.
   * @returns {Promise<Buffer>} Conteúdo binário do arquivo.
   * @throws {Error} `"COMPROVANTE_NAO_ENCONTRADO_STORAGE"` quando o arquivo não existe.
   */
  async baixarComprovanteStorage(caminhoOuUrl: string): Promise<Buffer> {
    const emAmbienteEmulador = Boolean(
      process.env.FIRESTORE_EMULATOR_HOST ||
        process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
        process.env.FUNCTIONS_EMULATOR === "true",
    );
    const ehUrlHttps = /^https?:\/\//i.test((caminhoOuUrl || "").trim());

    try {
      const { bucketNome, caminhoObjeto } = this.extrairBucketECaminho(caminhoOuUrl);
      const bucket = bucketNome ? this.storage.bucket(bucketNome) : this.storage.bucket();
      const arquivo = bucket.file(caminhoObjeto);
      const [buffer] = await arquivo.download();
      return buffer;
    } catch (erroStorage: unknown) {
      if (emAmbienteEmulador && ehUrlHttps) {
        const resposta = await fetch(caminhoOuUrl, {
          signal: AbortSignal.timeout(15000),
        });
        if (resposta.ok) {
          return Buffer.from(await resposta.arrayBuffer());
        }
      }

      const codigo =
        typeof erroStorage === "object" && erroStorage !== null && "code" in erroStorage
          ? Number((erroStorage as { code?: unknown }).code)
          : null;
      if (codigo === 404) {
        throw new Error("COMPROVANTE_NAO_ENCONTRADO_STORAGE");
      }

      throw erroStorage;
    }
  }

  /**
   * Verifica se o mesmo End-to-End ID Pix já foi detectado em outra compra distinta,
   * prevenindo reutilização de comprovante válido em pedidos diferentes.
   *
   * @param {string} e2eId - End-to-End ID de 32 caracteres normalizado.
   * @param {string} pagamentoIdAtual - ID do pagamento sendo analisado.
   * @returns {Promise<boolean>} `true` se houver outro pagamento com o mesmo E2E ID.
   */
  async existeOutroPagamentoComE2e(
    e2eId: string,
    pagamentoIdAtual: string,
  ): Promise<boolean> {
    if (!e2eId) return false;

    const snap = await this.db
      .collection("pagamentos_pix")
      .where("analise_ocr.e2e_id_detectado", "==", e2eId)
      .limit(5)
      .get();

    return snap.docs.some((doc) => doc.id !== pagamentoIdAtual);
  }

  /**
   * Persiste `analise_ocr` de forma atômica via `runTransaction` em `pagamentos_pix`
   * e nos `bilhetes` pertencentes ao mesmo `reference_id` (Guarda de Posse),
   * sem jamais sobrescrever o status financeiro da transação.
   *
   * @param {string} pagamentoId - Identificador do pagamento no Firestore.
   * @param {AnaliseOcrFirestore} analise - Resultado estruturado da análise OCR.
   * @param {string} comprovanteUrlEsperado - Guarda TOCTOU garantindo que o comprovante não mudou.
   * @returns {Promise<void>}
   * @transactional Executa leitura e atualização atômica no Firestore via `runTransaction`.
   */
  async salvarAnaliseOcr(
    pagamentoId: string,
    analise: AnaliseOcrFirestore,
    comprovanteUrlEsperado: string,
  ): Promise<void> {
    const pagamentoRef = this.db.collection("pagamentos_pix").doc(pagamentoId);

    await this.db.runTransaction(async (transaction) => {
      const pagSnap = await transaction.get(pagamentoRef);
      if (!pagSnap.exists) return;

      const dadosPag = pagSnap.data() || {};
      if (
        comprovanteUrlEsperado &&
        dadosPag.comprovante_url !== comprovanteUrlEsperado
      ) {
        // Usuário reenviou outro comprovante enquanto o OCR rodava; descarta escrita obsoleta
        return;
      }

      const referenceId = String(dadosPag.reference_id || "");
      const numerosRifas: string[] = Array.isArray(dadosPag.numeros_rifas)
        ? dadosPag.numeros_rifas.map(String)
        : [];

      const bilheteRefs = numerosRifas.map((num) =>
        this.db.collection("bilhetes").doc(num),
      );
      const bilheteSnaps = await Promise.all(
        bilheteRefs.map((ref) => transaction.get(ref)),
      );

      transaction.update(pagamentoRef, { analise_ocr: analise });

      bilheteSnaps.forEach((bilheteSnap, idx) => {
        if (!bilheteSnap.exists) return;
        const dadosBilhete = bilheteSnap.data() || {};
        if (referenceId && dadosBilhete.pix_reference_id !== referenceId) {
          return;
        }
        transaction.update(bilheteRefs[idx], { analise_ocr: analise });
      });
    });
  }

  /**
   * Busca uma compra direta por comprovante (sem documento em `pagamentos_pix`)
   * a partir do número de um bilhete ou `comprador_id`, agrupando todas as rifas
   * que compartilham a mesma `comprovante_url`.
   *
   * @param {string} identificador - Número do bilhete ou `comprador_id`.
   * @returns {Promise<CompraDiretaParaAnaliseOcr | null>} Dados agrupados da compra direta ou `null`.
   */
  async buscarCompraDiretaPorBilhete(
    identificador: string,
  ): Promise<CompraDiretaParaAnaliseOcr | null> {
    const limpo = (identificador || "").trim();
    if (!limpo) return null;

    let baseSnap = await this.db.collection("bilhetes").doc(limpo).get();
    if (!baseSnap.exists) {
      const porComprador = await this.db
        .collection("bilhetes")
        .where("comprador_id", "==", limpo)
        .limit(1)
        .get();
      if (porComprador.empty) return null;
      baseSnap = porComprador.docs[0];
    }

    const dadosBase = baseSnap.data() || {};
    const comprovanteUrl =
      typeof dadosBase.comprovante_url === "string"
        ? dadosBase.comprovante_url.trim()
        : "";
    if (!comprovanteUrl) return null;

    const grupoSnap = await this.db
      .collection("bilhetes")
      .where("comprovante_url", "==", comprovanteUrl)
      .get();

    const docsGrupo = grupoSnap.empty ? [baseSnap] : grupoSnap.docs;
    const numerosRifas = docsGrupo.map((d) => d.id);
    const valorTotalReais = docsGrupo.reduce((acc, d) => {
      const v = Number(d.data()?.valor_bruto ?? VALOR_RIFA_PADRAO_REAIS);
      return acc + (Number.isFinite(v) && v > 0 ? v : VALOR_RIFA_PADRAO_REAIS);
    }, 0);

    return {
      identificador: baseSnap.id,
      compradorId:
        typeof dadosBase.comprador_id === "string" ? dadosBase.comprador_id : null,
      comprovanteUrl,
      valorTotalReais,
      dataCriacaoIso: String(
        dadosBase.data_reserva || dadosBase.data_pagamento || "",
      ),
      numerosRifas,
      analiseOcrAtual: (dadosBase.analise_ocr as AnaliseOcrFirestore | null) ?? null,
    };
  }

  /**
   * Adquire lock transacional de deduplicação para evitar que uma venda direta com
   * N bilhetes dispare N execuções paralelas de OCR para a mesma `comprovante_url`.
   *
   * @param {string} chaveLock - Hash SHA-256 da `comprovante_url`.
   * @returns {Promise<boolean>} `true` se esta execução adquiriu o lock, `false` se outra já processou.
   * @transactional Executa leitura e criação atômica em `ocr_bilhetes_locks/{chaveLock}`.
   */
  async adquirirLockComprovanteDireto(chaveLock: string): Promise<boolean> {
    const lockRef = this.db.collection("ocr_bilhetes_locks").doc(chaveLock);

    return this.db.runTransaction(async (transaction) => {
      const snap = await transaction.get(lockRef);
      if (snap.exists) {
        const criadoEm = Number(snap.data()?.criado_em_ms || 0);
        // Se um lock anterior travou há mais de 3 minutos, permite nova tentativa
        if (Date.now() - criadoEm < 180_000) {
          return false;
        }
      }

      transaction.set(lockRef, {
        criado_em_ms: Date.now(),
        atualizado_em: new Date().toISOString(),
      });
      return true;
    });
  }

  /**
   * Persiste `analise_ocr` via `runTransaction` em todos os bilhetes de uma compra direta
   * cuja `comprovante_url` ainda corresponda à analisada (proteção TOCTOU).
   *
   * @param {string[]} numerosRifas - Números dos bilhetes pertencentes ao lote.
   * @param {string} comprovanteUrlEsperado - URL do comprovante analisado.
   * @param {AnaliseOcrFirestore} analise - Resultado OCR a gravar.
   * @returns {Promise<void>}
   * @transactional Executa leitura e atualização atômica nos bilhetes via `runTransaction`.
   */
  async salvarAnaliseOcrCompraDireta(
    numerosRifas: string[],
    comprovanteUrlEsperado: string,
    analise: AnaliseOcrFirestore,
  ): Promise<void> {
    if (numerosRifas.length === 0) return;

    await this.db.runTransaction(async (transaction) => {
      const refs = numerosRifas.map((num) => this.db.collection("bilhetes").doc(num));
      const snaps = await Promise.all(refs.map((ref) => transaction.get(ref)));

      snaps.forEach((snap, idx) => {
        if (!snap.exists) return;
        const dados = snap.data() || {};
        if (dados.comprovante_url !== comprovanteUrlEsperado) {
          return;
        }
        transaction.update(refs[idx], { analise_ocr: analise });
      });
    });
  }

  private extrairBucketECaminho(valorUrlOuPath: string): {
    bucketNome: string | null;
    caminhoObjeto: string;
  } {
    const limpo = (valorUrlOuPath || "").trim();

    const matchHttps = limpo.match(
      /^https?:\/\/firebasestorage\.googleapis\.com\/v\d+\/b\/([^/]+)\/o\/([^?]+)/i,
    );
    if (matchHttps) {
      return {
        bucketNome: decodeURIComponent(matchHttps[1]),
        caminhoObjeto: decodeURIComponent(matchHttps[2]),
      };
    }

    const matchGs = limpo.match(/^gs:\/\/([^/]+)\/(.+)$/i);
    if (matchGs) {
      return {
        bucketNome: matchGs[1],
        caminhoObjeto: matchGs[2],
      };
    }

    return {
      bucketNome: null,
      caminhoObjeto: limpo.replace(/^\/+/, ""),
    };
  }
}
