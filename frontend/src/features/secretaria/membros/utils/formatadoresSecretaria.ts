// ============================================================================
// ARQUIVO: frontend/src/features/secretaria/membros/utils/formatadoresSecretaria.ts
// ============================================================================
import {
  formatarTelefone as formatarTelefoneCompartilhado,
  somenteNumeros as somenteNumerosCompartilhado,
} from "@/shared/utils/formatadores";

export function somenteNumeros(valor?: string | number | null): string {
  return somenteNumerosCompartilhado(String(valor || ""));
}

const PARTICULAS_NOME = new Set(["da", "das", "de", "do", "dos", "e"]);

function capitalizarParteNome(parte: string): string {
  if (!parte) return parte;

  return parte
    .split("-")
    .map((segmento) => {
      if (!segmento) return segmento;
      return `${segmento.charAt(0).toLocaleUpperCase("pt-BR")}${segmento
        .slice(1)
        .toLocaleLowerCase("pt-BR")}`;
    })
    .join("-");
}

export function formatarNomeMembro(valor?: string | null): string {
  const nome = String(valor || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");

  if (!nome) return "";

  return nome
    .split(" ")
    .map((parte, index) => {
      if (index > 0 && PARTICULAS_NOME.has(parte)) return parte;
      return capitalizarParteNome(parte);
    })
    .join(" ");
}

export function formatarTelefone(valor?: string | number | null): string {
  return formatarTelefoneCompartilhado(String(valor || ""));
}

export function formatarCpf(valor?: string | number | null): string {
  const numeros = somenteNumeros(valor).slice(0, 11);

  if (!numeros) return "";
  if (numeros.length <= 3) return numeros;
  if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`;
  if (numeros.length <= 9) {
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`;
  }

  return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`;
}

/**
 * Sanitiza e normaliza números de telefone inseridos por digitação ou colagem.
 * Lida de forma segura com colagens contendo DDI internacional (+55),
 * preservando integralmente números nacionais normais sem 55 (10 ou 11 dígitos, ex: DDD 35, DDD 55, etc.).
 *
 * @param {string | number | null} [valor] - Telefone bruto ou formatado.
 * @returns {string} Sequência de até 11 dígitos numéricos limpos.
 */
export function sanitizarTelefoneColagem(
  valor?: string | number | null,
): string {
  let numeros = somenteNumeros(valor);

  // Somente se houver 12 ou 13 dígitos começando com "55", o DDI internacional é removido
  if (
    numeros.startsWith("55") &&
    (numeros.length === 12 || numeros.length === 13)
  ) {
    numeros = numeros.slice(2);
  }

  return numeros.slice(0, 11);
}

/**
 * Sanitiza e normaliza CPF inserido por digitação ou colagem, removendo pontuações,
 * espaços e caracteres espúrios, garantindo no máximo 11 dígitos.
 *
 * @param {string | number | null} [valor] - CPF bruto ou formatado.
 * @returns {string} Sequência de até 11 dígitos numéricos limpos.
 */
export function sanitizarCpfColagem(valor?: string | number | null): string {
  return somenteNumeros(valor).slice(0, 11);
}
