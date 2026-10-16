// ============================================================================
// ARQUIVO: frontend/src/views/components/secretaria/utils/calcularResumoSecretaria.ts
// ============================================================================
import { AderidoSecretaria } from "../../../../shared/types/secretaria";
import { ResumoSecretaria } from "../components/shared/ResumoSecretariaCards";

/**
 * Identifica se determinado usuário possui cargo na comissão de formatura (diferente de "aderido").
 *
 * @param {AderidoSecretaria} aderido - Registro de aderido.
 * @returns {boolean} True se exercer cargo especial na comissão.
 */
function isUsuarioComissao(aderido: AderidoSecretaria): boolean {
  return !!aderido.cargo && aderido.cargo.toLowerCase() !== "aderido";
}

/**
 * Computa as métricas agregadas da comissão e aderidos para exibição nos cards de topo da secretaria.
 * Calcula totais por modalidade (completo vs meio), contagem de cadastros pendentes e membros da comissão.
 *
 * @param {AderidoSecretaria[]} aderidos - Lista de aderidos cadastrados.
 * @returns {ResumoSecretaria} Objeto com contadores agregados (`total`, `aderidos`, `meioAderidos`, `pendentes`, `comissao`).
 */
export function calcularResumoSecretaria(
  aderidos: AderidoSecretaria[],
): ResumoSecretaria {
  return aderidos.reduce<ResumoSecretaria>(
    (resumo, aderido) => {
      const modalidade = aderido.modalidade_adesao || "completo";

      resumo.total += 1;

      if (modalidade === "meio") {
        resumo.meioAderidos += 1;
      } else {
        resumo.aderidos += 1;
      }

      if (aderido.status_cadastro === "pendente") {
        resumo.pendentes += 1;
      }

      if (isUsuarioComissao(aderido)) {
        resumo.comissao += 1;
      }

      return resumo;
    },
    {
      total: 0,
      aderidos: 0,
      meioAderidos: 0,
      pendentes: 0,
      comissao: 0,
    },
  );
}
