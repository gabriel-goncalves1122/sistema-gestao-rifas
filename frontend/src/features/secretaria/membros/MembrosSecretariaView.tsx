import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";

import { FeedbackSnackbar } from "@/shared/components/FeedbackSnackbar";
import { useResponsiveLayout } from "@/shared/hooks/useResponsiveLayout";
import { useSecretariaController } from "./hooks/useSecretariaController";
import { useSecretariaSort } from "./hooks/useSecretariaSort";
import { useSecretariaKeyboard } from "./hooks/useSecretariaKeyboard";

import { SecretariaHeader } from "./components/shared/SecretariaHeader";
import { ResumoSecretariaCards } from "./components/shared/ResumoSecretariaCards";
import { SecretariaTipoUsuarioTabs } from "./components/shared/SecretariaTipoUsuarioTabs";
import { ModalDetalhesAderido } from "./components/shared/ModalDetalhesAderido";
import { ModalAdicionarAderido } from "./components/shared/ModalAdicionarAderido";
import { SecretariaDesktopView } from "./components/desktop/SecretariaDesktopView";
import { SecretariaMobileView } from "./components/mobile/SecretariaMobileView";

import { filtrarAderidos } from "./utils/filtrarAderidos";
import { calcularResumoSecretaria } from "./utils/calcularResumoSecretaria";
import { layout } from "../styles/layout";
import type { SecretariaTipoUsuarioTab } from "./types/secretariaLocalTypes";

export function MembrosSecretariaView() {
  const { isMobile } = useResponsiveLayout();

  const {
    aderidos,
    loading,
    notificacao,
    busca,
    aderidoSelecionado,
    modalAberto,
    selectedIds,

    setBusca,
    setAderidoSelecionado,
    setModalAberto,

    toggleSelectId,
    toggleSelectAll,
    limparSelecao,

    carregarAderidos,
    adicionarAderidoIndividual,
    atualizarAderidoSecretaria,
    fecharNotificacao,
  } = useSecretariaController();

  const { sorted, sortBy, sortDir, toggleSort } = useSecretariaSort(aderidos);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [tipoUsuario, setTipoUsuario] =
    useState<SecretariaTipoUsuarioTab>("aderidos");

  useEffect(() => {
    carregarAderidos().catch(() => {});
  }, [carregarAderidos]);

  const resumo = calcularResumoSecretaria(aderidos);
  const aderidosFiltrados = filtrarAderidos(sorted, {
    busca,
    modalidade: "todos",
    status: "todos",
    tipoUsuario,
  });

  const handleSelectAll = () => {
    const ids = aderidosFiltrados.map((a) => a.id);
    toggleSelectAll(ids);
  };

  useSecretariaKeyboard({
    onFocusSearch: () => searchInputRef.current?.focus(),
    onNewAderido: () => setModalAberto(true),
    onClosePanel: () => setAderidoSelecionado(null),
    panelOpen: !!aderidoSelecionado,
    modalOpen: modalAberto,
  });

  return (
    <Box sx={layout.pageContainer}>
      <SecretariaHeader
        total={aderidos.length}
        showButton={!isMobile}
        onNovaAdesao={() => setModalAberto(true)}
      />

      <ResumoSecretariaCards resumo={resumo} />

      <SecretariaTipoUsuarioTabs
        value={tipoUsuario}
        onChange={setTipoUsuario}
      />

      {isMobile ? (
        <SecretariaMobileView
          aderidosFiltrados={aderidosFiltrados}
          loading={loading}
          busca={busca}
          searchInputRef={searchInputRef}
          onBuscaChange={setBusca}
          onSelecionarAderido={setAderidoSelecionado}
          onNovaAdesao={() => setModalAberto(true)}
        />
      ) : (
        <SecretariaDesktopView
          aderidosFiltrados={aderidosFiltrados}
          loading={loading}
          busca={busca}
          sortBy={sortBy}
          sortDir={sortDir}
          aderidoSelecionado={aderidoSelecionado}
          selectedIds={selectedIds}
          searchInputRef={searchInputRef}
          onBuscaChange={setBusca}
          onToggleSort={toggleSort}
          onSelecionarAderido={setAderidoSelecionado}
          onCloseDetail={() => setAderidoSelecionado(null)}
          onToggleSelect={toggleSelectId}
          onSelectAll={handleSelectAll}
          onClearSelection={limparSelecao}
          onSalvarAderido={atualizarAderidoSecretaria}
        />
      )}

      {isMobile && (
        <ModalDetalhesAderido
          open={!!aderidoSelecionado && isMobile}
          aderido={aderidoSelecionado}
          onClose={() => setAderidoSelecionado(null)}
          onSalvar={atualizarAderidoSecretaria}
        />
      )}

      <ModalAdicionarAderido
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onConfirm={adicionarAderidoIndividual}
      />

      <FeedbackSnackbar
        open={notificacao.open}
        mensagem={notificacao.mensagem}
        severidade={notificacao.severidade}
        onClose={fecharNotificacao}
      />
    </Box>
  );
}
