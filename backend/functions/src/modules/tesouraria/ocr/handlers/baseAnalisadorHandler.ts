// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/handlers/baseAnalisadorHandler.ts
// ============================================================================

import {
  ContextoAnaliseComprovante,
  IAnalisadorComprovanteHandler,
} from "../contracts/ocrContracts";

/**
 * Classe base abstrata para os elos da Chain of Responsibility de análise OCR.
 * Cada subclasse implementa `processar(contexto)` e delega automaticamente ao próximo elo.
 */
export abstract class BaseAnalisadorHandler implements IAnalisadorComprovanteHandler {
  private proximo: IAnalisadorComprovanteHandler | null = null;

  /**
   * Encadeia o próximo handler na sequência de execução.
   *
   * @param {IAnalisadorComprovanteHandler} proximo - Próximo elo da cadeia.
   * @returns {IAnalisadorComprovanteHandler} O próximo handler para encadeamento fluente.
   */
  definirProximo(proximo: IAnalisadorComprovanteHandler): IAnalisadorComprovanteHandler {
    this.proximo = proximo;
    return proximo;
  }

  /**
   * Executa a responsabilidade deste handler e propaga para o próximo elo, se existir.
   *
   * @param {ContextoAnaliseComprovante} contexto - Contexto acumulado da análise.
   */
  executar(contexto: ContextoAnaliseComprovante): void {
    this.processar(contexto);
    if (this.proximo) {
      this.proximo.executar(contexto);
    }
  }

  /**
   * Implementa a regra específica de extração ou detecção deste elo.
   *
   * @param {ContextoAnaliseComprovante} contexto - Contexto acumulado da análise.
   */
  protected abstract processar(contexto: ContextoAnaliseComprovante): void;
}
