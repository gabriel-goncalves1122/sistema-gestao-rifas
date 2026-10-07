import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { auditoriaComprasService } from "../services/auditoriaComprasService";
import { sanitizarDadosCliente } from "@/shared/utils/sanitizadores";
import type { TransacaoTesouraria } from "../types/auditoriaCompras";
import { normalizarTexto } from "../utils/auditoriaComprasUtils";

export interface DadosEdicaoComprador {
  nome: string;
  email?: string | null;
  telefone?: string | null;
}

export function useAuditoriaComprasMutations(
  compraEdicao: TransacaoTesouraria | null,
  compraNotificacao: TransacaoTesouraria | null,
  setCompraEdicao: (c: TransacaoTesouraria | null) => void,
  setCompraNotificacao: (c: TransacaoTesouraria | null) => void,
) {
  const queryClient = useQueryClient();

  const [erroEdicao, setErroEdicao] = useState<string | null>(null);
  
  const [feedbackNotificacao, setFeedbackNotificacao] = useState<{
    tipo: "success" | "error";
    mensagem: string;
  } | null>(null);

  const [reenviandoEmailComprovanteId, setReenviandoEmailComprovanteId] = useState<string | null>(null);
  const [feedbackEmailComprovante, setFeedbackEmailComprovante] = useState<{
    tipo: "success" | "error";
    mensagem: string;
  } | null>(null);

  const mutationSalvarEdicao = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: any }) => {
      return auditoriaComprasService.atualizarComprador(id, dados);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tesouraria", "auditoria-historico"] });
      queryClient.invalidateQueries({ queryKey: ["tesouraria", "pix"] });
    }
  });

  const mutationNotificar = useMutation({
    mutationFn: async ({ id, mensagem }: { id: string; mensagem: string }) => {
      return auditoriaComprasService.notificarCorrecao(id, mensagem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tesouraria", "auditoria-historico"] });
    }
  });

  const salvarEdicaoComprador = useCallback(
    async (dados: DadosEdicaoComprador) => {
      if (!compraEdicao?.compradorId) {
        setErroEdicao("Compra sem compradorId não pode ser editada.");
        return false;
      }
      setErroEdicao(null);
      try {
        const dadosSanitizados = sanitizarDadosCliente({
          nome: dados.nome,
          email: dados.email || "",
          telefone: dados.telefone || "",
        });
        await mutationSalvarEdicao.mutateAsync({
          id: compraEdicao.compradorId,
          dados: dadosSanitizados
        });
        setCompraEdicao(null);
        return true;
      } catch (error: any) {
        setErroEdicao(error?.message || "Erro ao salvar dados do comprador.");
        return false;
      }
    },
    [compraEdicao, mutationSalvarEdicao, setCompraEdicao],
  );

  const enviarNotificacao = useCallback(
    async (mensagem: string) => {
      if (!compraNotificacao?.compradorId) return false;
      setFeedbackNotificacao(null);
      try {
        const resposta = await mutationNotificar.mutateAsync({
          id: compraNotificacao.compradorId,
          mensagem
        });
        setFeedbackNotificacao({
          tipo: "success",
          mensagem: resposta?.mensagem || "Notificação enviada com sucesso.",
        });
        setCompraNotificacao(null);
        return true;
      } catch (error: any) {
        setFeedbackNotificacao({
          tipo: "error",
          mensagem: error?.message || "Erro ao notificar o vendedor.",
        });
        return false;
      }
    },
    [compraNotificacao, mutationNotificar, setCompraNotificacao]
  );

  const reenviarEmailComprovante = useCallback(async (compra: TransacaoTesouraria) => {
    if (!compra.compradorId) {
      setFeedbackEmailComprovante({
        tipo: "error",
        mensagem: "Compra sem compradorId não permite reenvio.",
      });
      return false;
    }
    if (normalizarTexto(compra.status) !== "pago") {
      setFeedbackEmailComprovante({
        tipo: "error",
        mensagem: "O reenvio está disponível apenas para compras pagas.",
      });
      return false;
    }
    if (!compra.compradorEmail.trim()) {
      setFeedbackEmailComprovante({
        tipo: "error",
        mensagem: "A compra não possui e-mail do comprador.",
      });
      return false;
    }

    setReenviandoEmailComprovanteId(compra.compradorId);
    setFeedbackEmailComprovante(null);
    try {
      const resposta = await auditoriaComprasService.reenviarEmailComprovante(compra.compradorId);
      setFeedbackEmailComprovante({
        tipo: "success",
        mensagem: resposta?.mensagem || "E-mail de comprovante reenviado.",
      });
      return true;
    } catch (error: any) {
      setFeedbackEmailComprovante({
        tipo: "error",
        mensagem: error?.message || "Erro ao reenviar e-mail de comprovante.",
      });
      return false;
    } finally {
      setReenviandoEmailComprovanteId(null);
    }
  }, []);

  const clearErroEdicao = () => setErroEdicao(null);
  const fecharFeedbackNotificacao = () => setFeedbackNotificacao(null);
  const fecharFeedbackEmailComprovante = () => setFeedbackEmailComprovante(null);

  return {
    salvandoEdicao: mutationSalvarEdicao.isPending,
    erroEdicao,
    clearErroEdicao,
    salvarEdicaoComprador,

    notificandoCorrecao: mutationNotificar.isPending,
    feedbackNotificacao,
    fecharFeedbackNotificacao,
    enviarNotificacao,

    reenviandoEmailComprovanteId,
    feedbackEmailComprovante,
    fecharFeedbackEmailComprovante,
    reenviarEmailComprovante,
  };
}
