// ============================================================================
// ARQUIVO: frontend/src/features/auth/hooks/useAuthController.ts
// ============================================================================
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { auth, db } from "@/shared/config/firebase";
import { CargoComissao } from "@/shared/types/models";

import { authService } from "../services/authService";

/**
 * Extensão do objeto `User` do Firebase Auth agregando o cargo do comitê de formatura
 * e o nome cadastrado no Firestore.
 */
export interface UsuarioFormatura extends User {
  /** Cargo de acesso no sistema (ex: "admin", "tesouraria", "secretaria", "aderido"). */
  cargo?: CargoComissao;
  /** Nome completo do usuário sincronizado a partir do Firestore. */
  nome?: string;
}

/**
 * Mapeia códigos de erro do Firebase Auth em mensagens amigáveis em português para recuperação de senha.
 *
 * @param {string} [codigo] - Código de erro retornado pelo Firebase Auth.
 * @returns {string} Mensagem clara para exibição ao usuário.
 */
function obterMensagemErroRecuperacao(codigo?: string) {
  if (codigo === "auth/user-not-found" || codigo === "auth/invalid-email") {
    return "E-mail não encontrado ou formato inválido.";
  }

  return "Ocorreu um erro ao enviar o e-mail de recuperação.";
}

/**
 * Traduz exceções e códigos de erro de criação de conta em mensagens amigáveis.
 *
 * @param {any} erro - Objeto de erro capturado no bloco catch.
 * @returns {string} Mensagem tratada para exibição em formulário.
 */
function obterMensagemErroRegistro(erro: any) {
  if (erro.message && erro.message.includes("elegível")) {
    return "E-mail não encontrado na base oficial. Use o e-mail exato da Keeper.";
  }

  if (erro.code === "auth/email-already-in-use") {
    return "Este e-mail já possui uma senha. Faça login na tela inicial.";
  }

  return erro.message || "Erro ao criar conta. Verifique os dados.";
}

/**
 * Extrai o nome do usuário suportando campos com grafias legadas (`Nome`, `nome`, `displayName`).
 *
 * @param {any} dadosUsuario - Dicionário de dados do usuário.
 * @returns {string} Nome sanitizado.
 */
function normalizarNomeUsuario(dadosUsuario: any) {
  // Mantém compatibilidade com documentos novos e possíveis registros antigos.
  return String(
    dadosUsuario?.nome || dadosUsuario?.Nome || dadosUsuario?.displayName || "",
  ).trim();
}

/**
 * Extrai o cargo do usuário ou atribui o padrão "aderido" se ausente.
 *
 * @param {any} dadosUsuario - Dados do documento de usuário.
 * @returns {CargoComissao} Cargo válido.
 */
function normalizarCargoUsuario(dadosUsuario: any): CargoComissao {
  return (dadosUsuario?.cargo as CargoComissao) || "aderido";
}

/**
 * Controller React (Hook) que gerencia o ciclo de vida e a máquina de estados de autenticação da aplicação.
 *
 * Ciclo de Vida e Listeners em Tempo Real:
 * 1. Inicializa o estado de forma otimista lendo cache local (`auth_cache_{uid}` no localStorage) para evitar flicker.
 * 2. Registra listener `onAuthStateChanged` no Firebase Auth para observar mudanças na sessão de login/logout.
 * 3. Quando autenticado, registra uma subscrição em tempo real (`onSnapshot`) na coleção `usuarios` do Firestore
 *    para reagir imediatamente a mudanças de cargo ou perfil.
 * 4. Limpa automaticamente listeners do Firebase Auth e do Firestore ao desmontar o componente.
 *
 * Propriedades e Funções Expostas:
 * - `usuarioAtual`: Instância de `UsuarioFormatura` contendo UID, e-mail, nome e cargo atualizados.
 * - `loading`: Flag indicando processo de autenticação ou leitura de dados em andamento.
 * - `error`: Mensagem de erro amigável caso uma ação recente tenha falhado.
 * - `handleLogin`: Dispara autenticação com e-mail e senha.
 * - `handleRegister`: Dispara validação de elegibilidade e cadastro de novo formando.
 * - `handleLogout`: Encerra a sessão no Firebase Auth e limpa cache local.
 * - `handlePasswordReset`: Dispara o fluxo de recuperação de senha por e-mail.
 *
 * @returns Objeto com o estado de autenticação e os callbacks de controle.
 */
