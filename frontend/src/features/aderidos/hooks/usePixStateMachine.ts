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

  // POLLING REALTIME COM FIRESTORE
  useEffect(() => {
    if (status !== "aguardando_pagamento" || !cobrancaPix) return;

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

  // GERAÇÃO
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

  // CANCELAMENTO
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

  const liberarReservaTotal = useCallback(async () => {
    if (cobrancaPix && cobrancaPix.status !== "sucesso") {
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
  }, [cobrancaPix, resetarFluxo, invalidarDadosPainel]);

  const abortarGeracaoPendente = useCallback(() => {
    if (currentGeracaoId.current) {
      pendingAborts.current.add(currentGeracaoId.current);
    }
  }, []);

  const copiarPix = useCallback(() => {
    if (!cobrancaPix?.copiaECola) return false;
    const texto = cobrancaPix.copiaECola;
    if (navigator.clipboard?.writeText) {
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
    return copiou;
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
    liberarReservaTotal,
    abortarGeracaoPendente,
  };
}
