// ============================================================================
// HOOK: usePainelAderidoController
//
// Hook principal da feature Aderidos. Orquestra:
//
// 1. Dados remotos (rifas, notificacoes) via useRifasData
// 2. Selecao de rifas para venda via useRifasSelection
// 3. Controle de modais e drawers via useModalStack
// 4. Fluxo pos-checkout via useCheckoutFlow
// 5. Exportação de relatório de vendas individual em PDF
//
// Componentes de UI consomem este hook e nao acessam dados diretamente.
// ============================================================================
import { useCallback, useMemo, useState } from "react";

import { extrairMensagemErro } from "@/shared/utils/errors";
import {
  DadosCorrecaoRecusa,
  FiltroRifasAderido,
  VisaoPainelAderido,
} from "../types/painelAderido";

import { aderidoRifaService } from "../services/aderidoRifaService";
import { agruparRifasRecusadas } from "../utils/agruparRifasRecusadas";
import {
  calcularValorArrecadado,
  contarNotificacoesNaoLidas,
  filtrarRifasPorStatus,
} from "../utils/calcularResumoRifas";
import { calcularContadoresRifas } from "../utils/filtrosRifas";
import { gerarPdfRelatorioAderido } from "../utils/gerarPdfRelatorioAderido";
import { obterPrimeiroNomeAderido } from "../utils/obterPrimeiroNomeAderido";
import { useCheckoutFlow } from "./useCheckoutFlow";
import { useModalStack } from "./useModalStack";
import { useRifasData } from "./useRifasData";
import { useRifasSelection } from "./useRifasSelection";

function rolarParaInicioDoPainel() {
  if (typeof window === "undefined") return;

  const executarScroll = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // JSDOM não implementa scrollTo; no navegador, isso mantém o fluxo no topo.
    }
  };

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(executarScroll);
    return;
  }

  executarScroll();
}

/**
 * Hook controlador principal da visão de Aderidos.
 * Gerencia ciclo de vida, filtros, seleção, dados remotos e exportação de PDF.
 */
