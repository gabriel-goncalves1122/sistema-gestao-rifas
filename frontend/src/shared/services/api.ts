// ============================================================================
// SERVICE: fetchAPI
//
// Camada unica de comunicacao HTTP com o backend (Firebase Functions).
//
// Funcionalidades:
// - Injeta automaticamente o token de autenticacao (Firebase ID token)
// - Aguarda o usuario estar autenticado antes de enviar a requisicao
// - Redireciona para /login em caso de 401/403 (sessao expirada)
// - Loga chamadas e erros apenas em ambiente DEV
// ============================================================================
import { onAuthStateChanged, User } from "firebase/auth";

import { auth } from "@/shared/config/firebase";

/**
 * Determina a URL base da API do Firebase Functions de acordo com o ambiente (produção vs desenvolvimento local/rede).
 *
 * @returns {string} URL base da API (ex: `http://127.0.0.1:5001/...` ou endpoint de produção).
 */
function obterApiBaseUrl(): string {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_BASE_URL_PROD;
  }

  const hostname = window.location.hostname;
  const apiLocalConfigurada = String(
    import.meta.env.VITE_API_BASE_URL_LOCAL || "",
  ).trim();

  if (apiLocalConfigurada && !ehHostRedeLocal(hostname)) {
    return apiLocalConfigurada.replace(/\/$/, "");
  }

  const hostApi = normalizarHostParaUrl(
    hostname === "localhost" || hostname === "127.0.0.1"
      ? "127.0.0.1"
      : hostname,
  );

  return `http://${hostApi}:5001/rifasaderidos2026/southamerica-east1/api`;
}

/**
 * Avalia se o hostname atual corresponde a um endereço de loopback ou rede local privada (LAN).
 *
 * @param {string} hostname - Nome do host atual obtido de `window.location.hostname`.
 * @returns {boolean} `true` se for loopback ou IP privado (192.168.*, 10.*, 172.16-31.*).
 */
function ehHostRedeLocal(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname) ||
    hostname.includes(":")
  );
}

/**
 * Formata o hostname para uso em URLs HTTP, encapsulando endereços IPv6 entre colchetes.
 *
 * @param {string} hostname - String bruta do hostname.
 * @returns {string} Hostname formatado para URL.
 */
function normalizarHostParaUrl(hostname: string): string {
  if (hostname.includes(":") && !hostname.startsWith("[")) {
    return `[${hostname}]`;
  }

  return hostname;
}

const API_BASE_URL = obterApiBaseUrl();

/**
 * Aguarda a resolução assíncrona do estado de autenticação do Firebase (`onAuthStateChanged`).
 * Utiliza timeout sentinela para evitar bloqueios infinitos em requisições de rede instáveis.
 *
 * @param {number} [timeoutMs=3500] - Tempo limite máximo de espera em milissegundos.
 * @returns {Promise<User | null>} Instância do usuário autenticado no Firebase ou null em caso de timeout/deslogado.
 */
function aguardarUsuarioAutenticado(timeoutMs = 3500): Promise<User | null> {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve) => {
    let resolvido = false;

    let unsubscribe: () => void = () => {};

    const finalizar = (user: User | null) => {
      if (resolvido) return;

      resolvido = true;
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    };

    const timeout = window.setTimeout(() => {
      finalizar(null);
    }, timeoutMs);

    unsubscribe = onAuthStateChanged(auth, (user) => {
      finalizar(user);
    });
  });
}

/**
 * Cliente HTTP mestre da aplicação para comunicação com o backend em Firebase Functions v2.
 * Funcionalidades automáticas:
 * - Injeção do token JWT Bearer do Firebase Auth;
 * - Suporte a FormData (multipart) e JSON;
 * - Interceptação de respostas 401 e 403 disparando logout forçado e redirecionamento para `/login`;
 * - Logs detalhados restritos ao ambiente de desenvolvimento (`import.meta.env.DEV`).
 *
 * @param {string} endpoint - Caminho relativo da rota (ex: `/tesouraria/checkout/pix`).
 * @param {string} [method="GET"] - Método HTTP (GET, POST, PUT, DELETE, PATCH).
 * @param {unknown} [body] - Carga útil enviada (objeto JSON ou FormData).
 * @param {boolean} [precisaAutenticacao=true] - Se `true`, bloqueia e injeta o token de autenticação.
 * @param {"json" | "blob"} [responseType="json"] - Formato de decodificação esperado da resposta.
 * @returns {Promise<any>} Resposta parseada (JSON ou Blob).
 * @throws {Error} Dispara exceções com mensagem do backend ou erros de rede/autenticação.
 * @sideEffects Em caso de sessão expirada (401/403), executa `auth.signOut()` e redireciona a janela para `/login`.
 */
export async function fetchAPI(
  endpoint: string,
  method = "GET",
  body?: unknown,
  precisaAutenticacao = true,
  responseType: "json" | "blob" = "json",
) {
  try {
    const headers: Record<string, string> = {};

    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (precisaAutenticacao) {
      const user = await aguardarUsuarioAutenticado();

      if (!user) {
        throw new Error("Usuario nao autenticado no sistema.");
      }

      const token = await user.getIdToken();

      headers["Authorization"] = `Bearer ${token}`;
    }

    const options: RequestInit = {
      method,
      headers,
      cache: "no-store",
    };

    if (body) {
      options.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    const url = `${API_BASE_URL}${endpoint}`;

    if (import.meta.env.DEV) {
      console.log(`[API DEV] ${method} ${url}`);
    }

    const response = await fetch(url, options);

    if (responseType === "blob" && response.ok) {
      return response.blob();
    }

    const rawText = await response.text();

    let data;

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      // Loga apenas em DEV para evitar vazar dados sensiveis
      // (PII, stack traces, tokens) no console do usuario em producao.
      if (import.meta.env.DEV) {
        console.warn(
          "Aviso: A resposta da API nao e um JSON valido. Retorno bruto:",
          rawText,
        );
      }

      data = {
        error: `Resposta inesperada do servidor - Status: ${response.status}`,
      };
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        await auth.signOut();
        window.location.href = "/login";

        throw new Error(
          "A sua sessao expirou. Por favor, faca login novamente.",
        );
      }

      throw new Error(data.error || `Erro HTTP ${response.status}`);
    }

    return data;
  } catch (err: unknown) {
    if (import.meta.env.DEV) {
      console.error(`Erro na requisicao [${method}] ${endpoint}:`, err);
    }

    throw err;
  }
}
