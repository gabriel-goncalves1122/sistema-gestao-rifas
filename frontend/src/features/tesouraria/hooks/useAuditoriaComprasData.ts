import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";

import type { AuditoriaComprasFiltros, TransacaoTesouraria } from "../types/auditoriaCompras";
import {
  agruparComprasAuditaveis,
  calcularResumoAuditoria,
  criarCsvAuditoriaCompras,
  FILTROS_AUDITORIA_COMPRAS_VAZIOS,
  filtrarComprasAuditaveis,
  filtrosAuditoriaAtivos,
} from "../utils/auditoriaComprasUtils";
import { auditoriaComprasService } from "../services/auditoriaComprasService";

const QUERY_STALE_TIME = 180_000;

export function useAuditoriaComprasData() {
  const queryClient = useQueryClient();
  const [filtros, setFiltros] = useState<AuditoriaComprasFiltros>(
    FILTROS_AUDITORIA_COMPRAS_VAZIOS,
  );

  const queryHistorico = useQuery({
    queryKey: ["tesouraria", "auditoria-historico"],
    queryFn: async () => {
      return await auditoriaComprasService.buscarHistoricoDetalhado();
    },
    staleTime: QUERY_STALE_TIME,
    gcTime: 600_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const historicoTransacoes = queryHistorico.data || [];
  const carregando = queryHistorico.isLoading;

  const comprasAgrupadas = useMemo(
    () => agruparComprasAuditaveis(historicoTransacoes),
    [historicoTransacoes],
  );

  const comprasFiltradas = useMemo(
    () => filtrarComprasAuditaveis(comprasAgrupadas, filtros),
    [comprasAgrupadas, filtros],
  );

  const resumo = useMemo(
    () => calcularResumoAuditoria(comprasFiltradas),
    [comprasFiltradas],
  );

  const baixarCSV = useCallback(() => {
    if (comprasFiltradas.length === 0) return;

    const blob = new Blob(
      ["\uFEFF" + criarCsvAuditoriaCompras(comprasFiltradas)],
      { type: "text/csv;charset=utf-8;" },
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Auditoria_Compras_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [comprasFiltradas]);

  const limparFiltros = useCallback(() => {
    setFiltros(FILTROS_AUDITORIA_COMPRAS_VAZIOS);
  }, []);

  const carregarHistorico = async () => {
    await queryClient.invalidateQueries({ queryKey: ["tesouraria", "auditoria-historico"] });
  };

  return {
    carregando,
    filtros,
    setFiltros,
    limparFiltros,
    filtrosAtivos: filtrosAuditoriaAtivos(filtros),
    comprasFiltradas,
    possuiResultados: comprasFiltradas.length > 0,
    resumo,
    baixarCSV,
    carregarHistorico,
    erro: queryHistorico.error,
  };
}
