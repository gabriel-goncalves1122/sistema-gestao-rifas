import { ref, uploadBytes, getDownloadURL, UploadMetadata } from "firebase/storage";
import { storage } from "@/shared/config/firebase";

/**
 * Serviço de armazenamento frontend para upload de arquivos diretamente no Firebase Storage usando o SDK Web.
 */
export const storageService = {
  /**
   * Realiza o upload de um arquivo de imagem para o bucket do Firebase Storage e retorna a URL pública de download.
   *
   * @param {File} arquivo - Objeto File selecionado no navegador.
   * @param {string} [pasta="premios"] - Diretório destino dentro do bucket.
   * @returns {Promise<string>} URL de download pública e acessível.
   * @sideEffects Upload binário no Firebase Storage.
   */
  async uploadImagem(arquivo: File, pasta = "premios"): Promise<string> {
    const storageRef = ref(storage, `${pasta}/${Date.now()}_${arquivo.name}`);
    await uploadBytes(storageRef, arquivo);
    return getDownloadURL(storageRef);
  },

  /**
   * Realiza o upload blindado de comprovante bancário (PDF, JPEG, PNG, WEBP, HEIC)
   * garantindo explicitamente o Content-Type nos metadados para evitar corrupção de cabeçalho.
   *
   * Retorna o caminho canônico do arquivo no bucket (fullPath), dispensando chamada a getDownloadURL
   * no cliente e evitando violações de permissão (storage/unauthorized) para usuários comuns.
   *
   * @param {File} arquivo - Arquivo de comprovante validado.
   * @param {string} [mimeType] - MIME type canônico verificado por magic bytes.
   * @param {string} [pasta="comprovantes"] - Diretório destino no bucket.
   * @returns {Promise<string>} Caminho de referência (fullPath) do comprovante no Storage.
   * @sideEffects Upload no Firebase Storage com metadados estritos.
   */
  async uploadComprovante(
    arquivo: File,
    mimeType?: string,
    pasta = "comprovantes",
  ): Promise<string> {
    const nomeLimpo = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageRef = ref(storage, `${pasta}/${Date.now()}_${nomeLimpo}`);

    const metadata: UploadMetadata = {
      contentType: mimeType || arquivo.type || "application/octet-stream",
      customMetadata: {
        enviadoEm: new Date().toISOString(),
      },
    };

    const snapshot = await uploadBytes(storageRef, arquivo, metadata);
    return snapshot.ref.fullPath;
  },
};
