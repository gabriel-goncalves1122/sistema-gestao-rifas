import { useCallback, useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../shared/config/firebase";

import { checkoutPixService } from "../services/checkoutPixService";
import { CheckoutPixCobranca } from "../types/checkoutPix";
import { obterMensagemErroPix } from "../utils/errorsPix";
import { checkoutStorage } from "../utils/checkoutStorage";

export type PixStatus = "idle" | "gerando" | "aguardando_pagamento" | "sucesso" | "erro" | "expirado" | "cancelado";

interface DadosGerarCobrancaPix {
  nome: string;
  telefone: string;
  email: string;
  documento: string;
}

interface UsePixStateMachineParams {
  sessaoCheckoutId: string;
  numerosRifas: string[];
  invalidarDadosPainel: () => Promise<void>;
}

/**
 * Hook controlador da Máquina de Estados Finita (FSM) do Checkout Pix do aderido.
 * Governa todo o ciclo de vida da compra:
 * 1. Estado inicial `idle` (com recuperação de cache local via `checkoutStorage`);
 * 2. Estado `gerando`: envio do payload para a API e prevenção de cliques múltiplos / cancelamento de requisições órfãs;
 * 3. Estado `aguardando_pagamento`: estabelece ouvinte em tempo real (`onSnapshot`) no Firestore para detecção imediata de liquidação pelo banco;
 * 4. Transições automáticas para `sucesso` (aprovado no gateway) ou `cancelado`/`expirado`;
 * 5. Gerencia cópia da chave copia-e-cola com fallbacks e cancelamento explícito com retenção ou liberação de reserva.
 *
 * @param {UsePixStateMachineParams} params - Configurações do checkout.
 * @param {string} params.sessaoCheckoutId - Identificador único da sessão temporária de reserva no cliente.
 * @param {string[]} params.numerosRifas - Lista de números de rifa selecionados no carrinho.
 * @param {() => Promise<void>} params.invalidarDadosPainel - Callback para disparar a revalidação dos bilhetes no React Query / Controller.
 * @returns {Object} Estado reativo e ações disparadoras:
 *   - `status`: Estado atual da máquina ('idle' | 'gerando' | 'aguardando_pagamento' | 'sucesso' | 'erro' | 'expirado' | 'cancelado').
 *   - `cobrancaPix`: Dados normalizados da cobrança com QR Code e expiração.
 *   - `erro`: Mensagem amigável de erro se status for 'erro'.
 *   - `cancelando`: Flag booleana indicando requisição de cancelamento em andamento.
 *   - `gerarCobranca`: Função para disparar a geração da cobrança Pix.
 *   - `cancelarCobranca`: Função para cancelar a cobrança atual (com opção de reter ou liberar bilhetes).
 *   - `copiarPix`: Handler de área de transferência (clipboard com fallback legacy).
 *   - `resetarFluxo`: Restaura o estado da máquina para 'idle'.
 *   - `marcarComoExpiradoLocal`: Atualiza o estado visual local para 'expirado' sem cancelar a ordem no gateway.
 *   - `liberarReservaTotal`: Cancela cobrança e limpa a sessão de checkout por completo.
 *   - `abortarGeracaoPendente`: Sinaliza cancelamento caso uma chamada de rede esteja em voo.
 */
export function usePixStateMachine({
  sessaoCheckoutId,
  numerosRifas,
  invalidarDadosPainel,
}: UsePixStateMachineParams) {
  // Inicialização limpa, pois o modal agora é desmontado.
  const [cobrancaPix, setCobrancaPix] = useState<CheckoutPixCobranca | null>(() => checkoutStorage.get().cobrancaPix);
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
    checkoutStorage.update({ cobrancaPix: null });
    if (limparSessao) {
      checkoutStorage.update({ sessaoCheckoutId: null });
    }
  }, []);

  /**
   * Atualiza o estado visual local para `expirado` quando o cronômetro chega a zero no cliente,
   * sem disparar cancelamento destrutivo no Mercado Pago (prevenindo falhas por relógio local adiantado).
   */
  const marcarComoExpiradoLocal = useCallback(() => {
    setStatus((atual) => (atual === "aguardando_pagamento" ? "expirado" : atual));
    setCobrancaPix((prev) =>
      prev && prev.status === "aguardando_pagamento"
        ? { ...prev, status: "expirado" }
        : prev,
    );
  }, []);

  // POLLING REALTIME COM FIRESTORE
  useEffect(() => {
    if ((status !== "aguardando_pagamento" && status !== "expirado") || !cobrancaPix) return;

    // Conecta-se ao documento em pagamentos_pix em tempo real
    const cobrancaRef = doc(db, "pagamentos_pix", cobrancaPix.id);
    const unsubscribe = onSnapshot(cobrancaRef, (docSnap) => {
      if (!isMounted.current) return;

      if (checkoutStorage.get().cobrancaPix?.id !== cobrancaPix.id) {
        return;
      }

      if (docSnap.exists()) {
        const dados = docSnap.data();
        const statusBanco = String(dados.status_pagamento_banco).toLowerCase();

        let novoStatusLocal = "aguardando_pagamento";
        if (["approved", "authorized", "paid"].includes(statusBanco)) {
          novoStatusLocal = "pago";
        } else if (["rejected", "cancelled", "canceled", "declined", "cancelado", "expired", "expirado"].includes(statusBanco)) {
          novoStatusLocal = "cancelado";
        }

        if (novoStatusLocal === "pago") {
          setStatus("sucesso");
          setCobrancaPix(prev => prev ? { ...prev, status: "pago" } : null);
          invalidarDadosPainel();
        } else if (novoStatusLocal === "cancelado") {
          setStatus("cancelado");
          setCobrancaPix(prev => prev ? { ...prev, status: "cancelado" } : null);
          invalidarDadosPainel();
        }
      }
    }, (error) => {
      console.warn("Erro ao ouvir snapshot do pagamento pix:", error);
    });

    return () => {
      unsubscribe();
    };
  }, [cobrancaPix, status, invalidarDadosPainel]);

  /**
   * Dispara a geração de uma nova cobrança Pix no backend.
   * Atribui requestId único para rastreamento de concorrência e aborta cobranças órfãs
   * caso o componente desmonte ou o usuário cancele a tela antes da resposta.
   *
   * @param {DadosGerarCobrancaPix} dados - Dados cadastrais do pagador.
   */
  const gerarCobranca = useCallback(async (dados: DadosGerarCobrancaPix) => {
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
          // Cancela em background silenciosamente
          await checkoutPixService.cancelarCobrancaPix(cobranca.id, false);
        } catch (e) {
          console.error("Falha ao abortar cobrança orfã:", e);
        }
        return;
      }

      setCobrancaPix(cobranca);
      setStatus("aguardando_pagamento");
    } catch (error) {
      if (!isMounted.current) return;
      setErro(obterMensagemErroPix(error));
      setStatus("erro");
    }
  }, [numerosRifas, sessaoCheckoutId]);

  /**
   * Solicita o cancelamento da cobrança Pix ativa.
   * Trata concorrência e caso o pagamento já tenha sido aprovado enquanto o usuário clicava em cancelar.
   *
   * @param {boolean} [reterReserva=false] - Se `true`, mantém os bilhetes reservados no carrinho.
   */
  const cancelarCobranca = useCallback(async (reterReserva: boolean = false) => {
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

      const isJaAprovado = error?.message?.includes("PAGAMENTO_JA_APROVADO") || error?.message?.includes("STATUS_INVALIDO_CANCELAMENTO") || error?.message?.includes("approved");

      if (isJaAprovado) {
        setStatus("sucesso");
        setCobrancaPix(prev => prev ? { ...prev, status: "pago" } : null);
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
  }, [cobrancaPix, resetarFluxo, invalidarDadosPainel]);

  /**
   * Libera totalmente a reserva dos bilhetes e encerra a sessão de checkout Pix,
   * protegendo cobranças que já foram pagas para jamais disparar cancelamento indevido.
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
   * Registra a solicitação de cancelamento da requisição assíncrona em voo caso o modal seja fechado.
   */
  const abortarGeracaoPendente = useCallback(() => {
    if (currentGeracaoId.current) {
      pendingAborts.current.add(currentGeracaoId.current);
    }
  }, []);

  /**
   * Copia a chave Pix Copia e Cola para a área de transferência do sistema operacional.
   * Utiliza `navigator.clipboard` moderno com fallback para `document.execCommand('copy')`.
   *
   * @returns {boolean} `true` se a cópia foi iniciada/realizada com sucesso.
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
    gerarCobranca,
    cancelarCobranca,
    copiarPix,
    resetarFluxo,
    marcarComoExpiradoLocal,
    liberarReservaTotal,
    abortarGeracaoPendente,
  };
}
