import { describe, expect, it } from "vitest";

import {
  calcularResumoAuditoria,
  criarCsvAuditoriaCompras,
  FILTROS_AUDITORIA_COMPRAS_VAZIOS,
  filtrarComprasAuditaveis,
  filtrosAuditoriaAtivos,
  origemLabelAuditoria,
  origemSxAuditoria,
  correcaoPendenteSxAuditoria,
} from "@/features/tesouraria/utils/auditoriaComprasUtils";
import { TransacaoTesouraria } from "@/features/tesouraria/types/auditoriaCompras";

const compras: TransacaoTesouraria[] = [
  {
    id: "compra_pix_1",
    dataReserva: "2026-05-01T10:00:00.000-03:00",
    dataPagamento: "2026-05-01T10:05:00.000-03:00",
    vendedorId: "vend_1",
    vendedorNome: "Ana Vendedora",
    vendedorCpf: "11122233344",
    compradorId: "comprador_maria",
    compradorNome: "Maria Souza",
    compradorEmail: "maria@teste.com",
    compradorTelefone: "35999990000",
    status: "pago",
    origem: "PIX",
    pixOrderId: "order_pix_999",
    statusPagamentoBanco: "CONCLUIDO",
    comprovanteUrl: null,
    bilhetes: ["001", "002"],
    valorTotal: 20,
    valorLiquido: 19.4,
    correcaoPendente: false,
  },
  {
    id: "compra_comprovante_2",
    dataReserva: "2026-05-10T10:00:00.000-03:00",
    dataPagamento: null,
    vendedorId: "vend_2",
    vendedorNome: "Bruno Vendedor",
    vendedorCpf: "55566677788",
    compradorId: "comprador_joao",
    compradorNome: "João Lima",
    compradorEmail: "joao@teste.com",
    compradorTelefone: "35988887777",
    status: "pendente",
    origem: "COMPROVANTE",
    comprovanteUrl: "https://storage.mock/comprovante-joao.png",
    bilhetes: ["003"],
    valorTotal: 10,
    valorLiquido: 10,
    correcaoPendente: true,
  },
];

describe("Utils: histórico de auditoria", () => {
  it("Deve filtrar por busca, status, período, canal e correção", () => {
    // Busca por bilhete
    expect(
      filtrarComprasAuditaveis(compras, {
        ...FILTROS_AUDITORIA_COMPRAS_VAZIOS,
        busca: "003",
      }),
    ).toHaveLength(1);

    // Busca por pixOrderId
    expect(
      filtrarComprasAuditaveis(compras, {
        ...FILTROS_AUDITORIA_COMPRAS_VAZIOS,
        busca: "order_pix_999",
      }),
    ).toHaveLength(1);

    // Filtro por status
    expect(
      filtrarComprasAuditaveis(compras, {
        ...FILTROS_AUDITORIA_COMPRAS_VAZIOS,
        status: "pendente",
      }),
    ).toHaveLength(1);

    // Filtro por data
    expect(
      filtrarComprasAuditaveis(compras, {
        ...FILTROS_AUDITORIA_COMPRAS_VAZIOS,
        dataInicio: "2026-05-09",
      }),
    ).toHaveLength(1);

    // Filtro por canal Pix
    expect(
      filtrarComprasAuditaveis(compras, {
        ...FILTROS_AUDITORIA_COMPRAS_VAZIOS,
        origem: "PIX",
      }),
    ).toHaveLength(1);

    // Filtro por canal Comprovante
    expect(
      filtrarComprasAuditaveis(compras, {
        ...FILTROS_AUDITORIA_COMPRAS_VAZIOS,
        origem: "COMPROVANTE",
      }),
    ).toHaveLength(1);

    // Filtro por somente correção pendente
    expect(
      filtrarComprasAuditaveis(compras, {
        ...FILTROS_AUDITORIA_COMPRAS_VAZIOS,
        somenteCorrecaoPendente: true,
      }),
    ).toHaveLength(1);
    expect(
      filtrarComprasAuditaveis(compras, {
        ...FILTROS_AUDITORIA_COMPRAS_VAZIOS,
        somenteCorrecaoPendente: true,
      })[0].compradorNome,
    ).toBe("João Lima");
  });

  it("Deve calcular resumo com discriminação de líquidos, brutos e canais", () => {
    const resumo = calcularResumoAuditoria(compras);

    expect(resumo.totalCompras).toBe(2);
    expect(resumo.totalRifas).toBe(3);
    expect(resumo.valorTotal).toBe(30);
    expect(resumo.valorLiquido).toBeCloseTo(29.4, 2);
    expect(resumo.comprasPix).toBe(1);
    expect(resumo.comprasComprovante).toBe(1);
    expect(resumo.pagas).toBe(1);
    expect(resumo.pendentes).toBe(1);
  });

  it("Deve gerar CSV auditável com canal de origem, valor líquido e correção", () => {
    const csv = criarCsvAuditoriaCompras(compras);

    expect(csv).toContain("Origem");
    expect(csv).toContain("Valor Líquido (R$)");
    expect(csv).toContain("Status Banco");
    expect(csv).toContain("Correção Pendente");
    expect(csv).toContain("Maria Souza");
    expect(csv).toContain("Pix");
    expect(csv).toContain("Comprovante");
  });

  it("Deve identificar corretamente quando há filtros ativos", () => {
    expect(filtrosAuditoriaAtivos(FILTROS_AUDITORIA_COMPRAS_VAZIOS)).toBe(false);

    expect(
      filtrosAuditoriaAtivos({
        ...FILTROS_AUDITORIA_COMPRAS_VAZIOS,
        origem: "PIX",
      }),
    ).toBe(true);

    expect(
      filtrosAuditoriaAtivos({
        ...FILTROS_AUDITORIA_COMPRAS_VAZIOS,
        somenteCorrecaoPendente: true,
      }),
    ).toBe(true);
  });

  it("Deve retornar rótulos e estilos para origem e pendências", () => {
    expect(origemLabelAuditoria("PIX")).toBe("Pix");
    expect(origemLabelAuditoria("COMPROVANTE")).toBe("Comprovante");
    expect(origemLabelAuditoria(undefined)).toBe("Comprovante");

    expect(origemSxAuditoria("PIX")).toBeDefined();
    expect(origemSxAuditoria("COMPROVANTE")).toBeDefined();
    expect(correcaoPendenteSxAuditoria()).toBeDefined();
  });
});
