// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/ocrTriggers.ts
// ============================================================================

import { onDocumentWritten } from "firebase-functions/v2/firestore";

import { AnalisadorComprovanteService } from "./services/analisadorComprovanteService";

/**
 * Trigger assíncrono isolado da API HTTP (`1GiB` de RAM, `maxInstances: 5`)
 * que analisa automaticamente comprovantes em `pagamentos_pix` na criação ou atualização
 * assim que o pagamento entra em `IN_ANALYSIS` ou recebe um novo `comprovante_url`.
 */
export const analisarComprovanteOcrTrigger = onDocumentWritten(
  {
    document: "pagamentos_pix/{pagamentoId}",
    region: "southamerica-east1",
    memory: "1GiB",
    maxInstances: 5,
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
    await service.executarPorPagamentoId(event.params.pagamentoId, {
      permitirAprovacaoAutomatica: true,
    });
  },
);
