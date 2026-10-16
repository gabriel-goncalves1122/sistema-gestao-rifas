import { db } from "../../../../shared/config/firebaseAdmin";
import { AppError } from "../../../../shared/classes/AppError";

import type {
  ArquivoDocumentoSecretaria,
  AtualizarDocumentoSecretariaRequest,
  CriarDocumentoSecretariaRequest,
  DocumentoSecretaria,
} from "./documentosSecretariaTypes";
import {
  criarStoragePathDocumento,
  validarArquivoDocumentoSecretaria,
} from "./documentosSecretariaUploadHelper";
import { documentosSecretariaStorageService } from "./documentosSecretariaStorageService";

const COLECAO_DOCUMENTOS_SECRETARIA = "documentos_secretaria";

/**
 * Converte os dados brutos de um documento Firestore na interface de domínio `DocumentoSecretaria`.
 *
 * @param {string} id - Identificador único do documento.
 * @param {FirebaseFirestore.DocumentData} dados - Dados brutos armazenados no documento Firestore.
 * @returns {DocumentoSecretaria} Estrutura fortemente tipada do documento.
 */
function normalizarDocumento(id: string, dados: FirebaseFirestore.DocumentData) {
  return {
    id,
    titulo: dados.titulo,
    area: dados.area,
    tipo: dados.tipo,
    nomeArquivo: dados.nomeArquivo,
    mimeType: dados.mimeType,
    tamanhoBytes: dados.tamanhoBytes,
    storagePath: dados.storagePath,
    urlVisualizacao: dados.urlVisualizacao,
    autorNome: dados.autorNome,
    criadoEm: dados.criadoEm,
    atualizadoEm: dados.atualizadoEm,
    dataDocumento: dados.dataDocumento || undefined,
    descricao: dados.descricao || undefined,
    periodoReferencia: dados.periodoReferencia || undefined,
    textoAlternativo: dados.textoAlternativo || undefined,
    creditoImagem: dados.creditoImagem || undefined,
  } as DocumentoSecretaria;
}

/**
 * Remove chaves com valores `undefined` de um objeto para evitar falhas de gravação no Firestore.
 *
 * @template T
 * @param {T} dados - Objeto contendo campos opcionais.
 * @returns {Partial<T>} Novo objeto contendo apenas as propriedades definidas.
 */
function limparCamposVazios<T extends Record<string, unknown>>(dados: T) {
  return Object.fromEntries(
    Object.entries(dados).filter(([, valor]) => valor !== undefined),
  ) as Partial<T>;
}

