import { useState, useEffect, useRef } from "react";
import { usePremios } from "./usePremios";
import type { PremioData } from "../types/premio";
import type { InfoSorteio } from "../types/sorteio";

/**
 * Controller React (Hook) que gerencia o estado da vitrine de prêmios e do sorteio de formatura.
 * Coordena carregamento assíncrono, modais de edição do cabeçalho e de prêmios, geração e
 * revogação segura de ObjectURLs para preview de foto, além de submissões de formulário e exclusões.
 *
 * @returns Retorna os estados do sorteio, lista de prêmios, modais, flags de loading e funções manipuladoras.
 */
export function usePremiosController() {
  const {
    buscarPremios,
    salvarInfoSorteio,
    salvarPremio,
    excluirPremio,
    uploadImagemPremio,
  } = usePremios();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [infoSorteio, setInfoSorteio] = useState<InfoSorteio>({
    titulo: "",
    data: "",
    descricao: "",
  });
  const [premios, setPremios] = useState<PremioData[]>([]);

  const [modalHeaderAberto, setModalHeaderAberto] = useState(false);
  const [modalPremioAberto, setModalPremioAberto] = useState(false);
  const [premioEmEdicao, setPremioEmEdicao] = useState<PremioData | null>(null);

  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const revogarPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  useEffect(() => {
    return revogarPreview;
  }, []);

  const carregarDados = async () => {
    setCarregando(true);
    const dados = await buscarPremios();
    if (dados) {
      setInfoSorteio(dados.infoSorteio);
      setPremios(dados.premios);
    }
    setCarregando(false);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const guardarHeader = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSalvando(true);
    const formData = new FormData(e.currentTarget);
    await salvarInfoSorteio({
      titulo: formData.get("titulo") as string,
      data: formData.get("data") as string,
      descricao: formData.get("descricao") as string,
    });
    await carregarDados();
    setModalHeaderAberto(false);
    setSalvando(false);
  };

  const abrirModalPremio = (premio?: PremioData) => {
    setPremioEmEdicao(
      premio || { colocacao: "", titulo: "", descricao: "", imagem_url: "" },
    );
    setArquivoFoto(null);
    setPreviewFoto(premio?.imagem_url || null);
    setModalPremioAberto(true);
  };

  const lidarComFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      revogarPreview();
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setArquivoFoto(file);
      setPreviewFoto(url);
    }
  };

  const guardarPremio = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSalvando(true);
    const formData = new FormData(e.currentTarget);

    let urlDaImagem = premioEmEdicao?.imagem_url;
    if (arquivoFoto) {
      try {
        urlDaImagem = await uploadImagemPremio(arquivoFoto);
        revogarPreview();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Falha no upload", error);
        }
      }
    }

    await salvarPremio({
      id: premioEmEdicao?.id,
      colocacao: formData.get("colocacao") as string,
      titulo: formData.get("titulo") as string,
      descricao: formData.get("descricao") as string,
      imagem_url: urlDaImagem,
    });
    await carregarDados();
    setModalPremioAberto(false);
    setSalvando(false);
  };

  const removerPremio = async (id: string) => {
    if (
      !window.confirm(
        "Tem a certeza que deseja excluir este prêmio? A ação é irreversível.",
      )
    )
      return;
    setSalvando(true);
    await excluirPremio(id);
    await carregarDados();
    setModalPremioAberto(false);
    setSalvando(false);
  };

  return {
    carregando,
    salvando,
    infoSorteio,
    premios,
    modalHeaderAberto,
    modalPremioAberto,
    premioEmEdicao,
    previewFoto,
    setModalHeaderAberto,
    setModalPremioAberto,
    guardarHeader,
    abrirModalPremio,
    lidarComFoto,
    guardarPremio,
    removerPremio,
    revogarPreview,
  };
}
