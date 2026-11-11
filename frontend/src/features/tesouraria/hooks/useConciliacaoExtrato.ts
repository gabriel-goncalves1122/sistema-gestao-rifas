/**
 * Hook controlador para orquestrar o fluxo de conciliação por extrato bancário.
 *
 * @module useConciliacaoExtrato
 */
import { useCallback, useMemo, useState } from "react";

import { extrairMensagemErro } from "@/shared/utils/errors";
import { conciliacaoExtratoService } from "../services/conciliacaoExtratoService";
import {
  ItemAprovacaoLotePayload,
  ItemMatchConciliacao,
  ResultadoAnaliseExtrato,
} from "../types/conciliacaoExtrato";

export function useConciliacaoExtrato(onSucessoAprovacao?: () => Promise<void> | void) {
  const [aberto, setAberto] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [aprovando, setAprovando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAnaliseExtrato | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);

  const abrirDialog = useCallback(() => {
    setAberto(true);
    setErro(null);
  }, []);

  const fecharDialog = useCallback(() => {
    if (analisando || aprovando) return;
    setAberto(false);
  }, [analisando, aprovando]);

  const limparEstado = useCallback(() => {
    setArquivo(null);
    setResultado(null);
    setSelecionados(new Set());
    setErro(null);
  }, []);

  const processarArquivo = useCallback(async (file: File) => {
    setArquivo(file);
    setAnalisando(true);
    setErro(null);
    setResultado(null);

    try {
      const conteudo = await file.text();
      if (!conteudo || conteudo.trim().length < 10) {
        throw new Error("O arquivo selecionado está vazio ou ilegível.");
      }

      const resposta = await conciliacaoExtratoService.analisarExtrato(
        conteudo,
        file.name,
      );

      setResultado(resposta);

      // Pré-seleciona automaticamente todos os matches 100% exatos
      const preSelecionados = new Set<string>();
      resposta.matches.forEach((m) => {
        if (m.confianca === 1.0) {
          preSelecionados.add(m.pagamentoId);
        }
      });
      setSelecionados(preSelecionados);
    } catch (err: unknown) {
      setErro(
        extrairMensagemErro(
          err,
          "Falha ao processar o arquivo de extrato bancário.",
        ),
      );
    } finally {
      setAnalisando(false);
    }
  }, []);

  const toggleSelecao = useCallback((pagamentoId: string) => {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(pagamentoId)) {
        novo.delete(pagamentoId);
      } else {
        novo.add(pagamentoId);
      }
      return novo;
    });
  }, []);

  const toggleTodos = useCallback(() => {
    if (!resultado) return;
    setSelecionados((prev) => {
      if (prev.size === resultado.matches.length) {
        return new Set();
      }
      return new Set(resultado.matches.map((m) => m.pagamentoId));
    });
  }, [resultado]);

  const itensParaAprovar = useMemo<ItemAprovacaoLotePayload[]>(() => {
    if (!resultado) return [];
    return resultado.matches
      .filter((m) => selecionados.has(m.pagamentoId))
      .map((m: ItemMatchConciliacao) => ({
        pagamentoId: m.pagamentoId,
        tipoMatch: m.tipoMatch,
        alvoMatch: m.alvoMatch,
        txidBanco: m.txidBanco,
        endToEndIdBanco: m.endToEndIdBanco,
        nomePagadorBanco: m.nomePagadorBanco,
        valorBanco: m.valorBanco,
        dataBanco: m.dataBanco,
      }));
  }, [resultado, selecionados]);

  const valorTotalSelecionado = useMemo(() => {
    return itensParaAprovar.reduce((acc, item) => acc + item.valorBanco, 0);
  }, [itensParaAprovar]);

  const confirmarAprovacaoLote = useCallback(async () => {
    if (itensParaAprovar.length === 0) {
      setErro("Selecione pelo menos um match para aprovar.");
      return false;
    }

    setAprovando(true);
    setErro(null);

    try {
      const resposta = await conciliacaoExtratoService.aprovarLote(
        itensParaAprovar,
      );

      setFeedbackSucesso(resposta.mensagem);
      limparEstado();
      setAberto(false);

      if (onSucessoAprovacao) {
        await onSucessoAprovacao();
      }

      return true;
    } catch (err: unknown) {
      setErro(extrairMensagemErro(err, "Erro ao aprovar lote de conciliação."));
      return false;
    } finally {
      setAprovando(false);
    }
  }, [itensParaAprovar, limparEstado, onSucessoAprovacao]);

  return {
    aberto,
    arquivo,
    analisando,
    aprovando,
    resultado,
    selecionados,
    itensParaAprovar,
    valorTotalSelecionado,
    erro,
    feedbackSucesso,
    abrirDialog,
    fecharDialog,
    limparEstado,
    processarArquivo,
    toggleSelecao,
    toggleTodos,
    confirmarAprovacaoLote,
    fecharFeedbackSucesso: () => setFeedbackSucesso(null),
  };
}
