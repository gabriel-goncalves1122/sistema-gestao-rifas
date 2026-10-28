import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { useSecretariaSort } from "@/features/secretaria/membros/hooks/useSecretariaSort";
import type { AderidoSecretaria } from "@/features/secretaria/membros/types/secretariaLocalTypes";

const aderidos: AderidoSecretaria[] = [
  { id: "1", nome: "Zebra", email: "z@teste.com", cargo: "aderido", status_cadastro: "ativo", modalidade_adesao: "completo" },
  { id: "2", nome: "Ana", email: "a@teste.com", cargo: "admin", status_cadastro: "ativo", modalidade_adesao: "completo" },
  { id: "3", nome: "Maria", email: "m@teste.com", cargo: "aderido", status_cadastro: "pendente", modalidade_adesao: "meio" },
];

describe("useSecretariaSort", () => {
  it("Deve ordenar por padrao em ordem alfabetica (A-Z)", () => {
    const { result } = renderHook(() => useSecretariaSort(aderidos));

    expect(result.current.sorted).toHaveLength(3);
    expect(result.current.sorted.map((aderido) => aderido.nome)).toEqual([
      "Ana",
      "Maria",
      "Zebra",
    ]);
    expect(result.current.sortBy).toBeNull();
  });

  it("Deve ordenar por nome ascendente", () => {
    const { result } = renderHook(() => useSecretariaSort(aderidos));

    act(() => {
      result.current.toggleSort("nome");
    });

    expect(result.current.sortBy).toBe("nome");
    expect(result.current.sortDir).toBe("asc");
    expect(result.current.sorted[0].nome).toBe("Ana");
    expect(result.current.sorted[1].nome).toBe("Maria");
    expect(result.current.sorted[2].nome).toBe("Zebra");
  });

  it("Deve inverter direcao ao clicar na mesma coluna", () => {
    const { result } = renderHook(() => useSecretariaSort(aderidos));

    act(() => {
      result.current.toggleSort("nome");
    });

    act(() => {
      result.current.toggleSort("nome");
    });

    expect(result.current.sortDir).toBe("desc");
    expect(result.current.sorted[0].nome).toBe("Zebra");
    expect(result.current.sorted[1].nome).toBe("Maria");
    expect(result.current.sorted[2].nome).toBe("Ana");
  });

  it("Deve ordenar por status", () => {
    const { result } = renderHook(() => useSecretariaSort(aderidos));

    act(() => {
      result.current.toggleSort("status");
    });

    expect(result.current.sortBy).toBe("status");
    expect(result.current.sorted[0].status_cadastro).toBe("ativo");
  });

  it("Deve ignorar coluna desconhecida mantendo ordem alfabetica", () => {
    const { result } = renderHook(() => useSecretariaSort(aderidos));

    act(() => {
      result.current.toggleSort("inexistente");
    });

    expect(result.current.sorted.map((aderido) => aderido.nome)).toEqual([
      "Ana",
      "Maria",
      "Zebra",
    ]);
  });
});
