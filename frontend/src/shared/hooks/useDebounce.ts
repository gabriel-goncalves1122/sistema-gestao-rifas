import { useEffect, useState } from "react";

/**
 * Hook utilitário que atrasa a atualização de um valor até que decorra o tempo de debounce especificado.
 * Utilizado para evitar disparos frequentes de buscas textuais e re-renderizações durante a digitação.
 *
 * @template T
 * @param {T} value - Valor reativo a ser postergado.
 * @param {number} delay - Tempo de espera em milissegundos.
 * @returns {T} Valor debounced atualizado após o delay.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
