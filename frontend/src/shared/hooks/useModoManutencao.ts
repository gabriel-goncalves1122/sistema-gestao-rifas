import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { sistemaService } from "../services/sistemaService";
import {
  AtualizarManutencaoPayload,
  ManutencaoStatusDto,
} from "../types/sistema";
import { UsuarioFormatura } from "@/features/auth/hooks/useAuthController";

export interface UseModoManutencaoReturn {
  emManutencao: boolean;
  statusManutencao: ManutencaoStatusDto | null;
  carregandoManutencao: boolean;
  isAdminBypass: boolean;
  salvandoManutencao: boolean;
  recarregarStatus: () => Promise<void>;
  atualizarManutencao: (
    payload: AtualizarManutencaoPayload,
  ) => Promise<ManutencaoStatusDto>;
}

/**
 * Hook central para governança do Modo de Manutenção no Frontend.
 * Combina consulta pública via API (para usuários anônimos / tela de login)
 * com listener em tempo real no Firestore (para usuários autenticados).
 *
 * @param {UsuarioFormatura | null} [usuarioAtual] - Usuário logado na sessão atual.
 * @returns {UseModoManutencaoReturn} Estado do modo de manutenção, flags e métodos de mutação.
 */
export function useModoManutencao(
  usuarioAtual?: UsuarioFormatura | null,
): UseModoManutencaoReturn {
  const [statusManutencao, setStatusManutencao] =
    useState<ManutencaoStatusDto | null>(null);
  const [carregandoManutencao, setCarregandoManutencao] = useState(true);
  const [salvandoManutencao, setSalvandoManutencao] = useState(false);

  // Determina se o usuário logado possui privilégio de ignorar o bloqueio de tela
  const cargo = usuarioAtual?.cargo;
  const isAdminBypass = Boolean(
    usuarioAtual && (cargo === "admin" || cargo === "presidencia"),
  );

  /**
   * Recarrega o status a partir da API pública.
   */
  const recarregarStatus = useCallback(async () => {
    try {
      const dados = await sistemaService.obterStatusManutencao();
      setStatusManutencao(dados);
    } catch (erro) {
      if (import.meta.env.DEV) {
        console.warn("Aviso ao carregar status de manutenção:", erro);
      }
    } finally {
      setCarregandoManutencao(false);
    }
  }, []);

  // 1. Carga inicial via API pública (funciona tanto logado quanto deslogado)
  useEffect(() => {
    let ativo = true;

    sistemaService
      .obterStatusManutencao()
      .then((dados) => {
        if (ativo) {
          setStatusManutencao(dados);
          setCarregandoManutencao(false);
        }
      })
      .catch((erro) => {
        if (ativo) {
          if (import.meta.env.DEV) {
            console.warn("Falha ao consultar status de manutenção inicial:", erro);
          }
          setCarregandoManutencao(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  // 2. Se o usuário estiver autenticado, ativa listener onSnapshot no Firestore
  // para reação em tempo real caso a manutenção seja ligada/desligada por outro admin
  useEffect(() => {
    if (!usuarioAtual) {
      return;
    }

    const docRef = doc(db, "configuracoes", "manutencao");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const dados = snapshot.data();
          let atualizadoEmIso: string | null = null;
          if (dados.atualizado_em?.toDate) {
            atualizadoEmIso = dados.atualizado_em.toDate().toISOString();
          }

          setStatusManutencao({
            emManutencao: Boolean(dados.em_manutencao),
            mensagem:
              dados.mensagem ||
              "Estamos realizando uma manutenção programada para melhorias no sistema. Voltaremos em breve!",
            previsaoRetorno: dados.previsao_retorno || null,
            atualizadoEm: atualizadoEmIso,
            atualizadoPor: dados.atualizado_por || null,
          });
        } else {
          setStatusManutencao((prev) =>
            prev ? { ...prev, emManutencao: false } : null,
          );
        }
      },
      (erro) => {
        if (import.meta.env.DEV) {
          console.warn(
            "Listener do Firestore em configuracoes/manutencao indisponível:",
            erro,
          );
        }
      },
    );

    return () => unsubscribe();
  }, [usuarioAtual?.uid]);

  /**
   * Dispara a atualização do modo de manutenção via rota administrativa.
   */
  const atualizarManutencao = useCallback(
    async (payload: AtualizarManutencaoPayload) => {
      setSalvandoManutencao(true);
      try {
        const resultado = await sistemaService.atualizarStatusManutencao(payload);
        setStatusManutencao(resultado);
        return resultado;
      } finally {
        setSalvandoManutencao(false);
      }
    },
    [],
  );

  return {
    emManutencao: Boolean(statusManutencao?.emManutencao),
    statusManutencao,
    carregandoManutencao,
    isAdminBypass,
    salvandoManutencao,
    recarregarStatus,
    atualizarManutencao,
  };
}