export function useAuthController() {
  const [loading, setLoading] = useState(() => {
    // Procura no localStorage por uma sessão cacheada válida
    if (typeof window !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("auth_cache_")) {
          // Se encontrou cache, inicia sem loading
          return false;
        }
      }
    }
    return true;
  });

  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioFormatura | null>(() => {
    if (typeof window !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("auth_cache_")) {
          const uid = key.replace("auth_cache_", "");
          try {
            const cacheLocal = localStorage.getItem(key);
            if (cacheLocal) {
              const dadosCacheados = JSON.parse(cacheLocal);
              return {
                uid,
                email: dadosCacheados.email || "",
                cargo: normalizarCargoUsuario(dadosCacheados),
                nome: normalizarNomeUsuario(dadosCacheados),
              } as UsuarioFormatura;
            }
          } catch {
            // Ignora erro e aguarda o firebase autenticar normalmente
          }
        }
      }
    }
    return null;
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeUsuario: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeUsuario?.();

      if (!user?.email) {
        setUsuarioAtual(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const emailNormalizado = user.email.toLowerCase().trim();
      const cacheKey = `auth_cache_${user.uid}`;
      const cacheLocal = localStorage.getItem(cacheKey);
      
      if (cacheLocal) {
        try {
          const dadosCacheados = JSON.parse(cacheLocal);
          setUsuarioAtual({
            ...user,
            cargo: normalizarCargoUsuario(dadosCacheados),
            nome: normalizarNomeUsuario(dadosCacheados),
          } as UsuarioFormatura);
          setLoading(false); // Renderiza a tela instantaneamente
        } catch {
          // Fallback se o cache estiver corrompido
        }
      }

      const consultaUsuario = query(
        collection(db, "usuarios"),
        where("email", "==", emailNormalizado),
      );

      unsubscribeUsuario = onSnapshot(
        consultaUsuario,
        (querySnapshot) => {
          const dadosUsuario = !querySnapshot.empty
            ? querySnapshot.docs[0].data()
            : null;

          const cargo = normalizarCargoUsuario(dadosUsuario);
          const nome = normalizarNomeUsuario(dadosUsuario);

          const usuarioAtualizado = {
            ...user,
            cargo,
            nome,
          } as UsuarioFormatura;

          setUsuarioAtual(usuarioAtualizado);
          
          if (dadosUsuario) {
            localStorage.setItem(cacheKey, JSON.stringify(dadosUsuario));
          }

          setLoading(false);
        },
        (erro) => {
          if (import.meta.env.DEV) {
            console.error("[Auth] Erro ao observar usuário:", erro);
          }

          // Mantém o usuário logado com permissão mínima caso o Firestore falhe.
          setUsuarioAtual({
            ...user,
            cargo: "aderido",
            nome: user.displayName || "",
          } as UsuarioFormatura);

          setLoading(false);
        },
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUsuario?.();
    };
  }, []);

  const handleLogin = async (email: string, senha: string) => {
    setLoading(true);
    setError(null);

    try {
      await authService.login(email, senha);

      // Mantém loading true até o onAuthStateChanged buscar nome e cargo.
      return true;
    } catch (erro) {
      if (import.meta.env.DEV) {
        console.error("[Auth] Erro ao fazer login:", erro);
      }

      setError("E-mail ou senha incorretos.");

      // Corrige o loading infinito quando Firebase rejeita e-mail/senha.
      setLoading(false);

      return false;
    }
  };

  const handleLogout = async () => {
    setError(null);
    try {
      if (auth.currentUser) {
        localStorage.removeItem(`auth_cache_${auth.currentUser.uid}`);
      }
      await authService.logout();
    } catch (erro) {
      if (import.meta.env.DEV) {
        console.error("[Auth] Erro no logout:", erro);
      }
      throw new Error("Não foi possível sair da conta.");
    }
  };

  const handlePasswordReset = async (emailToReset: string) => {
    setLoading(true);
    setError(null);

    try {
      await authService.enviarRecuperacaoSenha(emailToReset);
      return true;
    } catch (erro: any) {
      if (import.meta.env.DEV) {
        console.error("[Auth] Erro na recuperação de senha:", erro);
      }

      setError(obterMensagemErroRecuperacao(erro.code));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (
    nome: string,
    email: string,
    senha: string,
    cpf: string,
  ) => {
    setLoading(true);
    setError(null);

    try {
      return await authService.registrarUsuario(nome, email, senha, cpf);
    } catch (erro: any) {
      if (import.meta.env.DEV) {
        console.error("[Auth] Erro no cadastro:", erro);
      }

      setError(obterMensagemErroRegistro(erro));
      throw erro;
    } finally {
      setLoading(false);
    }
  };

  return {
    usuarioAtual,
    loading,
    error,
    handleLogin,
    handleRegister,
    handleLogout,
    handlePasswordReset,
  };
}
