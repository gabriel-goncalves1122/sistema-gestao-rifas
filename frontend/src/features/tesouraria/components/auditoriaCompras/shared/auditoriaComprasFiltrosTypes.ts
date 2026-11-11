import {
  AuditoriaComprasFiltros,
  ContagensAuditoriaCompras,
} from "../../../types/auditoriaCompras";

/**
 * Propriedades compartilhadas pelos componentes de filtro da auditoria de compras (Mobile e Desktop).
 */
export interface AuditoriaComprasFiltrosProps {
  /** Estado atual dos filtros selecionados */
  filtros: AuditoriaComprasFiltros;
  /** Indica se há algum filtro ativo diferente do padrão */
  filtrosAtivos: boolean;
  /** Indica se a lista filtrada possui pelo menos um resultado */
  possuiResultados: boolean;
  /** Contagens consolidadas por status, canal e pendência para os badges dos chips */
  contagens?: ContagensAuditoriaCompras;
  /** Callback disparado ao alterar qualquer filtro */
  onChangeFiltros: (filtros: AuditoriaComprasFiltros) => void;
  /** Callback para restaurar os filtros ao estado inicial */
  onLimparFiltros: () => void;
  /** Callback para exportar as compras filtradas em CSV */
  onExportarCsv: () => void;
  /** Callback opcional para abrir o modal de conciliação por extrato bancário */
  onAbrirConciliacao?: () => void;
}
