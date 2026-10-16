// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/helpers/vendedorLookupHelper.ts
// ============================================================================
import { Bilhete, ModalidadeAdesao, Usuario } from "../../types/models";

/**
 * Representa os dados consolidados e normalizados de um vendedor/aderido
 * extraídos da coleção `usuarios`.
 */
export interface VendedorResolvido {
  /** ID do documento na coleção `usuarios` (ex: 'ADERIDO_001' ou UID). */
  docId: string;
  /** Código identificador do aderido (ex: 'ADERIDO_001'). */
  idAderido?: string;
  /** UID de autenticação no Firebase Auth, quando vinculado. */
  uid?: string | null;
  /** Nome completo padronizado do aderido. */
  nome: string;
  /** CPF original formatado ou sanitizado do aderido. */
  cpf: string;
  /** CPF contendo apenas dígitos numéricos para indexação determinística. */
  cpfNormalizado: string;
  /** Email cadastrado do aderido. */
  email?: string | null;
  /** Telefone de contato do aderido. */
  telefone?: string;
  /** Curso de graduação do aderido. */
  curso?: string;
  /** Modalidade de adesão ('completo' | 'meio'). */
  modalidadeAdesao?: ModalidadeAdesao;
  /** Cargo ou perfil de acesso no sistema. */
  cargo?: string;
  /** Meta financeira individual em reais (R$). */
  metaVendas: number;
}

/**
 * Estrutura de indexação multi-chave em memória para resolução O(1) de vendedores
 * a partir de bilhetes que podem conter `vendedor_id` (docId, id_aderido ou uid) ou `vendedor_cpf`.
 */
export interface MapaVendedores {
  /** Busca direta por `doc.id`, `id_aderido`, `id` ou `uid`. */
  porId: Map<string, VendedorResolvido>;
  /** Busca direta por CPF (tanto apenas dígitos quanto formato bruto). */
  porCpf: Map<string, VendedorResolvido>;
  /** Lista completa de vendedores resolvidos na ordem original da consulta. */
  lista: VendedorResolvido[];
}

/**
 * Remove caracteres não numéricos de um CPF e descarta placeholders legados
 * como "CPF não registado" ou "CPF não registrado".
 *
 * @param {string | null} [cpf] - String bruta de CPF vinda do Firestore.
 * @returns {string} String contendo apenas os dígitos numéricos do CPF ou vazio se inválido.
 */
export function normalizarCpf(cpf?: string | null): string {
  if (!cpf) return "";

  const texto = String(cpf).trim();
  if (!texto || texto === "-" || /n[aã]o\s+regist/i.test(texto)) {
    return "";
  }

  return texto.replace(/\D/g, "");
}

/**
 * Verifica se uma string de CPF representa um documento preenchido e válido para exibição,
 * rejeitando placeholders de migração legada ("CPF não registado").
 *
 * @param {string | null} [cpf] - CPF avaliado.
 * @returns {boolean} `true` se o CPF possuir dígitos válidos.
 */
export function cpfEhValido(cpf?: string | null): boolean {
  return normalizarCpf(cpf).length >= 3;
}

/**
 * Extrai de maneira resiliente a lista de documentos de um Snapshot do Firestore,
 * suportando tanto `snap.docs` (padrão Admin SDK) quanto mocks de testes unitários
 * que implementam apenas `snap.forEach(...)`.
 *
 * @template T Tipo dos dados internos do documento.
 * @param {unknown} snap - Snapshot retornado por `.get()` no Firestore.
 * @returns {Array<{ id: string; data: () => T }>} Lista padronizada de documentos.
 */
export function extrairDocsSnapshot<T = Record<string, unknown>>(
  snap: unknown,
): Array<{ id: string; data: () => T }> {
  if (!snap || typeof snap !== "object") return [];

  const candidato = snap as {
    docs?: Array<{ id: string; data: () => T }>;
    forEach?: (cb: (doc: { id?: string; data: () => T }) => void) => void;
  };

  if (Array.isArray(candidato.docs)) {
    return candidato.docs;
  }

  if (typeof candidato.forEach === "function") {
    const acumulados: Array<{ id: string; data: () => T }> = [];
    candidato.forEach((doc) => {
      if (doc && typeof doc.data === "function") {
        acumulados.push({
          id: doc.id || "",
          data: () => doc.data(),
        });
      }
    });
    return acumulados;
  }

  return [];
}

/**
 * Constrói o índice multi-chave de vendedores a partir dos documentos da coleção `usuarios`.
 * Permite vincular bilhetes tanto por `vendedor_id` (`ADERIDO_XXX`, `uid` ou `doc.id`)
 * quanto por `vendedor_cpf` (com ou sem pontuação).
 *
 * @param {Array<{ id: string; data: () => Partial<Usuario> }>} usuariosDocs - Documentos da coleção `usuarios`.
 * @returns {MapaVendedores} Índices `porId`, `porCpf` e `lista` de vendedores.
 */
