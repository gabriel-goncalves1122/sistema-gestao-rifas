// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/ocrTriggers.ts
// ============================================================================

import { createHash } from "node:crypto";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

import { OcrAnaliseRepository } from "./repositories/ocrAnaliseRepository";
import { AnalisadorComprovanteService } from "./services/analisadorComprovanteService";

/**
 * Trigger assíncrono isolado da API HTTP (`1GiB` de RAM, `maxInstances: 2`)
 * que analisa automaticamente comprovantes em `pagamentos_pix` na criação ou atualização
 * assim que o pagamento entra em `IN_ANALYSIS` ou recebe um novo `comprovante_url`.
 */
export const analisarComprovanteOcrTrigger = onDocumentWritten(
  {
    document: "pagamentos_pix/{pagamentoId}",
    region: "southamerica-east1",
    memory: "1GiB",
    maxInstances: 2,
    timeoutSeconds: 120,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!after) return;

    const emAnalise = after.status_pagamento_banco === "IN_ANALYSIS";
    const possuiComprovante =
      typeof after.comprovante_url === "string" &&
      after.comprovante_url.trim().length > 0;

    if (!emAnalise || !possuiComprovante) {
      return;
    }

    const mudouStatusParaAnalise =
      !before || before.status_pagamento_banco !== "IN_ANALYSIS";
    const mudouComprovante =
      !before || before.comprovante_url !== after.comprovante_url;

    if (!mudouStatusParaAnalise && !mudouComprovante) {
      return;
    }

    const hashAtual =
      typeof after.hash_comprovante === "string" ? after.hash_comprovante : null;
    const hashJaAnalisado = after.analise_ocr?.hash_comprovante ?? null;

    if (
      after.analise_ocr?.status_execucao === "CONCLUIDO" &&
      hashAtual &&
      hashJaAnalisado === hashAtual
    ) {
      return;
    }

    const service = new AnalisadorComprovanteService();
    await service.executarPorPagamentoId(event.params.pagamentoId);
  },
);

/**
 * Trigger assíncrono complementar para vendas diretas por comprovante gravadas apenas
 * na coleção `bilhetes` (sem `pagamentos_pix` / `pix_reference_id`).
 * Usa lock transacional por hash da `comprovante_url` para que lotes de N bilhetes
 * executem o OCR apenas uma única vez.
 */
export const analisarComprovanteBilheteDiretoOcrTrigger = onDocumentWritten(
  {
    document: "bilhetes/{numero}",
    region: "southamerica-east1",
    memory: "1GiB",
    maxInstances: 2,
    timeoutSeconds: 120,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!after) return;

    // Bilhetes com pix_reference_id são analisados pelo trigger de pagamentos_pix
    if (after.pix_reference_id) {
      return;
    }

    const pendente = after.status === "pendente";
    const comprovanteUrl =
      typeof after.comprovante_url === "string"
        ? after.comprovante_url.trim()
        : "";

    if (!pendente || !comprovanteUrl) {
      return;
    }

    const mudouComprovante =
      !before || before.comprovante_url !== after.comprovante_url;
    const entrouEmPendente = !before || before.status !== "pendente";

    if (!mudouComprovante && !entrouEmPendente) {
      return;
    }

    if (after.analise_ocr?.status_execucao === "CONCLUIDO" && !mudouComprovante) {
      return;
    }

    const chaveLock = createHash("sha256").update(comprovanteUrl).digest("hex");
    const repo = new OcrAnaliseRepository();
    const adquiriu = await repo.adquirirLockComprovanteDireto(chaveLock);

    if (!adquiriu) {
      return;
    }

    const service = new AnalisadorComprovanteService(repo);
    await service.executarPorBilheteDireto(event.params.numero);
  },
);
