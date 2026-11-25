import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import {
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import {
  formatarData,
  formatarMoeda,
} from "@/shared/utils/formatadores";

import { ResponsiveDialogShell } from "@/shared/components/ResponsiveDialogShell";
import { VisualizadorComprovante } from "@/shared/components/VisualizadorComprovante";
import { colors } from "@/shared/tokens/colors";
import { typographyScale as typography } from "@/shared/tokens/typography";

import { useTesourariaLayout } from "../../../../hooks/useTesourariaLayout";
import { layout } from "../../../../styles/layout";
import { AnaliseOcrDTO, PixTransacao } from "../../../../types/pixTransacoes";
import { formatarRifasPix } from "../../../../utils/pixTransacoesFiltrosUtils";
import { PixAnaliseOcrDetalhesSection } from "./PixAnaliseOcrDetalhesSection";
import { PixOrigemChip } from "./PixOrigemChip";
import { PixTransacaoAcoes } from "./PixTransacaoAcoes";

/**
 * Propriedades do modal/drawer de detalhes da transação Pix.
 */
export interface PixTransacaoDetalhesDialogProps {
  /** Transação selecionada para inspeção; quando `null`, o diálogo permanece fechado. */
  transacao: PixTransacao | null;
  /** Fila atual de transações para navegação contínua Anterior/Próxima sem fechar o diálogo. */
  fila?: PixTransacao[];
  /** Callback para trocar a transação exibida dentro do fluxo contínuo de revisão. */
  onSelecionarTransacao?: (transacao: PixTransacao) => void;
  /** Callback disparado ao fechar o diálogo. */
  onClose: () => void;
  /** Callback para aprovar individualmente a transação. */
  onAceitar: (id: string, chaveAcao?: string) => Promise<void>;
  /** Callback para negar individualmente a transação com justificativa. */
  onNegar: (id: string, motivo: string, chaveAcao?: string) => Promise<void>;
  /** Callback opcional para disparar reanálise manual do OCR do comprovante. */
  onReanalisarOcr?: (id: string) => Promise<AnaliseOcrDTO | null>;
  /** Indica se esta transação está em processamento de reanálise OCR. */
  reanalisandoOcr?: boolean;
}

const cartaoDetalheSx = {
  p: 1.35,
  borderRadius: 2,
  bgcolor: colors.fundoSuave,
  border: `1px solid ${colors.borda}`,
};

function CampoDetalhe({
  label,
  valor,
}: {
  label: string;
  valor?: string | number | null;
}) {
  return (
    <Box sx={cartaoDetalheSx}>
      <Typography sx={{ ...typography.caption, color: colors.cinzaTexto }}>
        {label}
      </Typography>
      <Typography
        sx={{
          color: colors.pretoEsverdeado,
          fontWeight: 800,
          fontSize: "0.9rem",
          mt: 0.35,
          overflowWrap: "anywhere",
        }}
      >
        {valor || "Não informado"}
      </Typography>
    </Box>
  );
}

/**
 * Diálogo de detalhes de transação da Tesouraria em formato Split-View no desktop
 * (dados da compra à esquerda e visualizador de comprovante à direita) e Drawer no mobile.
 *
 * @param {PixTransacaoDetalhesDialogProps} props - Propriedades do componente.
 * @returns {JSX.Element | null} Modal/Drawer renderizado ou `null` quando fechado.
 */
export function PixTransacaoDetalhesDialog({
  transacao,
  fila = [],
  onSelecionarTransacao,
  onClose,
  onAceitar,
  onNegar,
  onReanalisarOcr,
  reanalisandoOcr = false,
}: PixTransacaoDetalhesDialogProps) {
  const { isMobile } = useTesourariaLayout();
  if (!transacao) return null;

  const indiceAtual = fila.findIndex((t) => t.id === transacao.id);
  const temNavegacao = Boolean(onSelecionarTransacao && fila.length > 1 && indiceAtual >= 0);
  const anterior = temNavegacao && indiceAtual > 0 ? fila[indiceAtual - 1] : null;
  const proxima =
    temNavegacao && indiceAtual < fila.length - 1 ? fila[indiceAtual + 1] : null;

  const handleConcluidoAcao = () => {
    if (temNavegacao && onSelecionarTransacao) {
      const proximaDaFila =
        fila.find((t, idx) => idx > indiceAtual && t.id !== transacao.id) ??
        fila.find((t) => t.id !== transacao.id);
      if (proximaDaFila) {
        onSelecionarTransacao(proximaDaFila);
        return;
      }
    }
    onClose();
  };

  const barraNavegacao = temNavegacao ? (
    <Stack
      data-testid="pix-detalhes-navegacao-fila"
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
      sx={{
        p: 0.75,
        px: 1.25,
        borderRadius: 2,
        bgcolor: colors.fundoSuave,
        border: `1px solid ${colors.borda}`,
      }}
    >
      <Button
        size="small"
        startIcon={<ArrowBackIcon fontSize="small" />}
        disabled={!anterior}
        onClick={() => anterior && onSelecionarTransacao?.(anterior)}
        sx={{ textTransform: "none", fontWeight: 800, color: colors.verdeEscuro }}
      >
        Anterior
      </Button>
      <Typography sx={{ fontSize: "0.78rem", fontWeight: 850, color: colors.cinzaTexto }}>
        {indiceAtual + 1} de {fila.length} na fila
      </Typography>
      <Button
        size="small"
        endIcon={<ArrowForwardIcon fontSize="small" />}
        disabled={!proxima}
        onClick={() => proxima && onSelecionarTransacao?.(proxima)}
        sx={{ textTransform: "none", fontWeight: 800, color: colors.verdeEscuro }}
      >
        Próxima
      </Button>
    </Stack>
  ) : null;

  const valor =
    transacao.statusPagamento === "PAID"
      ? transacao.valorPago
      : transacao.valorBruto;

  const dadosCompra = (
    <Stack spacing={1.5}>
      {barraNavegacao}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <PixOrigemChip origem={transacao.origem} />
        <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.8rem", fontWeight: 700 }}>
          {formatarData(transacao.dataPagamento || transacao.dataCriacao)}
        </Typography>
      </Stack>

      <Box sx={layout.gridDois}>
        <Box sx={cartaoDetalheSx}>
          <Typography sx={{ ...typography.caption, color: colors.cinzaTexto }}>
            Pagador
          </Typography>
          <Typography
            sx={{
              color: colors.pretoEsverdeado,
              fontWeight: 800,
              fontSize: "0.9rem",
              mt: 0.35,
              overflowWrap: "anywhere",
            }}
          >
            {transacao.compradorNome || "Não informado"}
          </Typography>
          {(transacao.compradorTelefone || transacao.compradorEmail) && (
            <Typography
              sx={{
                color: colors.cinzaTexto,
                fontSize: "0.74rem",
                mt: 0.25,
                overflowWrap: "anywhere",
              }}
            >
              {[transacao.compradorTelefone, transacao.compradorEmail]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
          )}
        </Box>
        <CampoDetalhe label="Aderido" valor={transacao.aderido?.nome} />
        <CampoDetalhe label="Rifas" valor={formatarRifasPix(transacao)} />
        <CampoDetalhe label="Valor do pedido" valor={formatarMoeda(valor)} />
        {transacao.codigoAutenticacao && (
          <CampoDetalhe
            label="Código de autenticação"
            valor={transacao.codigoAutenticacao}
          />
        )}
        {transacao.nsu && <CampoDetalhe label="NSU" valor={transacao.nsu} />}
        {transacao.observacao && (
          <CampoDetalhe label="Observação" valor={transacao.observacao} />
        )}
      </Box>

      <PixAnaliseOcrDetalhesSection
        transacao={transacao}
        onReanalisarOcr={onReanalisarOcr}
        reanalisando={reanalisandoOcr}
      />
    </Stack>
  );

  const acoes = (
    <PixTransacaoAcoes
      transacao={transacao}
      onConcluido={handleConcluidoAcao}
      onAceitar={onAceitar}
      onNegar={onNegar}
    />
  );

  if (isMobile) {
    return (
      <ResponsiveDialogShell
        open
        onClose={onClose}
        isMobile
        title="Detalhes da transação Pix"
        closeAriaLabel="Fechar detalhes da transação Pix"
        destaqueItalico
        actions={acoes}
      >
        <Stack spacing={2}>
          {dadosCompra}
          <VisualizadorComprovante
            url={transacao.comprovanteUrl}
            alturaMaxima={340}
          />
        </Stack>
      </ResponsiveDialogShell>
    );
  }

  return (
    <ResponsiveDialogShell
      open
      onClose={onClose}
      isMobile={false}
      title="Detalhes da transação Pix"
      titleId="pix-transacao-detalhes-titulo"
      closeAriaLabel="Fechar detalhes da transação Pix"
      destaqueItalico
      maxWidth="lg"
      contentSx={{ pt: 1, pb: 2.5 }}
      actions={acoes}
    >
      <Box
        data-testid="pix-detalhes-split-view"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" },
          gap: 2.5,
          alignItems: "stretch",
        }}
      >
        <Box>{dadosCompra}</Box>
        <Box sx={{ minHeight: 420 }}>
          <VisualizadorComprovante
            url={transacao.comprovanteUrl}
            alturaMaxima="100%"
          />
        </Box>
      </Box>
    </ResponsiveDialogShell>
  );
}