export function usePainelAderidoController() {
  const [visaoAtual, setVisaoAtual] = useState<VisaoPainelAderido>("geral");
  const [filtro, setFiltro] = useState<FiltroRifasAderido>("todas");
  const [exportandoRelatorio, setExportandoRelatorio] = useState(false);
  const [feedbackRelatorio, setFeedbackRelatorio] = useState<{
    open: boolean;
    mensagem: string;
    tipo: "success" | "error";
  }>({
    open: false,
    mensagem: "",
    tipo: "success",
  });

  const dadosPainel = useRifasData();
  const selecao = useRifasSelection(dadosPainel.minhasRifas);
  const modais = useModalStack();
  const fecharCheckout = useCallback(() => {
    modais.setModalCheckoutAberto(false);
  }, [modais.setModalCheckoutAberto]);

  const { finalizarVendaComSucesso } = useCheckoutFlow({
    fecharCheckout,
    limparSelecao: selecao.limparSelecao,
    invalidarDadosPainel: dadosPainel.invalidarDadosPainel,
  });

  // ------------------------------------------------------------------
  // Computacoes derivadas dos dados brutos
  // ------------------------------------------------------------------

  const rifasFiltradas = useMemo(
    () => filtrarRifasPorStatus(dadosPainel.minhasRifas, filtro),
    [dadosPainel.minhasRifas, filtro],
  );

  const gruposRecusados = useMemo(
    () => agruparRifasRecusadas(dadosPainel.minhasRifas),
    [dadosPainel.minhasRifas],
  );

  const valorArrecadado = useMemo(
    () => calcularValorArrecadado(dadosPainel.minhasRifas),
    [dadosPainel.minhasRifas],
  );

  const contadoresRifas = useMemo(
    () => calcularContadoresRifas(dadosPainel.minhasRifas),
    [dadosPainel.minhasRifas],
  );

  const notificacoesNaoLidas = useMemo(
    () => contarNotificacoesNaoLidas(dadosPainel.notificacoes),
    [dadosPainel.notificacoes],
  );

  // ------------------------------------------------------------------
  // Nome de exibicao do aderido
  //
  // Prioridade: nome > displayName > parte local do email.
  // Usa apenas dados do usuario logado (nunca vendedor_email de terceiros).
  // ------------------------------------------------------------------
  const primeiroNome = useMemo(() => {
    const usuarioComNome = dadosPainel.usuarioAtual as
      | {
          nome?: string | null;
          displayName?: string | null;
          email?: string | null;
        }
      | null
      | undefined;

    return obterPrimeiroNomeAderido({
      nome: usuarioComNome?.nome || usuarioComNome?.displayName,
      displayName: usuarioComNome?.displayName,
      email: usuarioComNome?.email,
    });
  }, [dadosPainel.usuarioAtual]);

  const abrirSidebarNotificacoes = useCallback(async () => {
    modais.setDrawerNotificacoesAberto(true);

    const naoLidas = dadosPainel.notificacoes
      .filter((notificacao) => !notificacao.lida)
      .map((notificacao) => notificacao.id);

    await dadosPainel.marcarNotificacoesLidasOtimista(naoLidas);
  }, [
    dadosPainel.marcarNotificacoesLidasOtimista,
    dadosPainel.notificacoes,
    modais.setDrawerNotificacoesAberto,
  ]);

  const abrirRecusadas = useCallback(() => {
    selecao.limparSelecao();
    setVisaoAtual("recusadas");
    rolarParaInicioDoPainel();
  }, [selecao.limparSelecao]);

  const voltarParaRifas = useCallback(() => {
    setVisaoAtual("geral");
    rolarParaInicioDoPainel();
  }, []);

  const corrigirDadosRecusados = useCallback(
    async (numeros: string[], dadosAtualizados: DadosCorrecaoRecusa) => {
      const sucesso = await dadosPainel.corrigirDadosRecusados(
        numeros,
        dadosAtualizados,
      );

      if (!sucesso) return false;

      await dadosPainel.invalidarDadosPainel();

      setVisaoAtual("geral");
      modais.setModalCorrecaoAberto(false);
      modais.setGrupoParaCorrigir(null);

      return true;
    },
    [
      dadosPainel.corrigirDadosRecusados,
      dadosPainel.invalidarDadosPainel,
      modais.setGrupoParaCorrigir,
      modais.setModalCorrecaoAberto,
    ],
  );

  const exportarRelatorioVendas = useCallback(async () => {
    if (exportandoRelatorio) return;

    setExportandoRelatorio(true);
    try {
      const relatorio = await aderidoRifaService.obterMeuRelatorioVendas();
      gerarPdfRelatorioAderido(relatorio);
      setFeedbackRelatorio({
        open: true,
        mensagem: "Relatório de vendas exportado com sucesso!",
        tipo: "success",
      });
    } catch (error: unknown) {
      console.error(
        "[usePainelAderidoController] Erro ao exportar relatório:",
        error,
      );
      setFeedbackRelatorio({
        open: true,
        mensagem: extrairMensagemErro(
          error,
          "Não foi possível exportar o relatório de vendas. Tente novamente.",
        ),
        tipo: "error",
      });
    } finally {
      setExportandoRelatorio(false);
    }
  }, [exportandoRelatorio]);

  const fecharFeedbackRelatorio = useCallback(() => {
    setFeedbackRelatorio((prev) => ({ ...prev, open: false }));
  }, []);

  const desistirVendaRecusada = useCallback(
    async (numeros: string[]) => {
      const sucesso = await dadosPainel.desistirVendaRecusada(numeros);
      if (!sucesso) return false;

      await dadosPainel.invalidarDadosPainel();
      setVisaoAtual("geral");
      return true;
    },
    [dadosPainel.desistirVendaRecusada, dadosPainel.invalidarDadosPainel],
  );

  return {
    carregando: dadosPainel.carregando,
    visaoAtual,
    filtro,
    selecionadas: selecao.selecionadas,
    possuiSelecao: selecao.possuiSelecao,
    valorTotalSelecionado: selecao.valorTotalSelecionado,

    minhasRifas: dadosPainel.minhasRifas,
    rifasFiltradas,
    gruposRecusados,
    notificacoes: dadosPainel.notificacoes,

    primeiroNome,
    valorArrecadado,
    contadoresRifas,
    notificacoesNaoLidas,

    modalCheckoutAberto: modais.modalCheckoutAberto,
    drawerNotificacoesAberto: modais.drawerNotificacoesAberto,
    modalCorrecaoAberto: modais.modalCorrecaoAberto,
    grupoParaCorrigir: modais.grupoParaCorrigir,
    rifaParaDetalhes: modais.rifaParaDetalhes,

    exportandoRelatorio,
    feedbackRelatorio,

    setFiltro,
    setVisaoAtual,
    setModalCheckoutAberto: modais.setModalCheckoutAberto,
    setDrawerNotificacoesAberto: modais.setDrawerNotificacoesAberto,
    setModalCorrecaoAberto: modais.setModalCorrecaoAberto,
    setGrupoParaCorrigir: modais.setGrupoParaCorrigir,
    setRifaParaDetalhes: modais.setRifaParaDetalhes,

    abrirSidebarNotificacoes,
    abrirRecusadas,
    voltarParaRifas,
    alternarSelecaoRifa: selecao.alternarSelecaoRifa,
    finalizarVendaComSucesso,
    corrigirDadosRecusados,
    desistirVendaRecusada,
    exportarRelatorioVendas,
    fecharFeedbackRelatorio,
    invalidarDadosPainel: dadosPainel.invalidarDadosPainel,
    invalidarRifas: dadosPainel.invalidarRifas,
    invalidarNotificacoes: dadosPainel.invalidarNotificacoes,
    limparSelecao: selecao.limparSelecao,
  };
}
