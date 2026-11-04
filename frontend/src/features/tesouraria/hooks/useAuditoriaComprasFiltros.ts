import { useMemo, useState, useCallback, useDeferredValue } from "react";
import {
  AuditoriaComprasFiltros,
  TransacaoTesouraria,
} from "../types/auditoriaCompras";
import {
  FILTROS_AUDITORIA_COMPRAS_VAZIOS,
  filtrarComprasAuditaveis,
  filtrosAuditoriaAtivos,
} from "../utils/auditoriaComprasUtils";
import { useDebounce } from "@/shared/hooks/useDebounce";

/**
 * Hook de gerenciamento de estado de filtros da auditoria de compras.
 * Aplica debounce e valor diferido (useDeferredValue) na busca para evitar travamentos de UI.
 *
 * @param {TransacaoTesouraria[]} historicoTransacoes - Lista de transações do servidor.
 * @returns {Object} Filtros ativos, lista filtrada e funções de atualização/limpeza.
 */
export function useAuditoriaComprasFiltros(
  historicoTransacoes: TransacaoTesouraria[],
) {
  const [filtros, setFiltros] = useState<AuditoriaComprasFiltros>(
    FILTROS_AUDITORIA_COMPRAS_VAZIOS,
  );

  const debouncedBusca = useDebounce(filtros.busca, 200);
  const deferredBusca = useDeferredValue(debouncedBusca);

  const comprasFiltradas = useMemo(
    () =>
      filtrarComprasAuditaveis(historicoTransacoes, {
        ...filtros,
        busca: deferredBusca,
      }),
    [historicoTransacoes, filtros, deferredBusca],
  );

  const limparFiltros = useCallback(() => {
    setFiltros(FILTROS_AUDITORIA_COMPRAS_VAZIOS);
  }, []);

  return {
    filtros,
    comprasFiltradas,
    filtrosAtivos: filtrosAuditoriaAtivos(filtros),
    possuiResultados: comprasFiltradas.length > 0,
    setFiltros,
    limparFiltros,
  };
}
