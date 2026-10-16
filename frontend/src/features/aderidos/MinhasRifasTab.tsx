import { Box } from "@mui/material";

import { NotificacoesSidebar } from "@/shared/components/NotificacoesSidebar";
import { usePremiosLayout } from "../premios/hooks/usePremiosLayout";

import { CheckoutModal } from "./CheckoutModal";
import { ModalCorrecaoRecusa } from "./ModalCorrecaoRecusa";
import { ModalDetalhesRifa } from "./ModalDetalhesRifa";
import { LoadingRifasState } from "./components/LoadingRifasState";

import { MinhasRifasDesktopView } from "./components/desktop/MinhasRifasDesktopView";
import { MinhasRifasMobileView } from "./components/mobile/MinhasRifasMobileView";

import { usePainelAderidoController } from "./hooks/usePainelAderidoController";
import { painelAderidoStyles } from "./styles/painelAderidoStyles";

export function MinhasRifasTab() {
  const painel = usePainelAderidoController();
  const { isMobile } = usePremiosLayout();



  const ViewComponent = isMobile ? MinhasRifasMobileView : MinhasRifasDesktopView;

  return (
    <Box sx={painelAderidoStyles.page}>
      <Box
        sx={{
          ...painelAderidoStyles.root,
          pb: painel.possuiSelecao ? { xs: 17, sm: 15 } : 3,
        }}
      >
        {painel.carregando ? (
          <LoadingRifasState />
        ) : (
          <ViewComponent
            visaoAtual={painel.visaoAtual}
            primeiroNome={painel.primeiroNome}
            valorArrecadado={painel.valorArrecadado}
            contadoresRifas={painel.contadoresRifas}
            notificacoesNaoLidas={painel.notificacoesNaoLidas}
            totalPendencias={painel.gruposRecusados.length}
            onAbrirNotificacoes={painel.abrirSidebarNotificacoes}
            onAbrirRecusadas={painel.abrirRecusadas}
            filtro={painel.filtro}
            onChangeFiltro={painel.setFiltro}
            rifasFiltradas={painel.rifasFiltradas}
            selecionadas={painel.selecionadas}
            onToggleSelecao={painel.alternarSelecaoRifa}
            onAbrirDetalhes={painel.setRifaParaDetalhes}
            gruposRecusados={painel.gruposRecusados}
            onVoltar={painel.voltarParaRifas}
            onAbrirCorrecao={(grupo) => {
              painel.setGrupoParaCorrigir(grupo);
              painel.setModalCorrecaoAberto(true);
            }}
            possuiSelecao={painel.possuiSelecao}
            valorTotalSelecionado={painel.valorTotalSelecionado}
            onVenderClick={() => painel.setModalCheckoutAberto(true)}
            onLimparSelecao={painel.limparSelecao}
          />
        )}

        <CheckoutModal
          open={painel.modalCheckoutAberto}
          onClose={() => {
            painel.setModalCheckoutAberto(false);
          }}
          onSuccess={painel.finalizarVendaComSucesso}
          numerosRifas={painel.selecionadas}
          invalidarDadosPainel={painel.invalidarDadosPainel}
        />

        <NotificacoesSidebar
          open={painel.drawerNotificacoesAberto}
          onClose={() => painel.setDrawerNotificacoesAberto(false)}
          notificacoes={painel.notificacoes}
        />

        <ModalCorrecaoRecusa
          open={painel.modalCorrecaoAberto}
          onClose={() => painel.setModalCorrecaoAberto(false)}
          grupoRecusado={painel.grupoParaCorrigir}
          onCorrigirDados={painel.corrigirDadosRecusados}
        />

        <ModalDetalhesRifa
          open={Boolean(painel.rifaParaDetalhes)}
          onClose={() => painel.setRifaParaDetalhes(null)}
          rifa={painel.rifaParaDetalhes}
          onCorrigirDados={(rifa) => {
            painel.setRifaParaDetalhes(null);
            const grupo = painel.gruposRecusados.find((g) =>
              g.bilhetes.includes(rifa.numero),
            );
            if (grupo) {
              painel.setGrupoParaCorrigir(grupo);
              painel.setModalCorrecaoAberto(true);
            } else {
              painel.abrirRecusadas();
            }
          }}
        />
      </Box>
    </Box>
  );
}
