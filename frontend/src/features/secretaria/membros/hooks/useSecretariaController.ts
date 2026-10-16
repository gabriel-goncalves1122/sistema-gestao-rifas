import { useCallback, useState } from "react";

import { secretariaService } from "../services/secretariaService";
import type {
  AderidoSecretaria,
  FormEditarAderido,
  FormNovoAderido,
} from "@/shared/types/secretaria";
import type { Notificacao } from "../types/secretariaLocalTypes";

/**
 * Controller React (Hook) que gerencia o estado da visualização de membros da secretaria.
 * Orquestra carregamento assíncrono de aderidos, seleção individual para painel de detalhes,
 * seleção em lote (batch), controle de modais e disparos de notificações (feedback toasts).
 *
 * @returns Retorna os estados de listagem, busca, seleção, loading e as funções manipuladoras.
 */
export function useSecretariaController() {
  const [aderidos, setAderidos] = useState<AderidoSecretaria[]>([]);
  const [loading, setLoading] = useState(false);
  const [notificacao, setNotificacao] = useState<Notificacao>({
    open: false,
    mensagem: "",
    severidade: "success",
  });

  // --- Filtros ---
  const [busca, setBusca] = useState("");

  // --- Side panel ---
  const [aderidoSelecionado, setAderidoSelecionado] =
    useState<AderidoSecretaria | null>(null);

  // --- Modal ---
  const [modalAberto, setModalAberto] = useState(false);

  // --- Batch selection ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Batch selection helpers ---
  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    setSelectedIds((prev) =>
      prev.size === ids.length ? new Set() : new Set(ids),
    );
  };

  const limparSelecao = () => setSelectedIds(new Set());

  const mostrarNotificacao = (
    mensagem: string,
    severidade: Notificacao["severidade"] = "success",
  ) => {
    setNotificacao({ open: true, mensagem, severidade });
  };

  const fecharNotificacao = () => {
    setNotificacao((prev) => ({ ...prev, open: false }));
  };

  const carregarAderidos = useCallback(async () => {
    setLoading(true);
    try {
      const dados = await secretariaService.buscarAderidos();
      setAderidos(dados);
      return dados;
    } finally {
      setLoading(false);
    }
  }, []);

  const adicionarAderidoIndividual = async (dados: FormNovoAderido) => {
    try {
      await secretariaService.adicionarAderidoIndividual(dados);
      await carregarAderidos();
      mostrarNotificacao("Aderido autorizado com sucesso!");
    } catch (error: any) {
      mostrarNotificacao(
        error?.message || "Erro ao autorizar aderido",
        "error",
      );
      throw error;
    }
  };

  const atualizarAderidoSecretaria = async (
    id: string,
    dados: FormEditarAderido,
  ) => {
    try {
      await secretariaService.atualizarAderidoSecretaria(id, dados);
      await carregarAderidos();
      mostrarNotificacao("Dados atualizados com sucesso!");
    } catch (error: any) {
      mostrarNotificacao(
        error?.message || "Erro ao atualizar aderido",
        "error",
      );
      throw error;
    }
  };

  return {
    aderidos,
    loading,
    notificacao,
    busca,
    aderidoSelecionado,
    modalAberto,
    selectedIds,

    setBusca,
    setAderidoSelecionado,
    setModalAberto,

    toggleSelectId,
    toggleSelectAll,
    limparSelecao,

    carregarAderidos,
    adicionarAderidoIndividual,
    atualizarAderidoSecretaria,
    mostrarNotificacao,
    fecharNotificacao,
  };
}
