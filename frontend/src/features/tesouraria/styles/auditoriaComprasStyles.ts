// ============================================================================
// ARQUIVO: frontend/src/features/tesouraria/styles/auditoriaComprasStyles.ts
// ============================================================================
import { colors } from "@/shared/tokens/colors";
import { normalizarTexto } from "@/shared/utils/formatadores";

/**
 * Retorna o objeto de estilo MUI `sx` (cores de texto, fundo e borda) correspondente ao status da compra.
 *
 * @param {string} status - Status da compra.
 * @returns {Object} Objeto de estilização compatível com a prop `sx` do MUI.
 */
export function statusSxAuditoria(status: string) {
  const statusNormalizado = normalizarTexto(status);

  if (statusNormalizado === "pago") {
    return {
      color: colors.branco,
      bgcolor: colors.verdeEscuro,
      border: `1px solid ${colors.verdeEscuro}`,
    };
  }

  if (statusNormalizado === "pendente") {
    return {
      color: colors.amareloEscuro,
      bgcolor: colors.amareloClaro,
      border: "1px solid rgba(107, 78, 0, 0.25)",
    };
  }

  if (statusNormalizado === "recusado") {
    return {
      color: colors.vermelho,
      bgcolor: colors.vermelhoClaro,
      border: "1px solid rgba(122, 31, 31, 0.22)",
    };
  }

  return {
    color: colors.cinzaTexto,
    bgcolor: colors.fundoSuave,
    border: "1px solid rgba(2, 27, 22, 0.10)",
  };
}

/**
 * Retorna os estilos visuais MUI `sx` para identificação rápida do canal de pagamento.
 *
 * @param {string} [origem] - Canal da transação ('PIX' ou 'COMPROVANTE').
 * @returns {Object} Configuração sx com cores e bordas temáticas.
 */
export function origemSxAuditoria(origem?: string) {
  const normalizada = String(origem || "").toUpperCase();
  if (normalizada === "PIX") {
    return {
      bgcolor: "rgba(10, 110, 89, 0.12)",
      color: colors.verdeEscuro,
      border: "1px solid rgba(10, 110, 89, 0.28)",
      fontWeight: 800,
    };
  }
  return {
    bgcolor: "rgba(107, 78, 0, 0.10)",
    color: colors.amareloEscuro,
    border: "1px solid rgba(107, 78, 0, 0.22)",
    fontWeight: 800,
  };
}

/**
 * Retorna os estilos MUI `sx` para a tag de alerta quando houver correção cadastral pendente.
 *
 * @returns {Object} Objeto sx com paleta de aviso âmbar.
 */
export function correcaoPendenteSxAuditoria() {
  return {
    bgcolor: "rgba(194, 65, 12, 0.12)",
    color: "#C2410C",
    border: "1px solid rgba(194, 65, 12, 0.3)",
    fontWeight: 850,
  };
}
