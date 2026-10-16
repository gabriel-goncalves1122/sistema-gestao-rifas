import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
};
