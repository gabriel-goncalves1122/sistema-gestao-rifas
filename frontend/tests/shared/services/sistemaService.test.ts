import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/shared/services/api", () => ({
  fetchAPI: vi.fn(),
}));

import { sistemaService } from "@/shared/services/sistemaService";
import { fetchAPI } from "@/shared/services/api";

describe("sistemaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("obterStatusManutencao deve chamar GET /sistema/manutencao sem autenticacao", async () => {
    const mockDto = {
      emManutencao: false,
      mensagem: "Normal",
      previsaoRetorno: null,
      atualizadoEm: null,
      atualizadoPor: null,
    };

    (fetchAPI as any).mockResolvedValueOnce(mockDto);

    const resultado = await sistemaService.obterStatusManutencao();

    expect(fetchAPI).toHaveBeenCalledWith(
      "/sistema/manutencao",
      "GET",
      undefined,
      false,
    );
    expect(resultado).toEqual(mockDto);
  });

  it("atualizarStatusManutencao deve chamar PUT /admin/manutencao com autenticacao", async () => {
    const payload = {
      emManutencao: true,
      mensagem: "Manutenção de emergência",
      previsaoRetorno: "1h",
    };

    const mockDto = {
      ...payload,
      atualizadoEm: "2026-11-11T12:00:00.000Z",
      atualizadoPor: "admin@unifei.edu.br",
    };

    (fetchAPI as any).mockResolvedValueOnce({
      success: true,
      manutencao: mockDto,
    });

    const resultado = await sistemaService.atualizarStatusManutencao(payload);

    expect(fetchAPI).toHaveBeenCalledWith(
      "/admin/manutencao",
      "PUT",
      payload,
      true,
    );
    expect(resultado).toEqual(mockDto);
  });
});
