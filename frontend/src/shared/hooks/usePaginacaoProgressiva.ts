import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Hook reutilizável para renderização progressiva (infinite scroll local em lotes)
 * utilizando `IntersectionObserver` sobre listas extensas em dispositivos móveis.
 *
 * @template T Tipo do item da lista.
 * @param {readonly T[]} itens - Coleção completa já filtrada a ser exibida em lotes.
 * @param {number} [tamanhoLote=20] - Quantidade de itens revelados inicialmente e a cada expansão.
 * @returns {{
 *   itensVisiveis: T[];
 *   restantes: number;
 *   sentinelaRef: React.RefObject<HTMLDivElement | null>;
 *   carregarMais: () => void;
 * }} Subconjunto visível, contagem restante, ref da sentinela e callback manual.
 */
export function usePaginacaoProgressiva<T>(
  itens: readonly T[],
  tamanhoLote = 20,
) {
  const [limiteVisivel, setLimiteVisivel] = useState(tamanhoLote);
  const sentinelaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLimiteVisivel(tamanhoLote);
  }, [itens, tamanhoLote]);

  const carregarMais = useCallback(() => {
    setLimiteVisivel((atual) => Math.min(atual + tamanhoLote, itens.length));
  }, [itens.length, tamanhoLote]);

  useEffect(() => {
    const elemento = sentinelaRef.current;
    if (!elemento || typeof IntersectionObserver === "undefined") return;
    if (limiteVisivel >= itens.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLimiteVisivel((atual) => Math.min(atual + tamanhoLote, itens.length));
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(elemento);
    return () => observer.disconnect();
  }, [itens.length, limiteVisivel, tamanhoLote]);

  const itensVisiveis = useMemo(
    () => itens.slice(0, limiteVisivel),
    [itens, limiteVisivel],
  );
  const restantes = Math.max(itens.length - itensVisiveis.length, 0);

  return {
    itensVisiveis,
    restantes,
    sentinelaRef,
    carregarMais,
  };
}
