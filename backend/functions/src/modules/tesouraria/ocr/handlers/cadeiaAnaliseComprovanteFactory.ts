// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/handlers/cadeiaAnaliseComprovanteFactory.ts
// ============================================================================

import { IAnalisadorComprovanteHandler } from "../contracts/ocrContracts";
import { DetectorRiscoHandler } from "./detectorRiscoHandler";
import { ExtratorRecebedorCnpjHandler } from "./extratorRecebedorCnpjHandler";
import { ExtratorTxidE2eHandler } from "./extratorTxidE2eHandler";
import { ExtratorValorDataHandler } from "./extratorValorDataHandler";
import { IdentificadorBancoHandler } from "./identificadorBancoHandler";

/**
 * Factory responsável por montar a cadeia padrão (Chain of Responsibility)
 * de análise de comprovantes Pix na ordem ideal de enriquecimento.
 *
 * @returns {IAnalisadorComprovanteHandler} Primeiro elo da cadeia pronta para execução.
 */
export function criarCadeiaAnaliseComprovantePadrao(): IAnalisadorComprovanteHandler {
  const identificadorBanco = new IdentificadorBancoHandler();
  const extratorTxidE2e = new ExtratorTxidE2eHandler();
  const extratorValorData = new ExtratorValorDataHandler();
  const extratorRecebedor = new ExtratorRecebedorCnpjHandler();
  const detectorRisco = new DetectorRiscoHandler();

  identificadorBanco
    .definirProximo(extratorTxidE2e)
    .definirProximo(extratorValorData)
    .definirProximo(extratorRecebedor)
    .definirProximo(detectorRisco);

  return identificadorBanco;
}
