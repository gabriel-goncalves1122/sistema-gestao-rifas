import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { usePaginacaoProgressiva } from "@/shared/hooks/usePaginacaoProgressiva";

describe("Hook: usePaginacaoProgressiva", () => {
  it("Deve exibir apenas o lote inicial e avançar ao chamar carregarMais", () => {
    const itens = Array.from({ length: 12 }, (_, idx) => idx + 1);
    const { result } = renderHook(() => usePaginacaoProgressiva(itens, 5));

    expect(result.current.itensVisiveis).toEqual([1, 2, 3, 4, 5]);
    expect(result.current.restantes).toBe(7);

    act(() => {
      result.current.carregarMais();
    });

    expect(result.current.itensVisiveis).toHaveLength(10);
    expect(result.current.restantes).toBe(2);

    act(() => {
      result.current.carregarMais();
    });

    expect(result.current.itensVisiveis).toHaveLength(12);
    expect(result.current.restantes).toBe(0);
  });

  it("Deve reiniciar o limite visível quando a lista de itens é substituída", () => {
    const listaA = [1, 2, 3, 4, 5, 6];
    const listaB = [10, 20, 30, 40];

    const { result, rerender } = renderHook(
      ({ itens }) => usePaginacaoProgressiva(itens, 2),
      { initialProps: { itens: listaA } },
    );

    act(() => {
      result.current.carregarMais();
    });
    expect(result.current.itensVisiveis).toHaveLength(4);

    rerender({ itens: listaB });

    expect(result.current.itensVisiveis).toEqual([10, 20]);
    expect(result.current.restantes).toBe(2);
  });
});