export const documentosSecretariaService = {
  /**
   * Lista todos os documentos administrativos da secretaria ordenados por data de atualização decrescente.
   *
   * @returns {Promise<DocumentoSecretaria[]>} Lista de documentos da secretaria normalizados.
   * @sideEffects Leitura na coleção `documentos_secretaria`.
   */
  async listarDocumentos(): Promise<DocumentoSecretaria[]> {
    const snapshot = await db
      .collection(COLECAO_DOCUMENTOS_SECRETARIA)
      .orderBy("atualizadoEm", "desc")
      .get();

    return snapshot.docs.map((doc) => normalizarDocumento(doc.id, doc.data()));
  },

  /**
   * Realiza o upload binário seguro para o Storage e registra os metadados do documento no Firestore.
   * Em caso de falha na gravação do Firestore, o arquivo binário enviado é automaticamente removido do Storage.
   *
   * @param {CriarDocumentoSecretariaRequest} dados - Metadados informados pelo operador (título, área, tipo, etc.).
   * @param {ArquivoDocumentoSecretaria} arquivo - Buffer binário validado e metadados do arquivo.
   * @param {string} autorNome - Nome do usuário autenticado responsável pelo upload.
   * @returns {Promise<DocumentoSecretaria>} Metadados do documento persistido com ID atribuído.
   * @throws {AppError} Se o arquivo for inválido ou se a gravação no Storage/Firestore falhar.
   * @sideEffects Upload no Firebase Storage e criação de documento na coleção `documentos_secretaria`.
   */
  async criarDocumento(
    dados: CriarDocumentoSecretariaRequest,
    arquivo: ArquivoDocumentoSecretaria,
    autorNome: string,
  ): Promise<DocumentoSecretaria> {
    validarArquivoDocumentoSecretaria(arquivo);

    const agora = new Date().toISOString();
    const docRef = db.collection(COLECAO_DOCUMENTOS_SECRETARIA).doc();
    const storagePath = criarStoragePathDocumento({
      id: docRef.id,
      area: dados.area,
      tipo: dados.tipo,
      nomeArquivo: arquivo.nomeArquivo,
    });
    const documento = limparCamposVazios({
      ...dados,
      nomeArquivo: arquivo.nomeArquivo,
      mimeType: arquivo.mimeType,
      tamanhoBytes: arquivo.tamanhoBytes,
      storagePath,
      autorNome,
      criadoEm: agora,
      atualizadoEm: agora,
    });

    await documentosSecretariaStorageService.salvar({
      storagePath,
      buffer: arquivo.buffer,
      mimeType: arquivo.mimeType,
    });

    try {
      await docRef.set(documento);
    } catch (error) {
      await documentosSecretariaStorageService.remover(storagePath);
      throw error;
    }

    return normalizarDocumento(docRef.id, documento);
  },

  /**
   * Atualiza os metadados de um documento da secretaria e opcionalmente substitui seu arquivo binário no Storage.
   * Utiliza transação para garantir que os metadados só sejam alterados se o documento existir.
   * O arquivo binário antigo só é excluído do Storage após a transação ser confirmada com sucesso.
   *
   * @param {string} id - Identificador do documento no Firestore.
   * @param {AtualizarDocumentoSecretariaRequest} dados - Novos metadados a serem mesclados.
   * @param {ArquivoDocumentoSecretaria} [arquivo] - Novo arquivo binário caso haja substituição.
   * @returns {Promise<DocumentoSecretaria>} Documento com metadados atualizados.
   * @throws {AppError} Se o documento não for encontrado ou se o novo arquivo for inválido.
   * @transactional Validação de existência e atualização dos campos via `db.runTransaction`.
   * @sideEffects Upload do novo arquivo, remoção condicional do arquivo anterior e atualização no Firestore.
   */
  async atualizarDocumento(
    id: string,
    dados: AtualizarDocumentoSecretariaRequest,
    arquivo?: ArquivoDocumentoSecretaria,
  ): Promise<DocumentoSecretaria> {
    const docRef = db.collection(COLECAO_DOCUMENTOS_SECRETARIA).doc(id);
    let documentoAtualizado: DocumentoSecretaria | null = null;
    let novoStoragePath: string | undefined;
    let storagePathAnterior: string | undefined;

    if (arquivo) {
      validarArquivoDocumentoSecretaria(arquivo);
      const documentoExistente = await docRef.get();

      if (!documentoExistente.exists) {
        throw new AppError(
          "DOCUMENTO_SECRETARIA_NAO_ENCONTRADO",
          "Documento não encontrado.",
          404,
        );
      }

      const dadosExistentes = documentoExistente.data();
      novoStoragePath = criarStoragePathDocumento({
        id,
        area: dados.area || dadosExistentes?.area,
        tipo: dados.tipo || dadosExistentes?.tipo,
        nomeArquivo: arquivo.nomeArquivo,
      });

      await documentosSecretariaStorageService.salvar({
        storagePath: novoStoragePath,
        buffer: arquivo.buffer,
        mimeType: arquivo.mimeType,
      });
    }

    try {
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);

        if (!doc.exists) {
          throw new AppError(
            "DOCUMENTO_SECRETARIA_NAO_ENCONTRADO",
            "Documento não encontrado.",
            404,
          );
        }

        const camposArquivo = arquivo && novoStoragePath
          ? {
              nomeArquivo: arquivo.nomeArquivo,
              mimeType: arquivo.mimeType,
              tamanhoBytes: arquivo.tamanhoBytes,
              storagePath: novoStoragePath,
              urlVisualizacao: undefined,
            }
          : {};
        const campos = limparCamposVazios({
          ...dados,
          ...camposArquivo,
          atualizadoEm: new Date().toISOString(),
        });

        storagePathAnterior = doc.data()?.storagePath;
        transaction.update(docRef, campos);
        documentoAtualizado = normalizarDocumento(doc.id, {
          ...doc.data(),
          ...campos,
        });
      });
    } catch (error) {
      if (novoStoragePath) {
        await documentosSecretariaStorageService.remover(novoStoragePath);
      }
      throw error;
    }

    if (
      novoStoragePath &&
      storagePathAnterior &&
      storagePathAnterior !== novoStoragePath
    ) {
      try {
        await documentosSecretariaStorageService.remover(storagePathAnterior);
      } catch (error) {
        console.warn(
          "[DocumentosSecretaria] Arquivo anterior não removido:",
          error,
        );
      }
    }

    if (!documentoAtualizado) {
      throw new AppError(
        "DOCUMENTO_SECRETARIA_ATUALIZACAO_FALHOU",
        "Não foi possível atualizar o documento.",
        500,
      );
    }

    return documentoAtualizado;
  },

  /**
   * Obtém o fluxo binário do arquivo armazenado no Firebase Storage associado a um documento da secretaria.
   * Utilizado para download seguro e streaming de preview autenticado sem expor URLs públicas do bucket.
   *
   * @param {string} id - Identificador único do documento.
   * @returns {Promise<{ conteudo: Buffer; mimeType: string; nomeArquivo: string }>} Buffer binário e metadados de entrega.
   * @throws {AppError} Se o documento não for encontrado ou não possuir arquivo binário registrado.
   * @sideEffects Leitura do Firestore e download do objeto no Firebase Storage.
   */
  async obterConteudo(id: string): Promise<{
    conteudo: Buffer;
    mimeType: string;
    nomeArquivo: string;
  }> {
    const doc = await db.collection(COLECAO_DOCUMENTOS_SECRETARIA).doc(id).get();

    if (!doc.exists) {
      throw new AppError(
        "DOCUMENTO_SECRETARIA_NAO_ENCONTRADO",
        "Documento não encontrado.",
        404,
      );
    }

    const documento = normalizarDocumento(doc.id, doc.data() || {});

    if (!documento.storagePath) {
      throw new AppError(
        "DOCUMENTO_SECRETARIA_SEM_ARQUIVO",
        "Este documento não possui arquivo armazenado.",
        404,
      );
    }

    return {
      conteudo: await documentosSecretariaStorageService.baixar(
        documento.storagePath,
      ),
      mimeType: documento.mimeType,
      nomeArquivo: documento.nomeArquivo,
    };
  },
};
