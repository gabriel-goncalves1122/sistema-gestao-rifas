import {
  Box,
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
import { obterLabelStatusPagamento } from "../../../../utils/pixTransacoesStatusUtils";
import { PixAnaliseOcrDetalhesSection } from "./PixAnaliseOcrDetalhesSection";
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
  onClose,
  onAceitar,
  onNegar,
  onReanalisarOcr,
  reanalisandoOcr = false,
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
          {formatarData(transacao.dataPagamento || transacao.dataCriacao)}
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
        <CampoDetalhe label="Valor" valor={formatarMoeda(valor)} />
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
      onConcluido={onClose}
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
