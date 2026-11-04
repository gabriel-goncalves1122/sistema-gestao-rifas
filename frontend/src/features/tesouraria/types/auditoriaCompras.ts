/**
 * Tipos e interfaces de domínio da Auditoria de Compras da Tesouraria.
 * Define filtros, contratos de transações auditadas e sumários consolidados.
 */

/**
 * Status possíveis para filtragem na auditoria de compras.
 */
export type StatusAuditoriaCompras =
  | "todas"
  | "pago"
  | "pendente"
  | "recusado"
  | "disponivel";

/**
 * Filtro por presença de arquivo de comprovante manual.
 */
export type FiltroComprovante = "todos" | "com" | "sem";

/**
 * Filtro por canal de origem do pagamento na auditoria.
 */
export type FiltroOrigemAuditoria = "TODAS" | "PIX" | "COMPROVANTE";

/**
 * Conjunto de parâmetros de filtragem da tela de auditoria de compras.
 */
export interface AuditoriaComprasFiltros {
  /** Termo de busca livre pesquisado exclusivamente em nome do comprador ou número da rifa */
  busca: string;
  /** Status da transação no sistema */
  status: StatusAuditoriaCompras;
  /** Canal de origem do pagamento (PIX automatizado vs Comprovante manual) */
  origem?: FiltroOrigemAuditoria;
  /** Se `true`, exibe apenas compras marcadas com correção cadastral pendente */
  somenteCorrecaoPendente?: boolean;
  /** Data inicial de reserva no formato YYYY-MM-DD (mantido por compatibilidade de contrato) */
  dataInicio: string;
  /** Data final de reserva no formato YYYY-MM-DD (mantido por compatibilidade de contrato) */
  dataFim: string;
}

/**
 * Contagens consolidadas por status, canal e pendência para exibição nos chips de filtro.
 */
export interface ContagensAuditoriaCompras {
  /** Total geral de compras na base */
  todas: number;
  /** Compras com status pago */
  pago: number;
  /** Compras com status pendente */
  pendente: number;
  /** Compras com status recusado */
  recusado: number;
  /** Compras originadas via Pix */
  pix: number;
  /** Compras originadas via Comprovante manual */
  comprovante: number;
  /** Compras com flag de correção cadastral pendente */
  correcaoPendente: number;
}

/**
 * Canal de origem da transação financeira.
 */
export type OrigemTransacaoTesouraria = "PIX" | "COMPROVANTE";

/**
 * Representa um registro individual de compra de rifa no histórico de auditoria.
 */
export interface TransacaoTesouraria {
  /** Identificador único da transação */
  id: string;
  /** Timestamp ISO da data em que a rifa foi reservada */
  dataReserva: string | null;
  /** Timestamp ISO da data em que o pagamento foi confirmado */
  dataPagamento: string | null;
  /** ID do vendedor responsável no Firestore */
  vendedorId?: string;
  /** Nome legível do vendedor (aderido ou comissão) */
  vendedorNome: string;
  /** CPF do vendedor formatado */
  vendedorCpf: string;
  /** Identificador do comprador associado na coleção `compradores` */
  compradorId: string | null;
  /** Nome completo do comprador */
  compradorNome: string;
  /** E-mail do comprador para envio de comprovante */
  compradorEmail: string;
  /** Telefone com DDD do comprador */
  compradorTelefone: string;
  /** Status da transação ('pago', 'pendente', 'recusado', 'disponivel') */
  status: string;
  /** URL pública ou do storage do arquivo de comprovante manual */
  comprovanteUrl: string | null;
  /** Números dos bilhetes vinculados à transação */
  bilhetes: string[];
  /** Valor nominal total bruto da compra em reais */
  valorTotal: number;
  /** Valor líquido arrecadado após dedução de taxas do gateway Pix */
  valorLiquido?: number;
  /** Canal pelo qual o pagamento foi registrado */
  origem?: OrigemTransacaoTesouraria;
  /** Identificador da cobrança no gateway Mercado Pago / Pix */
  pixOrderId?: string | null;
  /** Status retornado pela instituição bancária no Pix */
  statusPagamentoBanco?: string | null;
  /** Status da validação manual do comprovante */
  statusValidacao?: string | null;
  /** Flag indicando se há inconsistência cadastral sob correção */
  correcaoPendente?: boolean;
}

/**
 * Resumo quantitativo e financeiro das compras filtradas na auditoria.
 */
export interface ResumoAuditoriaCompras {
  /** Total de compras/transações encontradas */
  totalCompras: number;
  /** Quantidade total de bilhetes/rifas somados */
  totalRifas: number;
  /** Valor total bruto acumulado em reais */
  valorTotal: number;
  /** Valor total líquido acumulado em reais (após taxas de gateway) */
  valorLiquido: number;
  /** Quantidade de compras confirmadas via Pix automatizado */
  comprasPix: number;
  /** Quantidade de compras processadas via Comprovante manual */
  comprasComprovante: number;
  /** Quantidade de compras com status pago */
  pagas: number;
  /** Quantidade de compras aguardando pagamento ou validação */
  pendentes: number;
  /** Quantidade de compras recusadas */
  recusadas: number;
}
