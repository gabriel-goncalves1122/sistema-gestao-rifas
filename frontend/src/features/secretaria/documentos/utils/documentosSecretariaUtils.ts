import type {
  DocumentoComissao,
  DocumentoFormData,
  DocumentosSecretariaFiltros,
  TipoDocumentoCadastro,
  TipoPreviewDocumento,
} from "../types/documentosSecretariaTypes";
import { TIPOS_CADASTRO_DOCUMENTO } from "../constants/documentosTipos";

/**
 * Remove acentuação e converte texto para minúsculas para busca textual insensível a maiúsculas/acentos.
 *
 * @param {string} valor - String bruta.
 * @returns {string} String normalizada sem diacríticos e sem espaços extras.
 */
const normalizarTexto = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/**
 * Filtra a lista de documentos da secretaria por área administrativa e termo de busca textual.
 * A busca textual pesquisa em título, área, tipo, nome de arquivo e nome do autor.
 *
 * @param {DocumentoComissao[]} documentos - Lista completa de documentos disponíveis.
 * @param {DocumentosSecretariaFiltros} filtros - Critérios ativos de filtro (área e termo de busca).
 * @returns {DocumentoComissao[]} Lista filtrada de documentos.
 */
export function filtrarDocumentosSecretaria(
  documentos: DocumentoComissao[],
  filtros: DocumentosSecretariaFiltros,
) {
  const busca = normalizarTexto(filtros.busca);

  return documentos.filter((documento) => {
    const correspondeArea =
      filtros.area === "todas" || documento.area === filtros.area;

    if (!correspondeArea) {
      return false;
    }

    if (!busca) {
      return true;
    }

    const textoDocumento = normalizarTexto(
      [
        documento.titulo,
        documento.area,
        documento.tipo,
        documento.nomeArquivo,
        documento.autorNome,
      ].join(" "),
    );

    return textoDocumento.includes(busca);
  });
}

/**
 * Converte um tamanho numérico em bytes para uma representação legível com unidade (ex: "1.4 MB", "350 KB").
 *
 * @param {number} bytes - Quantidade de bytes do arquivo.
 * @returns {string} String formatada com unidade correspondente.
 */
export function formatarTamanhoArquivo(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  const unidades = ["B", "KB", "MB", "GB"];
  let valor = bytes;
  let indice = 0;

  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024;
    indice += 1;
  }

  const casas = indice <= 1 ? 0 : 1;
  return `${valor.toFixed(casas)} ${unidades[indice]}`;
}

/**
 * Formata uma data ISO para o padrão brasileiro abreviado (ex: "15 de out. de 2026").
 *
 * @param {string} valor - String ISO de data ou timestamp legível.
 * @returns {string} Data formatada ou mensagem de indisponibilidade caso inválida.
 */
export function formatarDataDocumento(valor: string) {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "Data indisponível";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(data);
}

/**
 * Determina o tipo de visualizador/preview apropriado com base no MIME type do arquivo.
 *
 * @param {string} mimeType - Tipo MIME do documento (ex: "application/pdf", "image/png").
 * @returns {TipoPreviewDocumento} Categoria de preview ("imagem", "pdf" ou "indisponivel").
 */
export function obterTipoPreviewDocumento(mimeType: string): TipoPreviewDocumento {
  if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType)) {
    return "imagem";
  }

  if (mimeType === "application/pdf") {
    return "pdf";
  }

  return "indisponivel";
}

/**
 * Sanitiza e valida URLs de visualização legadas para garantir que usem protocolos seguros (http/https).
 *
 * @param {string} [url] - URL de visualização potencial.
 * @returns {string | null} URL segura ou null se inválida ou ausente.
 */
