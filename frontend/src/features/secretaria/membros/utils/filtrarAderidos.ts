// ============================================================================
// ARQUIVO: frontend/src/views/components/secretaria/utils/filtrarAderidos.ts
// ============================================================================
import {
  AderidoSecretaria,
  FiltroTipoUsuario,
  ModalidadeAdesao,
  StatusCadastro,
} from "../../../../shared/types/secretaria";

/**
 * Estrutura de filtros combinados aplicáveis à listagem de aderidos.
 */
interface FiltrosSecretaria {
  /** Termo de busca textual (nome ou e-mail). */
  busca: string;
  /** Modalidade de adesão selecionada ("todos", "completo", "meio"). */
  modalidade: "todos" | ModalidadeAdesao;
  /** Status do cadastro ("todos", "ativo", "pendente", "inativo"). */
  status: "todos" | StatusCadastro;
  /** Segmentação de visualização ("todos", "aderidos", "comissao"). */
  tipoUsuario: FiltroTipoUsuario;
}

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
 * Filtra a listagem de membros por múltiplos critérios: busca textual, modalidade, status e tipo de usuário.
 *
 * @param {AderidoSecretaria[]} aderidos - Lista completa de membros.
 * @param {FiltrosSecretaria} filtros - Critérios ativos de filtragem.
 * @returns {AderidoSecretaria[]} Lista filtrada de membros.
 */
export function filtrarAderidos(
  aderidos: AderidoSecretaria[],
  filtros: FiltrosSecretaria,
): AderidoSecretaria[] {
  const termo = filtros.busca.trim().toLowerCase();

  return aderidos.filter((aderido) => {
    const modalidade = aderido.modalidade_adesao || "completo";
    const usuarioComissao = isUsuarioComissao(aderido);

    const matchBusca =
      !termo ||
      aderido.nome?.toLowerCase().includes(termo) ||
      aderido.email.toLowerCase().includes(termo);

    const matchModalidade =
      filtros.modalidade === "todos" || modalidade === filtros.modalidade;

    const matchStatus =
      filtros.status === "todos" || aderido.status_cadastro === filtros.status;

    const matchTipoUsuario =
      filtros.tipoUsuario === "todos" ||
      (filtros.tipoUsuario === "comissao" && usuarioComissao) ||
      (filtros.tipoUsuario === "aderidos" && !usuarioComissao);

    return matchBusca && matchModalidade && matchStatus && matchTipoUsuario;
  });
}
