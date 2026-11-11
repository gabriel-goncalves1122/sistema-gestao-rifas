import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";

import { VisualizadorComprovante } from "@/shared/components/VisualizadorComprovante";
import { colors } from "@/shared/tokens/colors";
import { typographyScale as typography } from "@/shared/tokens/typography";

import { useTesourariaLayout } from "../../../../hooks/useTesourariaLayout";
import { layout } from "../../../../styles/layout";
import { PixTransacao } from "../../../../types/pixTransacoes";
import {
  formatarDataPix,
  formatarMoedaPix,
  formatarRifasPix,
  obterLabelStatusPagamento,
} from "../../../../utils/pixTransacoesUtils";
import { PixOrigemChip } from "./PixOrigemChip";
import { PixTransacaoAcoes } from "./PixTransacaoAcoes";

/**
 * Propriedades do modal/drawer de detalhes da transação Pix.
 */
export interface PixTransacaoDetalhesDialogProps {
  /** Transação selecionada para inspeção; quando `null`, o diálogo permanece fechado. */
  transacao: PixTransacao | null;
  /** Callback disparado ao fechar o diálogo. */
  onClose: () => void;
  /** Callback para aprovar individualmente a transação. */
  onAceitar: (id: string, chaveAcao?: string) => Promise<void>;
  /** Callback para negar individualmente a transação com justificativa. */
  onNegar: (id: string, motivo: string, chaveAcao?: string) => Promise<void>;
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
  onClose,
  onAceitar,
  onNegar,
}: PixTransacaoDetalhesDialogProps) {
  const { isMobile } = useTesourariaLayout();
  if (!transacao) return null;

  const valor =
    transacao.statusPagamento === "PAID"
      ? transacao.valorPago
      : transacao.valorBruto;

  const identificador = transacao.pixOrderId || transacao.id;

  const dadosCompra = (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <PixOrigemChip origem={transacao.origem} />
        <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.8rem", fontWeight: 700 }}>
          {formatarDataPix(transacao.dataPagamento || transacao.dataCriacao)}
        </Typography>
      </Stack>

      <Box sx={layout.gridDois}>
        <CampoDetalhe label="Pagador" valor={transacao.compradorNome} />
        <CampoDetalhe label="E-mail" valor={transacao.compradorEmail} />
        <CampoDetalhe label="Telefone" valor={transacao.compradorTelefone} />
        <CampoDetalhe label="Documento" valor={transacao.compradorDocumento} />
        <CampoDetalhe label="Aderido" valor={transacao.aderido?.nome} />
        <CampoDetalhe
          label="Tipo de aderido"
          valor={
            transacao.aderido?.modalidade_adesao === "meio"
              ? "Meio-aderido"
              : transacao.aderido
                ? "Aderido"
                : "Não vinculado"
          }
        />
        <CampoDetalhe label="Rifas" valor={formatarRifasPix(transacao)} />
        <CampoDetalhe label="Valor" valor={formatarMoedaPix(valor)} />
        <CampoDetalhe label="Identificador" valor={identificador} />
        <CampoDetalhe
          label="Status do pagamento"
          valor={obterLabelStatusPagamento(transacao.statusPagamento)}
        />
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
    </Stack>
  );

  const acoes = (
    <PixTransacaoAcoes
      transacao={transacao}
      onConcluido={onClose}
      onAceitar={onAceitar}
      onNegar={onNegar}
    />
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open
        onClose={onClose}
        PaperProps={{
          sx: {
            ...layout.drawerPaper,
            maxHeight: "92dvh",
            pb: "max(16px, env(safe-area-inset-bottom))",
          },
        }}
      >
        <Stack spacing={2} sx={{ height: "100%", overflow: "hidden" }}>
          <Box sx={layout.drawerPullHandle} />
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography sx={{ ...typography.sectionTitle, fontSize: "1.2rem" }}>
              Detalhes da transação Pix
            </Typography>
            <IconButton
              aria-label="Fechar detalhes da transação Pix"
              onClick={onClose}
              size="small"
              sx={{ color: colors.cinzaTexto }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Stack spacing={2} sx={{ flex: 1, overflowY: "auto", px: 0.5, pb: 1 }}>
            {dadosCompra}
            <VisualizadorComprovante
              url={transacao.comprovanteUrl}
              alturaMaxima={340}
            />
          </Stack>
          <Box sx={{ pt: 1.25, borderTop: `1px solid ${colors.borda}` }}>
            {acoes}
          </Box>
        </Stack>
      </Drawer>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby="pix-transacao-detalhes-titulo"
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: colors.branco,
          border: `1px solid ${colors.borda}`,
        },
      }}
    >
      <DialogTitle
        id="pix-transacao-detalhes-titulo"
        sx={{ ...typography.sectionTitle, pr: 7 }}
      >
        Detalhes da transação Pix
        <IconButton
          aria-label="Fechar detalhes da transação Pix"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 12,
            top: 12,
            borderRadius: 2,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1, pb: 2.5 }}>
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
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: `1px solid ${colors.borda}`,
          justifyContent: "flex-end",
        }}
      >
        {acoes}
      </DialogActions>
    </Dialog>
  );
}
