import { useMemo, useState } from "react";

import type { AderidoSecretaria } from "@/shared/types/secretaria";
import type { SortDir } from "../types/secretariaLocalTypes";

/**
 * Compara dois valores genéricos (numéricos ou textuais em pt-BR) respeitando o sentido de ordenação.
 *
 * @param {unknown} a - Primeiro valor a comparar.
 * @param {unknown} b - Segundo valor a comparar.
 * @param {SortDir} dir - Direção ("asc" ou "desc").
 * @returns {number} Valor negativo se a < b, positivo se a > b, ou zero.
 */
function compararValores(a: unknown, b: unknown, dir: SortDir): number {
  const va = a ?? "";
  const vb = b ?? "";
  const cmp =
    typeof va === "number" && typeof vb === "number"
      ? va - vb
      : String(va).localeCompare(String(vb), "pt-BR", { sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}

/**
 * Obtém a chave nominal de ordenação de um aderido, usando nome como preferência ou e-mail como fallback.
 *
 * @param {AderidoSecretaria} aderido - Dados do aderido.
 * @returns {string} Texto para comparação alfabética.
 */
function obterNomeOrdenacao(aderido: AderidoSecretaria): string {
  return aderido.nome || aderido.email || "";
}

/**
 * Critério de ordenação prioritário: aderidos com `status_cadastro === "ativo"` precedem outros status.
 *
 * @param {AderidoSecretaria} a - Primeiro aderido.
 * @param {AderidoSecretaria} b - Segundo aderido.
 * @returns {number} -1 se a é ativo e b não, 1 se b é ativo e a não, ou 0 se empatados.
 */
function compararAtivosPrimeiro(
  a: AderidoSecretaria,
  b: AderidoSecretaria,
): number {
  const aAtivo = a.status_cadastro === "ativo" ? 0 : 1;
  const bAtivo = b.status_cadastro === "ativo" ? 0 : 1;

  return aAtivo - bAtivo;
}

/**
 * Compara alfabeticamente dois aderidos pelo nome/e-mail no locale pt-BR.
 *
 * @param {AderidoSecretaria} a - Primeiro aderido.
 * @param {AderidoSecretaria} b - Segundo aderido.
 * @returns {number} Resultado do `localeCompare`.
 */
function compararNome(a: AderidoSecretaria, b: AderidoSecretaria): number {
  return obterNomeOrdenacao(a).localeCompare(obterNomeOrdenacao(b), "pt-BR", {
    sensitivity: "base",
  });
}

const COLUNA_CHAVE: Record<string, keyof AderidoSecretaria> = {
  nome: "nome",
  email: "email",
  modalidade: "modalidade_adesao",
  cargo: "cargo",
  status: "status_cadastro",
};

/**
 * Hook customizado responsável pelo controle de ordenação da tabela de membros da secretaria.
 * Mantém os aderidos ativos no topo por padrão e permite alternar ordenação por coluna clicada.
 *
 * @param {AderidoSecretaria[]} aderidos - Lista de aderidos a ordenar.
 * @returns {{ sorted: AderidoSecretaria[]; sortBy: string | null; sortDir: SortDir; toggleSort: (coluna: string) => void }}
 *          Lista ordenada memorizada, coluna atual, direção e disparador de alternância.
 */
export function useSecretariaSort(aderidos: AderidoSecretaria[]) {
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (coluna: string) => {
    if (sortBy === coluna) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(coluna);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const baseOrdenada = [...aderidos].sort((a, b) => {
      const prioridadeStatus = compararAtivosPrimeiro(a, b);
      if (prioridadeStatus !== 0) return prioridadeStatus;

      if (!sortBy) return compararNome(a, b);

      const chave = COLUNA_CHAVE[sortBy];
      if (!chave) return compararNome(a, b);

      const comparacaoColuna = compararValores(a[chave], b[chave], sortDir);
      if (comparacaoColuna !== 0) return comparacaoColuna;

      return compararNome(a, b);
    });

    return baseOrdenada;
  }, [aderidos, sortBy, sortDir]);

  return { sorted, sortBy, sortDir, toggleSort };
}
