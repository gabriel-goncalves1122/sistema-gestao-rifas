import { fetchAPI } from "@/shared/services/api";

import type {
  DocumentoComissao,
  DocumentoFormData,
} from "../types/documentosSecretariaTypes";

interface DocumentoResponse {
  sucesso: true;
  documento: DocumentoComissao;
}

const CAMPOS_DOCUMENTO = [
  "titulo",
  "area",
  "tipo",
  "dataDocumento",
  "descricao",
  "periodoReferencia",
  "textoAlternativo",
  "creditoImagem",
] as const satisfies ReadonlyArray<keyof DocumentoFormData>;

/**
 * Serializa os metadados e o arquivo binário em um objeto nativo `FormData` para envio multipart autenticado.
 *
 * @param {DocumentoFormData} dados - Estado do formulário de documento.
 * @returns {FormData} Objeto FormData configurado para submissão HTTP.
 */
function montarFormularioDocumento(dados: DocumentoFormData): FormData {
  const formulario = new FormData();

  CAMPOS_DOCUMENTO.forEach((campo) => {
    const valor = dados[campo];
    if (typeof valor === "string" && valor.trim()) {
      formulario.append(campo, valor.trim());
    }
  });

  if (dados.arquivo) {
    formulario.append("arquivo", dados.arquivo, dados.arquivo.name);
  }

  return formulario;
}

/**
 * Serviço frontend responsável pela integração com os endpoints `/admin/documentos` da secretaria.
 */
export const documentosSecretariaService = {
  /**
   * Consulta a lista completa de documentos administrativos cadastrados no backend.
   *
   * @returns {Promise<DocumentoComissao[]>} Lista de documentos da secretaria.
   * @sideEffects Requisição GET para `/admin/documentos`.
   */
  async listarDocumentos(): Promise<DocumentoComissao[]> {
    return fetchAPI("/admin/documentos");
  },

  /**
   * Envia novo documento multipart com metadados e arquivo binário anexo.
   *
   * @param {DocumentoFormData} dados - Dados preenchidos no formulário (arquivo obrigatório).
   * @returns {Promise<DocumentoComissao>} Documento cadastrado retornado pelo backend.
   * @throws {Error} Se nenhum arquivo estiver anexado.
   * @sideEffects Requisição POST multipart para `/admin/documentos`.
   */
  async criarDocumento(dados: DocumentoFormData): Promise<DocumentoComissao> {
    if (!dados.arquivo) {
      throw new Error("Selecione um arquivo para enviar.");
    }

    const response: DocumentoResponse = await fetchAPI(
      "/admin/documentos",
      "POST",
      montarFormularioDocumento(dados),
    );

    return response.documento;
  },

  /**
   * Atualiza os metadados de um documento existente, permitindo opcionalmente anexar novo arquivo substituto.
   *
   * @param {DocumentoComissao} documentoAtual - Objeto original do documento antes da edição.
   * @param {DocumentoFormData} dados - Novos metadados e eventual novo arquivo.
   * @returns {Promise<DocumentoComissao>} Documento atualizado retornado pelo backend.
   * @sideEffects Requisição PUT multipart para `/admin/documentos/:id`.
   */
  async atualizarDocumento(
    documentoAtual: DocumentoComissao,
    dados: DocumentoFormData,
  ): Promise<DocumentoComissao> {
    const response: DocumentoResponse = await fetchAPI(
      `/admin/documentos/${documentoAtual.id}`,
      "PUT",
      montarFormularioDocumento(dados),
    );

    return response.documento;
  },

  /**
   * Faz o download do fluxo binário protegido de um documento para visualização ou preview local (Blob).
   *
   * @param {string} documentoId - Identificador único do documento.
   * @returns {Promise<Blob>} Conteúdo binário como Blob para geração de ObjectURL.
   * @sideEffects Requisição GET autenticada para `/admin/documentos/:id/conteudo` com resposta Blob.
   */
  async baixarConteudo(documentoId: string): Promise<Blob> {
    return fetchAPI(
      `/admin/documentos/${documentoId}/conteudo`,
      "GET",
      undefined,
      true,
      "blob",
    );
  },
};
