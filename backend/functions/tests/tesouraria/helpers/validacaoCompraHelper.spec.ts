import { describe, expect, it } from "@jest/globals";

import {
  bilhetePertenceAoPagamento,
  ehChaveManual,
  montarNotificacaoCorrecaoDados,
  montarPayloadBilheteAprovado,
  montarPayloadBilheteRecusado,
  resolverFiltrosChaveManual,
} from "../../../src/modules/tesouraria/helpers/validacaoCompraHelper";

describe("Helper: validacaoCompraHelper", () => {
  it("Deve identificar chaves manuais corretamente", () => {
    expect(ehChaveManual("comprovante-https://x")).toBe(true);
    expect(ehChaveManual("comprador-C1")).toBe(true);
    expect(ehChaveManual("pixref-REF1")).toBe(true);
    expect(ehChaveManual("manual|Joao|2026|pendente")).toBe(true);
    expect(ehChaveManual("pix-ORD1")).toBe(false);
  });

  it("Deve resolver filtros de consulta para chaves manuais e rejeitar formatos inválidos", () => {
    expect(resolverFiltrosChaveManual("comprovante-url1")).toEqual([
      { campo: "comprovante_url", valor: "url1" },
    ]);
    expect(resolverFiltrosChaveManual("manual|Maria|sem-data|pendente")).toEqual([
      { campo: "comprador_nome", valor: "Maria" },
      { campo: "status", valor: "pendente" },
    ]);
    expect(() => resolverFiltrosChaveManual("manual|invalido")).toThrow("CANNOT_PARSE_MANUAL_KEY");
    expect(() => resolverFiltrosChaveManual("pix-123")).toThrow("CHAVE_INVALIDA");
  });

  it("Deve verificar vínculo do bilhete com o pagamento e montar payloads consistentes", () => {
    expect(bilhetePertenceAoPagamento({ status: "disponivel" }, {}, "ORD1")).toBe(false);
    expect(bilhetePertenceAoPagamento({ status: "pendente", pix_order_id: "ORD1" }, {}, "ORD1")).toBe(true);
    expect(bilhetePertenceAoPagamento({ status: "pendente", pix_order_id: "ORD2" }, {}, "ORD1")).toBe(false);
    expect(
      bilhetePertenceAoPagamento(
        { status: "pendente", pix_reference_id: "REF1" },
        { reference_id: "REF1" },
        "ORD1",
      ),
    ).toBe(true);

    expect(
      montarPayloadBilheteAprovado({
        valorBruto: 10,
        validadoEm: "2026-11-11T10:00:00Z",
        validadoPor: "admin@unifei.edu.br",
      }),
    ).toEqual(
      expect.objectContaining({
        status: "pago",
        status_validacao: "aceita",
        status_pagamento_banco: "PAID",
        valor_pago: 10,
      }),
    );

    expect(
      montarPayloadBilheteRecusado({
        motivo: "Valor inválido",
        validadoEm: "2026-11-11T10:00:00Z",
        validadoPor: "admin@unifei.edu.br",
        atualizarStatusBanco: false,
      }),
    ).not.toHaveProperty("status_pagamento_banco");

    expect(
      montarNotificacaoCorrecaoDados({
        vendedorId: "AD1",
        titulo: "Venda recusada",
        mensagem: "Ajustar",
        rifas: ["001"],
        dataCriacao: "2026-11-11T10:00:00Z",
      }),
    ).toEqual(
      expect.objectContaining({
        vendedor_id: "AD1",
        tipo: "correcao_dados",
        lida: false,
      }),
    );
  });
});
