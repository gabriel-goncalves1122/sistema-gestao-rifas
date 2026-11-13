// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/extractors/tesseractWorkerSingleton.ts
// ============================================================================

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createWorker, Worker } from "tesseract.js";

/** Resultado de reconhecimento retornado pelo worker Tesseract. */
export interface ResultadoReconhecimentoTesseract {
  texto: string;
  confiancaMedia: number;
}

/**
 * Singleton gerenciador de instância `Worker` do Tesseract (`por`).
 * Reutiliza o runtime WASM e o modelo treinado entre invocações quentes
 * na mesma instância da Cloud Function, reduzindo latência e picos de memória.
 */
export class TesseractWorkerSingleton {
  private static instancia: TesseractWorkerSingleton | null = null;
  private worker: Worker | null = null;
  private inicializando: Promise<Worker> | null = null;

  private constructor() {}

  /**
   * Retorna a instância única do gerenciador de worker.
   *
   * @returns {TesseractWorkerSingleton} Instância singleton compartilhada.
   */
  static obterInstancia(): TesseractWorkerSingleton {
    if (!TesseractWorkerSingleton.instancia) {
      TesseractWorkerSingleton.instancia = new TesseractWorkerSingleton();
    }
    return TesseractWorkerSingleton.instancia;
  }

  /**
   * Inicializa o worker em português sob demanda ou reutiliza o existente.
   */
  private async obterWorkerPronto(): Promise<Worker> {
    if (this.worker) {
      return this.worker;
    }

    if (!this.inicializando) {
      const langPathLocal = this.resolverLangPathLocal();
      const opcoesWorker: Parameters<typeof createWorker>[2] = {
        cachePath: os.tmpdir(),
        ...(langPathLocal ? { langPath: langPathLocal, gzip: false } : {}),
      };

      this.inicializando = createWorker("por", 1, opcoesWorker).then(
        (workerCriado) => {
          this.worker = workerCriado;
          return workerCriado;
        },
      );
    }

    try {
      return await this.inicializando;
    } catch (error) {
      this.inicializando = null;
      throw error;
    }
  }

  /**
   * Executa OCR sobre o buffer da imagem usando o worker compartilhado.
   *
   * @param {Buffer} bufferImagem - Bytes de imagem PNG/JPEG/WebP.
   * @returns {Promise<ResultadoReconhecimentoTesseract>} Texto extraído e confiança média (0-100).
   */
  async reconhecer(bufferImagem: Buffer): Promise<ResultadoReconhecimentoTesseract> {
    const worker = await this.obterWorkerPronto();
    const { data } = await worker.recognize(bufferImagem);

    return {
      texto: data.text || "",
      confiancaMedia: typeof data.confidence === "number" ? data.confidence : 0,
    };
  }

  /**
   * Encerra o worker ativo e limpa referências (útil em testes ou desligamento).
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

  private resolverLangPathLocal(): string | null {
    const candidatos = [
      process.env.TESSERACT_LANG_PATH || "",
      path.resolve(process.cwd(), "tessdata"),
      path.resolve(process.cwd(), "scripts/ocr-sandbox"),
      path.resolve(process.cwd(), "../../scripts/ocr-sandbox"),
    ].filter(Boolean);

    for (const dir of candidatos) {
      if (fs.existsSync(path.join(dir, "por.traineddata"))) {
        return dir;
      }
    }

    return null;
  }
}
