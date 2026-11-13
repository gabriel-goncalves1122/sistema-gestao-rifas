// ============================================================================
// ARQUIVO: frontend/tests/features/aderidos/utils/calcularMetricasConsolidadasAderido.test.ts
// ============================================================================
import { describe, expect, it } from "vitest";

import { calcularMetricasConsolidadasAderido } from "@/features/aderidos/utils/calcularMetricasConsolidadasAderido";
import type { RifaAderido } from "@/features/aderidos/types/painelAderido";

describe("calcularMetricasConsolidadasAderido", () => {
  it("Deve calcular valor arrecadado, contadores e grupos recusados em passada única", () => {
    const rifas: RifaAderido[] = [
      { numero: "00001", status: "disponivel" },
      { numero: "00002", status: "pago", comprador_nome: "Maria" },
      { numero: "00003", status: "pago", comprador_nome: "Maria" },
      {
        numero: "00004",
        status: "recusado",
        comprador_nome: "João",
        motivo_recusa: "Comprovante inválido",
        data_reserva: "2026-03-20T10:00:00Z",
        pix_order_id: "ORD_123",
      },
      {
        numero: "00005",
        status: "pago",
        correcao_pendente: true,
        comprador_nome: "Ana",
        motivo_recusa: "Telefone incompleto",
        comprovante_url: "https://comprovante.jpg",
      },
      { numero: "00006", status: "pendente" },
    ];

    const resultado = calcularMetricasConsolidadasAderido(rifas);

    // 3 pagas * R$ 10 = R$ 30
    expect(resultado.valorArrecadado).toBe(30);

    // Contadores
    expect(resultado.contadoresRifas.todas).toBe(6);
    expect(resultado.contadoresRifas.disponivel).toBe(1);
    expect(resultado.contadoresRifas.pago).toBe(3);
    expect(resultado.contadoresRifas.recusado).toBe(1);
    expect(resultado.contadoresRifas.pendente).toBe(1);
    expect(resultado.contadoresRifas.reservado).toBe(0);

    // Grupos recusados
    expect(resultado.gruposRecusados).toHaveLength(2);

    const grupoRecusado = resultado.gruposRecusados.find(
      (g) => g.comprador === "João",
    );
    expect(grupoRecusado).toBeDefined();
    expect(grupoRecusado?.bilhetes).toEqual(["00004"]);
    expect(grupoRecusado?.motivo).toBe("Comprovante inválido");

    const grupoApenasCorrecao = resultado.gruposRecusados.find(
      (g) => g.comprador === "Ana",
    );
    expect(grupoApenasCorrecao).toBeDefined();
    expect(grupoApenasCorrecao?.bilhetes).toEqual(["00005"]);
    expect(grupoApenasCorrecao?.apenasCorrecaoCadastro).toBe(true);
  });

  it("Deve retornar contadores zerados para lista vazia", () => {
    const resultado = calcularMetricasConsolidadasAderido([]);

    expect(resultado.valorArrecadado).toBe(0);
    expect(resultado.contadoresRifas.todas).toBe(0);
    expect(resultado.gruposRecusados).toEqual([]);
  });
});
