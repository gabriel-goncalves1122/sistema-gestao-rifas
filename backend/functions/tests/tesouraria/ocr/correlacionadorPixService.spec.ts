// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/ocr/correlacionadorPixService.spec.ts
// ============================================================================

import { criarContextoAnaliseInicial } from "../../../src/modules/tesouraria/ocr/handlers/normalizacaoOcrUtils";
import { CorrelacionadorPixService } from "../../../src/modules/tesouraria/ocr/services/correlacionadorPixService";
import { PedidoCorrelacaoOcr } from "../../../src/modules/tesouraria/ocr/contracts/ocrContracts";

describe("CorrelacionadorPixService", () => {
  const correlacionador = new CorrelacionadorPixService();

  const pedidoBase: PedidoCorrelacaoOcr = {
    pagamentoId: "pag_001",
    txidEsperado: "RIFAAB12CD34EF",
    valorCentavos: 2000,
    dataCriacaoIso: "2026-11-12T17:00:00.000Z", // 14:00:00 -03:00
    cnpjRecebedorEsperado: "54789437000185",
    recebedorAliases: ["8805", "COMISSAO FORMATURA UNIFEI"],
  };

  it("deve retornar CORRELACAO_FORTE com score alto quando TXID, valor, data BRT e CNPJ batem", () => {
    const contexto = criarContextoAnaliseInicial(
      "Comprovante Pix válido completo com todos os dados exigidos",
    );
    contexto.txidLido = "RIFAAB12CD34EF";
    contexto.txidCandidatos = ["RIFAAB12CD34EF"];
    contexto.e2eId = "E18236120202611121705ABC12345678";
    contexto.valorCentavos = 2000;
    contexto.valoresCandidatosCentavos = [2000];
    contexto.dataTransacaoIso = "2026-11-12T14:05:00-03:00"; // 5 min após criação UTC
    contexto.cnpjRecebedorDetectado = "54789437000185";
    contexto.recebedorDetectado = "COMISSAO DE FORMATURA UNIFEI 2026";

    const resultado = correlacionador.correlacionar(contexto, pedidoBase, false);

    expect(resultado.veredicto).toBe("CORRELACAO_FORTE");
    expect(resultado.score).toBeGreaterThanOrEqual(80);
    expect(resultado.txidBate).toBe(true);
    expect(resultado.valorBate).toBe(true);
    expect(resultado.recebedorBate).toBe(true);
  });

  it("deve aceitar TXID com erro de 1 caractere de OCR (Levenshtein <= 1) como match", () => {
    const contexto = criarContextoAnaliseInicial(
      "Comprovante Pix com leve ruído de OCR no código identificador",
    );
    contexto.txidLido = "RIFAAB12CD34EG"; // 1 char diferente (F -> G)
    contexto.txidCandidatos = ["RIFAAB12CD34EG"];
    contexto.valorCentavos = 2000;
    contexto.valoresCandidatosCentavos = [2000];
    contexto.dataTransacaoIso = "2026-11-12T14:02:00-03:00";
    contexto.cnpjRecebedorDetectado = "54789437000185";

    const resultado = correlacionador.correlacionar(contexto, pedidoBase, false);

    expect(resultado.txidBate).toBe(true);
    expect(resultado.veredicto).toBe("CORRELACAO_FORTE");
  });

  it("deve classificar como SUSPEITO quando e2eDuplicado for true", () => {
    const contexto = criarContextoAnaliseInicial(
      "Comprovante com E2E reutilizado em outra transação do sistema",
    );
    contexto.txidLido = "RIFAAB12CD34EF";
    contexto.txidCandidatos = ["RIFAAB12CD34EF"];
    contexto.e2eId = "E18236120202611121705ABC12345678";
    contexto.valorCentavos = 2000;
    contexto.valoresCandidatosCentavos = [2000];
    contexto.cnpjRecebedorDetectado = "54789437000185";

    const resultado = correlacionador.correlacionar(contexto, pedidoBase, true);

    expect(resultado.veredicto).toBe("SUSPEITO");
    expect(resultado.e2eUnico).toBe(false);
    expect(resultado.alertas).toContain("E2E_DUPLICADO");
  });

  it("deve classificar como DIVERGENTE quando o valor diferir do esperado", () => {
    const contexto = criarContextoAnaliseInicial(
      "Comprovante com valor divergente do valor esperado pelo pedido",
    );
    contexto.txidLido = "RIFAAB12CD34EF";
    contexto.txidCandidatos = ["RIFAAB12CD34EF"];
    contexto.valorCentavos = 1000; // Esperado: 2000
    contexto.valoresCandidatosCentavos = [1000];
    contexto.cnpjRecebedorDetectado = "54789437000185";

    const resultado = correlacionador.correlacionar(contexto, pedidoBase, false);

    expect(resultado.valorBate).toBe(false);
    expect(resultado.alertas).toContain("VALOR_DIVERGENTE");
    expect(resultado.veredicto).toBe("DIVERGENTE");
  });

  it("deve classificar como CORRELACAO_PARCIAL quando não há TXID mas valor e recebedor conferem (legado)", () => {
    const contexto = criarContextoAnaliseInicial(
      "Comprovante legado sem TXID mas com valor e recebedor corretos",
    );
    contexto.txidLido = null;
    contexto.valorCentavos = 2000;
    contexto.valoresCandidatosCentavos = [2000];
    contexto.dataTransacaoIso = "2026-11-12T14:10:00-03:00";
    contexto.recebedorDetectado = "8805 COMISSAO FORMATURA UNIFEI";

    const resultado = correlacionador.correlacionar(contexto, pedidoBase, false);

    expect(resultado.txidBate).toBe(false);
    expect(resultado.valorBate).toBe(true);
    expect(resultado.recebedorBate).toBe(true);
    expect(resultado.veredicto).toBe("CORRELACAO_PARCIAL");
  });
});