export function obterUrlVisualizacaoSegura(url?: string) {
  if (!url) {
    return null;
  }

  if (url.startsWith("/")) {
    return url;
  }

  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

/**
 * Infere a categoria de cadastro (`pdf`, `planilha` ou `imagem`) de um documento existente.
 *
 * @param {DocumentoComissao} documento - Objeto de domínio do documento.
 * @returns {TipoDocumentoCadastro} Categoria correspondente de cadastro.
 */
export function inferirTipoCadastroDocumento(
  documento: DocumentoComissao,
): TipoDocumentoCadastro {
  if (documento.tipoCadastro) {
    return documento.tipoCadastro;
  }

  if (documento.mimeType.startsWith("image/")) {
    return "imagem";
  }

  if (documento.tipo === "planilha") {
    return "planilha";
  }

  return "pdf";
}

/**
 * Cria o estado inicial do formulário de criação de documento preenchendo defaults com base no tipo.
 *
 * @param {TipoDocumentoCadastro} tipoCadastro - Categoria de documento ("pdf", "planilha" ou "imagem").
 * @returns {DocumentoFormData} Dados vazios estruturados do formulário.
 */
export function criarDocumentoFormInicial(
  tipoCadastro: TipoDocumentoCadastro,
): DocumentoFormData {
  const config = TIPOS_CADASTRO_DOCUMENTO[tipoCadastro];

  return {
    titulo: "",
    area: "Geral",
    tipo: config.tipoPadrao,
    nomeArquivo: "",
    mimeType: config.mimeType,
    tamanhoBytes: 0,
    tipoCadastro,
    arquivo: null,
    dataDocumento: "",
    descricao: "",
    periodoReferencia: "",
    textoAlternativo: "",
    creditoImagem: "",
  };
}

/**
 * Mapeia os dados de um documento existente para a estrutura de edição `DocumentoFormData`.
 *
 * @param {DocumentoComissao} documento - Objeto de documento recuperado do servidor.
 * @returns {DocumentoFormData} Dados preenchidos no formato do formulário.
 */
export function documentoParaFormData(
  documento: DocumentoComissao,
): DocumentoFormData {
  const tipoCadastro = inferirTipoCadastroDocumento(documento);

  return {
    ...criarDocumentoFormInicial(tipoCadastro),
    titulo: documento.titulo,
    area: documento.area,
    tipo: documento.tipo,
    nomeArquivo: documento.nomeArquivo,
    mimeType: documento.mimeType,
    tamanhoBytes: documento.tamanhoBytes,
    arquivo: null,
    dataDocumento: documento.dataDocumento ?? "",
    descricao: documento.descricao ?? "",
    periodoReferencia: documento.periodoReferencia ?? "",
    textoAlternativo: documento.textoAlternativo ?? "",
    creditoImagem: documento.creditoImagem ?? "",
  };
}

/**
 * Infere o tipo MIME provável de um arquivo inspecionando a propriedade nativa `type` e sua extensão de nome.
 *
 * @param {File} arquivo - Objeto File da Web API selecionado pelo usuário.
 * @returns {string} String do MIME type detectado.
 */
export function inferirMimeTypeDocumento(arquivo: File) {
  if (arquivo.type) {
    return arquivo.type;
  }

  const nome = arquivo.name.toLowerCase();

  if (nome.endsWith(".csv")) return "text/csv";
  if (nome.endsWith(".xls")) return "application/vnd.ms-excel";
  if (nome.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (nome.endsWith(".pdf")) return "application/pdf";

  return "application/octet-stream";
}

/**
 * Infere a categoria de cadastro suportada (`pdf`, `planilha`, `imagem`) a partir do arquivo selecionado.
 *
 * @param {File} arquivo - Arquivo selecionado no input HTML.
 * @returns {TipoDocumentoCadastro | null} Tipo de cadastro identificado ou null se não suportado.
 */
export function inferirTipoCadastroPorArquivo(
  arquivo: File,
): TipoDocumentoCadastro | null {
  const mimeType = inferirMimeTypeDocumento(arquivo);
  const nome = arquivo.name.toLowerCase();

  if (mimeType === "application/pdf" || nome.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    mimeType === "text/csv" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    nome.endsWith(".csv") ||
    nome.endsWith(".xls") ||
    nome.endsWith(".xlsx")
  ) {
    return "planilha";
  }

  if (mimeType.startsWith("image/")) {
    return "imagem";
  }

  return null;
}

/**
 * Valida se determinado arquivo selecionado pelo usuário corresponde ao tipo de modal aberto.
 *
 * @param {File} arquivo - Arquivo submetido.
 * @param {TipoDocumentoCadastro} tipoCadastro - Tipo de cadastro esperado ("pdf", "planilha" ou "imagem").
 * @returns {boolean} True se o arquivo for compatível com a modalidade esperada.
 */
export function arquivoAceitoParaTipo(
  arquivo: File,
  tipoCadastro: TipoDocumentoCadastro,
) {
  const tipoInferido = inferirTipoCadastroPorArquivo(arquivo);
  return tipoInferido === tipoCadastro;
}
