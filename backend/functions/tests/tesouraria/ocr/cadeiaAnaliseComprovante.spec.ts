// ============================================================================
// ARQUIVO: backend/functions/tests/tesouraria/ocr/cadeiaAnaliseComprovante.spec.ts
// ============================================================================

import { criarCadeiaAnaliseComprovantePadrao } from "../../../src/modules/tesouraria/ocr/handlers/cadeiaAnaliseComprovanteFactory";
import { criarContextoAnaliseInicial } from "../../../src/modules/tesouraria/ocr/handlers/normalizacaoOcrUtils";

describe("Chain of Responsibility - Análise de Comprovante Pix", () => {
  const cadeia = criarCadeiaAnaliseComprovantePadrao();

  it("deve extrair banco, TXID RIFA, E2E ID, valor em centavos, data e CNPJ de comprovante Nubank", () => {
    const texto = `
      Nu Pagamentos S.A. - Comprovante de transferência Pix
      Valor: R$ 30,00
      Data do pagamento: 12/11/2026 - 14:25:10
      Recebedor: Comissão de Formatura UNIFEI 2026
      CNPJ: 54.789.437/0001-85
      ID da transação: E18236120202611121725s0123456789
      Descrição: RIFAAB12CD34EF
    `;

    const contexto = criarContextoAnaliseInicial(texto);
    cadeia.executar(contexto);

    expect(contexto.bancoDetectado).toBe("NUBANK");
    expect(contexto.txidLido).toBe("RIFAAB12CD34EF");
    expect(contexto.e2eId).toBe("E18236120202611121725S0123456789");
    expect(contexto.valorCentavos).toBe(3000);
    expect(contexto.dataTransacaoIso).toBe("2026-11-12T14:25:10-03:00");
    expect(contexto.cnpjRecebedorDetectado).toBe("54789437000185");
    expect(contexto.alertasTexto).toHaveLength(0);
  });

  it("deve detectar Banco Inter e normalizar valor com separador de milhar", () => {
    const texto = `
      Banco Inter S.A. - Comprovante Pix enviado
      Pago em 05/11/2026 às 09:05:00
      Valor pago R$ 1.250,50
      Favorecido: CLOUDWALK IP LTDA
      CPF/CNPJ: 54789437000185
      Identificador: RIFA9988776655
      E00416968202611051205ABC12345678
    `;

    const contexto = criarContextoAnaliseInicial(texto);
    cadeia.executar(contexto);

    expect(contexto.bancoDetectado).toBe("INTER");
    expect(contexto.valorCentavos).toBe(125050);
    expect(contexto.txidLido).toBe("RIFA9988776655");
    expect(contexto.cnpjRecebedorDetectado).toBe("54789437000185");
  });

  it("deve sinalizar alerta de AGENDAMENTO_DETECTADO quando houver Pix agendado", () => {
    const texto = `
      Itaú Unibanco - Comprovante de Agendamento Pix
      Pagamento agendado para 20/11/2026
      Valor: R$ 10,00
      ID: RIFA1122334455
      E60701190202611121000XYZ98765432
    `;

    const contexto = criarContextoAnaliseInicial(texto);
    cadeia.executar(contexto);

    expect(contexto.bancoDetectado).toBe("ITAU");
    expect(contexto.alertasTexto).toContain("AGENDAMENTO_DETECTADO");
  });

  it("deve sinalizar TEXTO_INSUFICIENTE para texto muito curto", () => {
    const contexto = criarContextoAnaliseInicial("Pix R$ 10");
    cadeia.executar(contexto);

    expect(contexto.alertasTexto).toContain("TEXTO_INSUFICIENTE");
  });

  it("extrai corretamente comprovante do Mercado Pago com valor inteiro (R$ 10) e data por extenso com virgula", () => {
    const texto = `
      Comprovante de Pagamento
      Sexta-feira, 13 de novembro de 2026, às 11:26:28.
      Sua compra R$ 10
      Total: R$ 10
      De
      Lucia Rinaldi
      CPF: ***.445.458-**
      PSP: 323 - Mercado Pago
      Para
      COMISSAO DE FORMATURA UNIFEI 2026 - ITAJUBA
      CNPJ: 54.789.437/0001-85
      PSP: Cloud Walk Meios de Pagamentos e Serviços Ltda.
      ID da transação Pix
      E105735212026111314262tfUVXcwN2a
      Código de autenticação
      189411592404
    `;

    const contexto = criarContextoAnaliseInicial(texto);
    cadeia.executar(contexto);

    expect(contexto.bancoDetectado).toBe("MERCADO PAGO");
    expect(contexto.valorCentavos).toBe(1000);
    expect(contexto.dataTransacaoIso).toBe("2026-11-13T11:26:28-03:00");
    expect(contexto.e2eId).toBe("E105735212026111314262TFUVXCWN2A");
    expect(contexto.cnpjRecebedorDetectado).toBe("54789437000185");
  });
});
