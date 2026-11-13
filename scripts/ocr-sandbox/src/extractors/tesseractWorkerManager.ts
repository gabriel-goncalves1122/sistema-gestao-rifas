// ============================================================================
// ARQUIVO: scripts/ocr-sandbox/src/extractors/tesseractWorkerManager.ts
// ============================================================================

import { createWorker, Worker } from "tesseract.js";

/** Resultado individual de reconhecimento OCR via worker reutilizável. */
export interface ResultadoTesseractWorker {
  texto: string;
  confiancaMedia: number;
  coldStart: boolean;
}

/**
 * Gerenciador de ciclo de vida do Worker Tesseract (`por`).
 * Permite reutilizar a mesma instância WASM/traineddata entre múltiplas imagens
 * (equivalente ao comportamento em instância quente no Cloud Functions) e
 * encerrá-la de forma determinística via `encerrar()`.
 */
export class TesseractWorkerManager {
  private worker: Worker | null = null;
  private inicializando: Promise<Worker> | null = null;

  /**
   * Garante um Worker inicializado para língua portuguesa (`por`).
   *
   * @returns {Promise<{ worker: Worker; coldStart: boolean }>} Instância pronta e flag de cold start.
   */
  private async obterWorker(): Promise<{ worker: Worker; coldStart: boolean }> {
    if (this.worker) {
      return { worker: this.worker, coldStart: false };
    }

    if (!this.inicializando) {
      this.inicializando = createWorker("por").then((instancia) => {
        this.worker = instancia;
        return instancia;
      });
    }

    const worker = await this.inicializando;
    return { worker, coldStart: true };
  }

  /**
   * Executa OCR sobre um buffer de imagem usando o worker compartilhado.
   *
   * @param {Buffer} bufferImagem - Bytes PNG/JPEG/WebP para leitura.
   * @returns {Promise<ResultadoTesseractWorker>} Texto reconhecido, confiança média e flag de cold start.
   */
  async reconhecer(bufferImagem: Buffer): Promise<ResultadoTesseractWorker> {
    const { worker, coldStart } = await this.obterWorker();
    const { data } = await worker.recognize(bufferImagem);

    return {
      texto: data.text || "",
      confiancaMedia: typeof data.confidence === "number" ? data.confidence : 0,
      coldStart,
    };
  }

  /**
   * Encerra o worker em memória, liberando threads e buffers WASM.
   *
   * @returns {Promise<void>}
   */
  async encerrar(): Promise<void> {
    if (this.inicializando) {
      await this.inicializando.catch(() => {});
      this.inicializando = null;
    }

    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
