import { useCallback, useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../shared/config/firebase";

import { checkoutPixService } from "../services/checkoutPixService";
import { storageService } from "@/shared/services/storageService";
import { CheckoutPixCobranca } from "../types/checkoutPix";
import { obterMensagemErroPix } from "../utils/errorsPix";
import { checkoutStorage } from "../utils/checkoutStorage";

export type PixStatus =
  | "idle"
  | "gerando"
  | "aguardando_pagamento"
  | "enviando_comprovante"
  | "sucesso"
  | "erro"
  | "expirado"
  | "cancelado";

interface DadosGerarCobrancaPix {
  nome: string;
  telefone: string;
  email?: string;
  documento?: string;
}

interface UsePixStateMachineParams {
  sessaoCheckoutId: string;
  numerosRifas: string[];
  invalidarDadosPainel: () => Promise<void>;
}

/**
 * Hook controlador da Máquina de Estados Finita (FSM) do Checkout Pix do aderido.
 * Governa todo o ciclo de vida da compra com suporte a Gateway Automático e Pix Offline com Comprovante.
 */
export function usePixStateMachine({
  sessaoCheckoutId,
  numerosRifas,
  invalidarDadosPainel,
}: UsePixStateMachineParams) {
  const [cobrancaPix, setCobrancaPix] = useState<CheckoutPixCobranca | null>(
    () => checkoutStorage.get().cobrancaPix,
  );
  const [status, setStatus] = useState<PixStatus>(() => {
    const saved = checkoutStorage.get().cobrancaPix;
    if (!saved) return "idle";
    if (saved.status === "pago") return "sucesso";
    if (saved.status === "expirado") return "expirado";
    if (saved.status === "cancelado") return "cancelado";
    return "aguardando_pagamento";
  });

  const [erro, setErro] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [enviandoComprovante, setEnviandoComprovante] = useState(false);
  const isMounted = useRef(true);
  const currentGeracaoId = useRef<string | null>(null);
  const pendingAborts = useRef<Set<string>>(new Set());

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    checkoutStorage.update({ cobrancaPix });
  }, [cobrancaPix]);

  /**
   * Reseta o estado local da máquina de estados Pix de volta para `idle`.
   *
   * @param {boolean} [limparSessao=false] - Se `true`, limpa também o ID da sessão de checkout no storage local.
   */
  const resetarFluxo = useCallback((limparSessao: boolean = false) => {
    setCobrancaPix(null);
    setErro(null);
    setStatus("idle");
    setCancelando(false);
    setEnviandoComprovante(false);
    checkoutStorage.update({ cobrancaPix: null });
    if (limparSessao) {
      checkoutStorage.update({ sessaoCheckoutId: null });
    }
  }, []);

  /**
   * Marca o Pix como expirado localmente na interface sem cancelar no backend.
   */
  const marcarComoExpiradoLocal = useCallback(() => {
    setStatus("expirado");
    setCobrancaPix((prev) => (prev ? { ...prev, status: "expirado" } : null));
  }, []);

  /**
   * Listener em tempo real do Firestore para detectar liquidação da ordem Pix.
   */
  useEffect(() => {
    if (!cobrancaPix?.id || status !== "aguardando_pagamento") return;

    const pagamentoRef = doc(db, "pagamentos_pix", cobrancaPix.id);

    const unsubscribe = onSnapshot(
      pagamentoRef,
      (docSnap) => {
        if (!isMounted.current) return;

        if (checkoutStorage.get().cobrancaPix?.id !== cobrancaPix.id) {
          return;
        }

        if (docSnap.exists()) {
          const dados = docSnap.data();
          const statusBanco = String(dados.status_pagamento_banco).toLowerCase();

          let novoStatusLocal = "aguardando_pagamento";
          if (["approved", "authorized", "paid", "in_analysis", "pendente"].includes(statusBanco)) {
            novoStatusLocal = "pago";
          } else if (
            [
              "rejected",
              "cancelled",
              "canceled",
              "declined",
              "cancelado",
              "expired",
              "expirado",
            ].includes(statusBanco)
          ) {
            novoStatusLocal = "cancelado";
          }

          if (novoStatusLocal === "pago") {
            setStatus("sucesso");
            setCobrancaPix((prev) => (prev ? { ...prev, status: "pago" } : null));
            invalidarDadosPainel();
          } else if (novoStatusLocal === "cancelado") {
            setStatus("cancelado");
            setCobrancaPix((prev) => (prev ? { ...prev, status: "cancelado" } : null));
            invalidarDadosPainel();
          }
        }
      },
      (error) => {
        console.warn("Erro ao ouvir snapshot do pagamento pix:", error);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [cobrancaPix, status, invalidarDadosPainel]);

  /**
   * Dispara a geração de uma nova cobrança Pix no backend.
   *
   * @param {DadosGerarCobrancaPix} dados - Dados cadastrais do pagador.
   */
  const gerarCobranca = useCallback(
    async (dados: DadosGerarCobrancaPix) => {
      if (numerosRifas.length === 0) {
        setErro("Nenhuma rifa selecionada para pagamento.");
        return;
      }

      setStatus("gerando");
      setErro(null);

      const requestId = Date.now().toString();
      currentGeracaoId.current = requestId;

      try {
        const cobranca = await checkoutPixService.criarCobrancaPix({
          nome: dados.nome,
          telefone: dados.telefone,
          email: dados.email,
          documento: dados.documento,
          numerosRifas,
          sessaoCheckoutId,
        });

        // Se o componente desmontou enquanto gerava, ou o usuário fechou o modal
        if (!isMounted.current || pendingAborts.current.has(requestId)) {
          pendingAborts.current.delete(requestId);
          try {
            await checkoutPixService.cancelarCobrancaPix(cobranca.id, false);
          } catch (e) {
            console.error("Falha ao abortar cobrança órfã:", e);
          }
          return;
        }

        setCobrancaPix(cobranca);
        setStatus("aguardando_pagamento");
        invalidarDadosPainel?.();
      } catch (error: any) {
        if (!isMounted.current) return;
        setErro(obterMensagemErroPix(error));
        setStatus("erro");
      }
    },
    [numerosRifas, sessaoCheckoutId, invalidarDadosPainel],
  );

  /**
   * Confirma o envio de comprovante bancário ou declaração de pagamento,
   * fazendo upload seguro e garantindo transição das rifas para status 'pendente' em análise.
   */
  const confirmarEnvioComprovante = useCallback(
    async (
      arquivoComprovante?: File | null,
      hashComprovante?: string | null,
      mimeType?: string,
    ) => {
      if (!cobrancaPix) return;

      setEnviandoComprovante(true);
      setErro(null);

      try {
        let comprovanteUrl: string | null = null;

        if (arquivoComprovante) {
          comprovanteUrl = await storageService.uploadComprovante(
            arquivoComprovante,
            mimeType,
          );
        }

        await checkoutPixService.confirmarEnvioPix(
          cobrancaPix.id,
          comprovanteUrl,
          hashComprovante,
        );

        if (isMounted.current) {
          setStatus("sucesso");
          setCobrancaPix((prev) => (prev ? { ...prev, status: "pago" } : null));
        }

        await invalidarDadosPainel?.();
      } catch (error: any) {
        if (isMounted.current) {
          setErro(error?.message || "Falha ao enviar comprovante. Tente novamente.");
        }
      } finally {
        if (isMounted.current) {
          setEnviandoComprovante(false);
        }
      }
    },
    [cobrancaPix, invalidarDadosPainel],
  );

  /**
   * Solicita o cancelamento da cobrança Pix ativa.
   *
   * @param {boolean} [reterReserva=false] - Se `true`, mantém os bilhetes reservados no carrinho.
   */
  const cancelarCobranca = useCallback(
    async (reterReserva: boolean = false) => {
      if (!cobrancaPix) return;

      setCancelando(true);
      try {
        await checkoutPixService.cancelarCobrancaPix(cobrancaPix.id, reterReserva);
        if (isMounted.current) {
          resetarFluxo(true);
        }
        invalidarDadosPainel?.();
      } catch (error: any) {
        if (!isMounted.current) return;

        const isJaAprovado =
          error?.message?.includes("PAGAMENTO_JA_APROVADO") ||
          error?.message?.includes("STATUS_INVALIDO_CANCELAMENTO") ||
          error?.message?.includes("approved");

        if (isJaAprovado) {
          setStatus("sucesso");
          setCobrancaPix((prev) => (prev ? { ...prev, status: "pago" } : null));
          invalidarDadosPainel?.();
          return;
        }

        setErro(obterMensagemErroPix(error));
        setTimeout(() => {
          if (isMounted.current) setErro(null);
        }, 5000);
      } finally {
        if (isMounted.current) setCancelando(false);
      }
    },
    [cobrancaPix, resetarFluxo, invalidarDadosPainel],
  );

  /**
   * Libera totalmente a reserva dos bilhetes e encerra a sessão de checkout Pix.
   */
  const liberarReservaTotal = useCallback(async () => {
    if (cobrancaPix && cobrancaPix.status !== "pago" && status !== "sucesso") {
      const idParaCancelar = cobrancaPix.id;
      resetarFluxo(true);
      try {
        await checkoutPixService.cancelarCobrancaPix(idParaCancelar, false);
      } catch (error) {
        console.error("Erro ao liberar reserva completa:", error);
      }
    } else {
      resetarFluxo(true);
    }
    invalidarDadosPainel?.();
  }, [cobrancaPix, status, resetarFluxo, invalidarDadosPainel]);

  /**
   * Registra a solicitação de cancelamento da requisição em voo se o modal fechar.
   */
  const abortarGeracaoPendente = useCallback(() => {
    if (currentGeracaoId.current) {
      pendingAborts.current.add(currentGeracaoId.current);
    }
  }, []);

  /**
   * Copia a chave Pix Copia e Cola para a área de transferência.
   */
  const copiarPix = useCallback((): boolean => {
    if (!cobrancaPix?.copiaECola) return false;
    const texto = cobrancaPix.copiaECola;
    let copiouViaClipboardApi = false;
    if (navigator.clipboard?.writeText) {
      copiouViaClipboardApi = true;
      navigator.clipboard.writeText(texto).catch(() => {});
    }
    const span = document.createElement("span");
    span.textContent = texto;
    span.style.whiteSpace = "pre";
    span.style.webkitUserSelect = "auto";
    span.style.userSelect = "all";
    span.style.position = "absolute";
    span.style.left = "-9999px";
    document.body.appendChild(span);
    const selection = window.getSelection();
    const range = document.createRange();
    let copiou = false;
    if (selection) {
      selection.removeAllRanges();
      range.selectNode(span);
      selection.addRange(range);
      try {
        copiou = document.execCommand("copy");
      } catch (err) {
        console.warn("Falha no execCommand", err);
      } finally {
        selection.removeAllRanges();
      }
    }
    document.body.removeChild(span);
    return copiou || copiouViaClipboardApi;
  }, [cobrancaPix]);

  return {
    status,
    cobrancaPix,
    erro,
    cancelando,
    enviandoComprovante,
    gerarCobranca,
    confirmarEnvioComprovante,
    cancelarCobranca,
    copiarPix,
    resetarFluxo,
    marcarComoExpiradoLocal,
    liberarReservaTotal,
    abortarGeracaoPendente,
  };
}
