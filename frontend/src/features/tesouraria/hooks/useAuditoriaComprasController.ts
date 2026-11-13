import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { baixarCsv } from "@/shared/utils/arquivosBrowser";
import { TransacaoTesouraria } from "../types/auditoriaCompras";
import {
  calcularContagensAuditoria,
  calcularResumoAuditoria,
} from "../utils/auditoriaComprasMetricasUtils";
import { criarCsvAuditoriaCompras } from "../utils/auditoriaComprasExportUtils";
import { auditoriaComprasService } from "../services/auditoriaComprasService";

import { useAuditoriaComprasFiltros } from "./useAuditoriaComprasFiltros";
import { useAuditoriaComprasAcoes } from "./useAuditoriaComprasAcoes";

interface DadosEdicaoComprador {
  nome: string;
  email?: string | null;
  telefone?: string | null;
}

/**
 * Hook de controlador para a página de Auditoria de Compras da Tesouraria.
 * Orquestra carregamento via cache do React Query, filtros, ações de conciliação
 * manual e diálogos de edição e inspeção.
 */
export function useAuditoriaComprasController() {
  const queryClient = useQueryClient();

  const {
    data: historicoTransacoes = [],
    isLoading: carregando,
  } = useQuery<TransacaoTesouraria[]>({
    queryKey: ["tesouraria", "auditoria-historico"],
    queryFn: async () => {
      try {
        return await auditoriaComprasService.buscarHistoricoDetalhado();
      } catch {
        return [];
      }
    },
    staleTime: 180_000,
    refetchOnMount: false,
  });

  // Modals state
  const [compraSelecionada, setCompraSelecionada] =
    useState<TransacaoTesouraria | null>(null);
  const [compraEdicao, setCompraEdicao] =
    useState<TransacaoTesouraria | null>(null);
  const [compraRecusa, setCompraRecusa] =
    useState<TransacaoTesouraria | null>(null);
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);

  const carregarHistorico = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["tesouraria", "auditoria-historico"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["tesouraria", "relatorio"],
      }),
    ]);
  }, [queryClient]);

  // Hook composition
  const {
    filtros,
    comprasFiltradas,
    filtrosAtivos,
    possuiResultados,
    setFiltros,
    limparFiltros,
  } = useAuditoriaComprasFiltros(historicoTransacoes);

  const {
    salvandoEdicao,
    erroEdicao,
    setErroEdicao,
    reenviandoEmailComprovanteId,
    feedbackEmailComprovante,
    setFeedbackEmailComprovante,
    salvarEdicaoComprador,
    reenviarEmailComprovante,
    processandoAcaoId,
    feedbackAcao,
    setFeedbackAcao,
    aceitarCompraManual,
    negarCompraManual,
  } = useAuditoriaComprasAcoes(carregarHistorico);

  const resumo = useMemo(
    () => calcularResumoAuditoria(comprasFiltradas),
    [comprasFiltradas],
  );

  const contagens = useMemo(
    () => calcularContagensAuditoria(historicoTransacoes),
    [historicoTransacoes],
  );

  const baixarCSV = useCallback(() => {
    if (comprasFiltradas.length === 0) return;

    baixarCsv(
      criarCsvAuditoriaCompras(comprasFiltradas),
      `Auditoria_Compras_${new Date().toISOString().split("T")[0]}.csv`,
    );
  }, [comprasFiltradas]);

  const abrirComprovante = useCallback((compra: TransacaoTesouraria) => {
    if (compra.comprovanteUrl) {
      setComprovanteUrl(compra.comprovanteUrl);
    }
  }, []);

  const abrirEdicao = useCallback(
    (compra: TransacaoTesouraria) => {
      setCompraEdicao(compra);
      setErroEdicao(null);
    },
    [setErroEdicao],
  );

  const fecharEdicao = useCallback(() => {
    if (salvandoEdicao) return;
    setCompraEdicao(null);
    setErroEdicao(null);
  }, [salvandoEdicao, setErroEdicao]);

  const wrapperSalvarEdicaoComprador = useCallback(
    async (dados: DadosEdicaoComprador) => {
      const sucesso = await salvarEdicaoComprador(compraEdicao, dados);
      if (sucesso) {
        setCompraEdicao(null);
      }
      return sucesso;
    },
    [compraEdicao, salvarEdicaoComprador],
  );

  const wrapperNegarCompra = useCallback(
    async (compra: TransacaoTesouraria, motivo: string) => {
      const sucesso = await negarCompraManual(compra, motivo);
      if (sucesso) {
        setCompraRecusa(null);
      }
      return sucesso;
    },
    [negarCompraManual],
  );

  return {
    carregando,
    filtros,
    comprasFiltradas,
    resumo,
    contagens,
    compraSelecionada,
    compraEdicao,
    comprovanteUrl,
    salvandoEdicao,
    erroEdicao,
    reenviandoEmailComprovanteId,
    feedbackEmailComprovante,
    filtrosAtivos,
    possuiResultados,
    setFiltros,
    limparFiltros,
    baixarCSV,
    abrirComprovante,
    fecharComprovante: () => setComprovanteUrl(null),
    abrirDetalhes: setCompraSelecionada,
    fecharDetalhes: () => setCompraSelecionada(null),
    abrirEdicao,
    fecharEdicao,
    salvarEdicaoComprador: wrapperSalvarEdicaoComprador,
    reenviarEmailComprovante,
    fecharFeedbackEmailComprovante: () => setFeedbackEmailComprovante(null),
    carregarHistorico,
    processandoAcaoId,
    feedbackAcao,
    fecharFeedbackAcao: () => setFeedbackAcao(null),
    aceitarCompraManual,
    negarCompraManual: wrapperNegarCompra,
    compraRecusa,
    abrirRecusa: setCompraRecusa,
    fecharRecusa: () => setCompraRecusa(null),
  };
}