export function criarMapaVendedores(
  usuariosDocs: Array<{ id: string; data: () => Partial<Usuario> }>,
): MapaVendedores {
  const porId = new Map<string, VendedorResolvido>();
  const porCpf = new Map<string, VendedorResolvido>();
  const lista: VendedorResolvido[] = [];

  usuariosDocs.forEach((doc) => {
    const data = (doc.data() || {}) as Partial<Usuario>;
    const cpfBruto = typeof data.cpf === "string" ? data.cpf.trim() : "";
    const cpfLimpo = normalizarCpf(cpfBruto);
    const cargo = String(data.role || data.cargo || "aderido").trim();
    const metaPadrao = data.modalidade_adesao === "meio" ? 600 : 1200;

    const vendedor: VendedorResolvido = {
      docId: doc.id,
      idAderido: data.id_aderido || (doc.id.startsWith("ADERIDO_") ? doc.id : undefined),
      uid: data.uid || null,
      nome: data.nome?.trim() || "Aderido Sem Nome",
      cpf: cpfEhValido(cpfBruto) ? cpfBruto : "-",
      cpfNormalizado: cpfLimpo,
      email: data.email || null,
      telefone: data.telefone || undefined,
      curso: data.curso || undefined,
      modalidadeAdesao: data.modalidade_adesao,
      cargo,
      metaVendas: Number(data.meta_vendas) > 0 ? Number(data.meta_vendas) : metaPadrao,
    };

    lista.push(vendedor);

    const chavesId = [doc.id, data.id_aderido, data.id, data.uid]
      .filter((chave): chave is string => Boolean(chave && String(chave).trim()))
      .map((chave) => String(chave).trim());

    chavesId.forEach((chave) => {
      if (!porId.has(chave)) {
        porId.set(chave, vendedor);
      }
    });

    if (cpfLimpo) {
      if (!porCpf.has(cpfLimpo)) {
        porCpf.set(cpfLimpo, vendedor);
      }
    }

    if (cpfBruto && !porCpf.has(cpfBruto)) {
      porCpf.set(cpfBruto, vendedor);
    }
  });

  return { porId, porCpf, lista };
}

/**
 * Resolve o vendedor responsável por um bilhete utilizando `vendedor_id` como chave primária
 * e `vendedor_cpf` (normalizado ou bruto) como fallback seguro.
 *
 * @param {Partial<Bilhete>} bilhete - Dados do bilhete de rifa.
 * @param {MapaVendedores | null} [mapa] - Mapa indexado da coleção `usuarios`.
 * @returns {VendedorResolvido | null} Vendedor encontrado ou `null` caso não haja correspondência.
 */
export function resolverVendedorDoBilhete(
  bilhete: Partial<Bilhete>,
  mapa?: MapaVendedores | null,
): VendedorResolvido | null {
  if (!mapa) return null;

  const vendedorId = bilhete.vendedor_id?.trim();
  if (vendedorId && mapa.porId.has(vendedorId)) {
    return mapa.porId.get(vendedorId) || null;
  }

  const cpfLimpo = normalizarCpf(bilhete.vendedor_cpf);
  if (cpfLimpo && mapa.porCpf.has(cpfLimpo)) {
    return mapa.porCpf.get(cpfLimpo) || null;
  }

  const cpfBruto = bilhete.vendedor_cpf?.trim();
  if (cpfBruto && mapa.porCpf.has(cpfBruto)) {
    return mapa.porCpf.get(cpfBruto) || null;
  }

  return null;
}

/**
 * Retorna um CPF limpo e legível para exibição em DTOs da API, priorizando o CPF real
 * do cadastro do vendedor em `usuarios` quando o bilhete contiver `"CPF não registado"`.
 *
 * @param {string | null} [cpfBilhete] - CPF gravado no documento do bilhete.
 * @param {VendedorResolvido | null} [vendedor] - Vendedor resolvido da coleção `usuarios`.
 * @returns {string} CPF válido para exibição ou `"-"` quando ausente.
 */
export function formatarCpfVendedor(
  cpfBilhete?: string | null,
  vendedor?: VendedorResolvido | null,
): string {
  if (vendedor && cpfEhValido(vendedor.cpf)) {
    return vendedor.cpf;
  }

  if (cpfEhValido(cpfBilhete)) {
    return String(cpfBilhete).trim();
  }

  return "-";
}

/**
 * Determina se um documento da coleção `usuarios` representa um formando aderido que deve
 * compor os relatórios e métricas de desempenho da Tesouraria.
 * Inclui membros da comissão que também são aderidos (possuem `id_aderido`, `faixa_rifas`,
 * `modalidade_adesao`, `posicao_adesao`, ID `ADERIDO_*` ou vendas vinculadas), excluindo
 * apenas contas puramente técnicas/administrativas sem vínculo de adesão.
 *
 * @param {object} params - Parâmetros de avaliação do usuário.
 * @param {string} params.docId - ID do documento em `usuarios`.
 * @param {Partial<Usuario>} params.usuario - Dados brutos do documento do usuário.
 * @param {string[]} params.superAdmins - Lista de emails de super-administradores técnicos.
 * @param {Set<string>} params.cargosAdmin - Conjunto de cargos administrativos da comissão.
 * @param {boolean} params.possuiVendasVinculadas - Se o usuário possui bilhetes vendidos vinculados a ele.
 * @returns {boolean} `true` se o usuário deve ser contabilizado como aderido no relatório.
 */
export function ehUsuarioAderidoRelatorio({
  docId,
  usuario,
  superAdmins,
  cargosAdmin,
  possuiVendasVinculadas,
}: {
  docId: string;
  usuario: Partial<Usuario>;
  superAdmins: string[];
  cargosAdmin: Set<string>;
  possuiVendasVinculadas: boolean;
}): boolean {
  const temVinculoAdesao = Boolean(
    usuario.id_aderido ||
      docId.startsWith("ADERIDO_") ||
      usuario.faixa_rifas ||
      usuario.modalidade_adesao ||
      usuario.posicao_adesao !== undefined ||
      possuiVendasVinculadas,
  );

  if (temVinculoAdesao) {
    return true;
  }

  const email = usuario.email?.trim().toLowerCase() || "";
  const role = String(usuario.role || usuario.cargo || "").trim();

  if (email && superAdmins.includes(email)) return false;
  if (role && cargosAdmin.has(role)) return false;

  return (role || "aderido") === "aderido";
}
